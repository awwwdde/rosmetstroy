"""Telegram-бот админ-панели.

Бот работает внутри процесса backend через long polling (getUpdates): входящего webhook-адреса
нет, снаружи к боту обратиться нельзя — backend сам ходит в api.telegram.org.

* Привязка: в «Настройках учётной записи» выдаётся одноразовая ссылка t.me/<бот>?start=<код>,
  пользователь нажимает «Старт» — чат привязывается к его учётной записи (у каждой своя).
* Уведомления: о новых заявках и о действиях в панели (всё, что пишется в журнал действий).
* «Войти в панель»: кнопка Telegram Login (login_url) — Telegram подписывает данные пользователя
  токеном бота, backend проверяет подпись и открывает сессию той учётной записи, к которой
  привязан этот Telegram. Пересланное сообщение чужому человеку вход не даст.
"""

import asyncio
import contextlib
import hashlib
import hmac
import html
import logging
import time
from collections.abc import Iterable
from dataclasses import dataclass, field
from datetime import UTC, datetime, timedelta, timezone, tzinfo
from typing import Any
from urllib.parse import quote, urlencode
from zoneinfo import ZoneInfo, ZoneInfoNotFoundError

import httpx
from sqlalchemy import event, select
from sqlalchemy.orm import Session

from app.core.config import settings
from app.core.rate_limit import limiter
from app.core.security import hash_token
from app.db.session import SessionLocal
from app.models import AuditLog, Lead, Role, User

log = logging.getLogger(__name__)
# httpx пишет в лог INFO каждый запрос с полным адресом, а в адресе Bot API — токен бота
for _name in ("httpx", "httpcore"):
    logging.getLogger(_name).setLevel(logging.WARNING)

API = "https://api.telegram.org"
LINK_TTL = timedelta(minutes=15)
LOGIN_MAX_AGE = 300  # секунд: подпись Telegram Login свежая — нажатие кнопки только что
POLL_TIMEOUT = 50

# Действия журнала, о которых не уведомляем: служебные и слишком частые
SILENT_ACTIONS = {"login", "logout", "download", "profile", "avatar", "telegram_link", "telegram_unlink"}
# Уведомления только администраторам
ADMIN_ONLY_ENTITIES = {"user"}
ADMIN_ONLY_ACTIONS = {"login_failed", "password_change"}

ACTIONS: dict[str, tuple[str, str]] = {
    "create": ("🟢", "Создание"),
    "update": ("✏️", "Изменение"),
    "delete": ("🗑", "Удаление"),
    "upload": ("📤", "Загрузка файла"),
    "status": ("🔄", "Смена статуса"),
    "comment": ("💬", "Комментарий"),
    "password_change": ("🔑", "Смена пароля"),
    "login_failed": ("⚠️", "Неудачный вход"),
}

ENTITIES = {
    "article": "Статья",
    "project": "Проект",
    "service": "Услуга",
    "page": "Страница",
    "category": "Категория",
    "faq": "Вопрос FAQ",
    "media": "Медиафайл",
    "settings": "Настройки сайта",
    "user": "Пользователь",
    "lead": "Заявка",
    "lead_comment": "Комментарий к заявке",
    "lead_file": "Файл заявки",
}

LEAD_STATUSES = {
    "new": "Новая",
    "in_progress": "В работе",
    "quoted": "КП отправлено",
    "done": "Завершена",
    "rejected": "Отклонена",
    "spam": "Спам",
}

MONTHS = (
    "января", "февраля", "марта", "апреля", "мая", "июня",
    "июля", "августа", "сентября", "октября", "ноября", "декабря",
)  # fmt: skip


def enabled() -> bool:
    return bool(settings.telegram_bot_token)


# ---------- Bot API ----------


class TelegramError(Exception):
    def __init__(self, code: int, description: str) -> None:
        super().__init__(f"{code}: {description}")
        self.code = code
        self.description = description


_client: httpx.AsyncClient | None = None


def _http() -> httpx.AsyncClient:
    global _client
    if _client is None or _client.is_closed:
        _client = httpx.AsyncClient(timeout=httpx.Timeout(15, read=POLL_TIMEOUT + 15))
    return _client


async def call(method: str, **params: Any) -> Any:
    try:
        resp = await _http().post(f"{API}/bot{settings.telegram_bot_token}/{method}", json=params)
        data = resp.json() if resp.headers.get("content-type", "").startswith("application/json") else {}
    except (httpx.HTTPError, ValueError) as exc:
        # Исключения httpx содержат адрес запроса (с токеном) — наружу и в логи уходит только тип ошибки
        raise TelegramError(0, f"сеть: {type(exc).__name__}") from None
    if not data.get("ok"):
        raise TelegramError(data.get("error_code", resp.status_code), str(data.get("description", ""))[:200])
    return data["result"]


_bot_username: str = settings.telegram_bot_username.lstrip("@")


async def bot_username() -> str:
    global _bot_username
    if not _bot_username:
        me = await call("getMe")
        _bot_username = me["username"]
    return _bot_username


# ---------- Оформление ----------


def _tz() -> tzinfo:
    try:
        return ZoneInfo(settings.telegram_timezone)
    except (ZoneInfoNotFoundError, ValueError):
        return timezone(timedelta(hours=3), "MSK")


def fmt_date(value: datetime | None = None) -> str:
    local = (value or datetime.now(UTC)).astimezone(_tz())
    return f"{local.day} {MONTHS[local.month - 1]} {local.year}, {local:%H:%M}"


def esc(value: object) -> str:
    return html.escape(str(value), quote=False)


def fmt_size(size: int) -> str:
    if size < 1024:
        return f"{size} Б"
    if size < 1048576:
        return f"{size / 1024:.0f} КБ"
    return f"{size / 1048576:.1f} МБ".replace(".", ",")


def _site() -> str:
    return settings.site_url.rstrip("/")


SIGNATURE = "<i>Росметстрой · панель управления</i>"


# Telegram Login работает только с https-доменом, указанным у бота в @BotFather (/setdomain).
# Если домен не настроен, Telegram отвечает BOT_DOMAIN_INVALID — тогда даём обычную ссылку.
_login_url_disabled_until = 0.0


def _panel_button(path: str, label: str = "Войти в панель") -> dict[str, Any]:
    if _site().startswith("https://") and time.monotonic() >= _login_url_disabled_until:
        login = f"{_site()}/api/v1/auth/telegram/login?{urlencode({'to': path})}"
        return {"text": label, "login_url": {"url": login, "request_write_access": False}}
    return {"text": label, "url": f"{_site()}{path}"}


def _keyboard(path: str) -> dict[str, Any]:
    return {"inline_keyboard": [[_panel_button(path)]]}


async def send(chat_id: int, text_: str, panel_path: str | None = "/admin") -> None:
    global _login_url_disabled_until
    params: dict[str, Any] = {
        "chat_id": chat_id,
        "text": text_,
        "parse_mode": "HTML",
        "link_preview_options": {"is_disabled": True},
    }
    if panel_path:
        params["reply_markup"] = _keyboard(panel_path)
    try:
        await call("sendMessage", **params)
    except TelegramError as exc:
        if panel_path and "BOT_DOMAIN_INVALID" in exc.description:
            log.warning("Домен сайта не указан у бота (@BotFather → /setdomain): кнопка входа без авторизации")
            _login_url_disabled_until = time.monotonic() + 3600
            params["reply_markup"] = _keyboard(panel_path)
            await call("sendMessage", **params)
            return
        raise


async def _unlink_chat(telegram_id: int) -> None:
    async with SessionLocal() as db:
        user = await db.scalar(select(User).where(User.telegram_id == telegram_id))
        if user is not None:
            user.telegram_id = None
            user.telegram_username = ""
            user.telegram_linked_at = None
            await db.commit()


# Антиспам исходящих: на один чат не больше OUT_LIMIT сообщений в минуту. Лишние не отправляются,
# вместо них одно предупреждение раз в минуту — подробности в журнале действий/списке заявок
OUT_LIMIT = 20
OUT_WINDOW = 60.0


async def _throttled(chat_id: int) -> bool:
    if limiter.hit(f"tg-out:{chat_id}", OUT_LIMIT, OUT_WINDOW):
        return False
    if limiter.hit(f"tg-out-warn:{chat_id}", 1, OUT_WINDOW):
        with contextlib.suppress(Exception):
            await send(
                chat_id,
                "⏸ <b>Слишком много событий</b>\n\nЧасть уведомлений за последнюю минуту пропущена — "
                "посмотрите журнал действий и список заявок в панели.",
                "/admin/audit",
            )
    return True


async def broadcast(recipients: Iterable[int], text_: str, panel_path: str | None) -> None:
    for chat_id in recipients:
        if await _throttled(chat_id):
            continue
        try:
            await send(chat_id, text_, panel_path)
        except TelegramError as exc:
            # Пользователь заблокировал бота или удалил чат — привязка больше не работает
            if exc.code == 403:
                await _unlink_chat(chat_id)
            else:
                log.warning("Telegram: не удалось отправить сообщение %s: %s", chat_id, exc)
        except Exception:
            log.exception("Telegram: ошибка отправки в чат %s", chat_id)
        await asyncio.sleep(0.05)  # лимит Telegram — около 30 сообщений в секунду


async def _recipients(*, admins_only: bool = False, exclude_user_id: int | None = None) -> list[int]:
    query = select(User.telegram_id).where(User.telegram_id.is_not(None), User.is_active.is_(True))
    if admins_only:
        query = query.where(User.role == Role.admin)
    if exclude_user_id is not None:
        query = query.where(User.id != exclude_user_id)
    async with SessionLocal() as db:
        return [x for x in await db.scalars(query) if x is not None]


# ---------- Заявки ----------


def lead_message(lead: Lead) -> str:
    rows = [f"📥 <b>Новая заявка {esc(lead.number)}</b>", f"{fmt_date(lead.created_at)}", ""]
    if settings.telegram_lead_details:
        rows += [f"👤 <b>{esc(lead.name)}</b>"]
        if lead.company:
            rows.append(f"🏢 {esc(lead.company)}")
        if lead.phone:
            rows.append(f"📞 <code>{esc(lead.phone)}</code>")
        if lead.email:
            rows.append(f"✉️ {esc(lead.email)}")
    rows.append(f"🛠 Направление: <b>{esc(lead.service_label or 'не выбрано')}</b>")

    if settings.telegram_lead_details:
        description = (lead.description or "").strip()
        rows += ["", "<b>Описание задачи</b>"]
        if description:
            if len(description) > 2500:
                description = description[:2500].rstrip() + "…"
            rows.append(f"<blockquote expandable>{esc(description)}</blockquote>")
        else:
            rows.append("<i>не указано</i>")

    if lead.files:
        rows += ["", f"📎 <b>Файлы · {len(lead.files)}</b>"]
        if settings.telegram_lead_details:
            rows += [f"• {esc(f.original_name)} — {fmt_size(f.size)}" for f in lead.files[:15]]
    else:
        rows += ["", "📎 Файлов нет"]

    if lead.source_page:
        rows += ["", f"Страница: {esc(lead.source_page)}"]
    rows += ["", SIGNATURE]
    return "\n".join(rows)


async def notify_lead(lead_id: int) -> None:
    if not enabled():
        return
    async with SessionLocal() as db:
        lead = await db.get(Lead, lead_id)
        if lead is None:
            return
        message = lead_message(lead)
    await broadcast(await _recipients(), message, f"/admin/leads/{lead_id}")


# ---------- Действия в панели ----------


@dataclass
class Activity:
    action: str
    entity: str
    entity_id: str
    meta: dict[str, Any]
    user_id: int | None
    user_name: str
    user_email: str
    at: datetime = field(default_factory=lambda: datetime.now(UTC))


def _entity_path(a: Activity) -> str:
    entity_id = quote(a.entity_id, safe="")
    match a.entity:
        case "article" | "project" | "service" | "lead" if a.action != "delete":
            return f"/admin/{a.entity}s/{entity_id}"
        case "page" if a.action != "delete":
            return f"/admin/pages/{entity_id}"
        case "lead_comment" | "lead_file" if a.meta.get("lead"):
            return f"/admin/leads/{a.meta['lead']}"
        case "article" | "project" | "service" | "lead" | "page":
            return f"/admin/{a.entity}s"
        case "category":
            return "/admin/categories"
        case "faq" | "media" | "settings":
            return f"/admin/{a.entity}"
        case "user":
            return "/admin/users"
        case _:
            return "/admin/audit"


def activity_message(a: Activity) -> str:
    icon, verb = ACTIONS.get(a.action, ("•", a.action))
    entity = ENTITIES.get(a.entity, a.entity)
    if a.entity == "lead" and a.entity_id.isdigit():
        entity = f"Заявка RMS-{int(a.entity_id):05d}"
    elif a.entity == "lead_comment" and str(a.meta.get("lead", "")).isdigit():
        entity = f"Комментарий к заявке RMS-{int(a.meta['lead']):05d}"

    rows = [f"{icon} <b>{esc(verb)}</b>" + (f" · {esc(entity)}" if a.action != "login_failed" else "")]
    title = a.meta.get("title") or a.meta.get("name")
    if a.action == "status":
        old, new = (
            LEAD_STATUSES.get(a.meta.get("old", ""), a.meta.get("old")),
            LEAD_STATUSES.get(a.meta.get("new", ""), a.meta.get("new")),
        )
        rows.append(f"{esc(old)} → <b>{esc(new)}</b>")
    elif title:
        rows.append(f"«{esc(title)}»")
    elif a.entity == "settings":
        rows.append(f"Раздел: {esc(a.entity_id)}")
    if a.entity == "user" and a.meta.get("email"):
        rows.append(f"Учётная запись: {esc(a.meta['email'])}")

    rows.append("")
    if a.action == "login_failed":
        rows.append(f"Логин: {esc(a.meta.get('email', '—'))}")
    else:
        who = esc(a.user_name or a.user_email)
        rows.append(f"👤 {who}" + (f" · {esc(a.user_email)}" if a.user_name else ""))
    rows += [f"🕒 {fmt_date(a.at)}", "", SIGNATURE]
    return "\n".join(rows)


# Одинаковые действия подряд (несколько сохранений одной записи) — одно уведомление в минуту.
# Неудачные входы по одному логину — одно уведомление в 10 минут
DEDUP_WINDOW = 60.0
LOGIN_FAILED_WINDOW = 600.0


def _duplicate(a: Activity) -> bool:
    if a.action == "login_failed":
        key = f"tg-dedup:login_failed:{str(a.meta.get('email', '')).lower()}"
        return not limiter.hit(key, 1, LOGIN_FAILED_WINDOW)
    return not limiter.hit(f"tg-dedup:{a.user_id}:{a.action}:{a.entity}:{a.entity_id}", 1, DEDUP_WINDOW)


async def notify_activities(items: list[Activity]) -> None:
    for a in items:
        if _duplicate(a):
            continue
        try:
            admins_only = a.entity in ADMIN_ONLY_ENTITIES or a.action in ADMIN_ONLY_ACTIONS
            # Автор действия о своём действии не уведомляется — только остальные учётные записи
            recipients = await _recipients(admins_only=admins_only, exclude_user_id=a.user_id)
            await broadcast(recipients, activity_message(a), _entity_path(a))
        except Exception:
            log.exception("Telegram: не удалось отправить уведомление о действии %s", a.action)


_PENDING = "telegram_activities"
_tasks: set[asyncio.Task[None]] = set()


def queue_activity(
    db_session: Any, user: User | None, action: str, entity: str, entity_id: Any, meta: dict[str, Any]
) -> None:
    """Запоминает действие в сессии БД; отправка — только после успешного commit."""
    if not enabled() or action in SILENT_ACTIONS:
        return
    sync = getattr(db_session, "sync_session", db_session)
    sync.info.setdefault(_PENDING, []).append(
        Activity(
            action=action,
            entity=entity,
            entity_id=str(entity_id),
            meta=dict(meta),
            user_id=user.id if user else None,
            user_name=user.full_name if user else "",
            user_email=user.email if user else "",
        )
    )


@event.listens_for(Session, "after_commit")
def _after_commit(session: Session) -> None:
    items = session.info.pop(_PENDING, None)
    if not items:
        return
    try:
        loop = asyncio.get_running_loop()
    except RuntimeError:
        return
    task = loop.create_task(notify_activities(items))
    _tasks.add(task)
    task.add_done_callback(_tasks.discard)


@event.listens_for(Session, "after_rollback")
def _after_rollback(session: Session) -> None:
    session.info.pop(_PENDING, None)


# ---------- Привязка ----------


async def link_by_code(code: str, chat: dict[str, Any]) -> None:
    chat_id = int(chat["id"])
    username = str(chat.get("username") or "")[:64]
    async with SessionLocal() as db:
        user = await db.scalar(
            select(User).where(User.telegram_link_hash == hash_token(code), User.telegram_link_hash != "")
        )
        if (
            user is None
            or not user.is_active
            or not user.telegram_link_expires_at
            or (user.telegram_link_expires_at < datetime.now(UTC))
        ):
            await send(
                chat_id,
                "⛔️ <b>Ссылка недействительна или устарела</b>\n\n"
                "Откройте панель → «Настройки учётной записи» → «Привязать Telegram» и нажмите кнопку ещё раз.",
                None,
            )
            return
        # Один Telegram — одна учётная запись: старая привязка этого чата снимается
        previous = await db.scalar(select(User).where(User.telegram_id == chat_id, User.id != user.id))
        if previous is not None:
            previous.telegram_id = None
            previous.telegram_username = ""
            previous.telegram_linked_at = None
            await db.flush()
        replaced_chat = user.telegram_id if user.telegram_id != chat_id else None
        user.telegram_id = chat_id
        user.telegram_username = username
        user.telegram_linked_at = datetime.now(UTC)
        user.telegram_link_hash = ""
        user.telegram_link_expires_at = None
        # Привязка даёт вход в панель без пароля — фиксируем её в журнале действий
        db.add(
            AuditLog(
                user_id=user.id,
                action="telegram_linked",
                entity="user",
                entity_id=str(user.id),
                meta={"telegram_id": chat_id, "username": username},
                ip="telegram",
            )
        )
        await db.commit()
        name, email = user.full_name or user.email, user.email
        moved = previous.email if previous is not None else None

    rows = [
        "✅ <b>Telegram привязан</b>",
        "",
        f"Учётная запись: <b>{esc(name)}</b> · {esc(email)}",
    ]
    if moved:
        rows.append(f"<i>Привязка к {esc(moved)} снята — один Telegram работает с одной учётной записью.</i>")
    rows += [
        "",
        "Сюда будут приходить новые заявки и действия других пользователей в панели.",
        "Кнопка «Войти в панель» под сообщением открывает панель под этой учётной записью.",
        "",
        "/stop — отвязать Telegram",
        "",
        SIGNATURE,
    ]
    await send(chat_id, "\n".join(rows))
    # Прежний Telegram этой учётной записи узнаёт о перепривязке — если это сделал не владелец, он заметит
    if replaced_chat:
        with contextlib.suppress(Exception):
            await send(
                replaced_chat,
                f"⚠️ <b>Учётная запись {esc(email)} привязана к другому Telegram</b>\n\n"
                "Сюда уведомления больше не придут. Если это были не вы — смените пароль в панели "
                "и привяжите Telegram заново.",
                "/admin/account",
            )


# Антиспам входящих: боту может написать кто угодно. С одного чата — не больше 5 сообщений в минуту,
# всего — не больше 60 ответов в минуту; остальное молча игнорируется
IN_CHAT_LIMIT = 5
IN_TOTAL_LIMIT = 60


async def handle_update(update: dict[str, Any]) -> None:
    message = update.get("message")
    if not message or message.get("chat", {}).get("type") != "private":
        return
    chat = message["chat"]
    if not isinstance(chat.get("id"), int):
        return
    if not limiter.hit(f"tg-in:{chat['id']}", IN_CHAT_LIMIT, 60) or not limiter.hit("tg-in:all", IN_TOTAL_LIMIT, 60):
        return
    text_ = (message.get("text") or "").strip()
    command, _, arg = text_.partition(" ")
    command = command.split("@", 1)[0].lower()

    if command == "/start" and arg.strip():
        await link_by_code(arg.strip()[:64], chat)
        return

    async with SessionLocal() as db:
        user = await db.scalar(select(User).where(User.telegram_id == int(chat["id"])))
        linked = user.full_name or user.email if user else None

    if command == "/stop":
        if linked:
            await _unlink_chat(int(chat["id"]))
            await send(int(chat["id"]), f"Telegram отвязан от учётной записи <b>{esc(linked)}</b>.", None)
        else:
            await send(int(chat["id"]), "Этот Telegram ни к чему не привязан.", None)
        return

    if linked:
        await send(
            int(chat["id"]),
            f"Telegram привязан к учётной записи <b>{esc(linked)}</b>.\n\n/stop — отвязать\n\n{SIGNATURE}",
        )
    else:
        await send(
            int(chat["id"]),
            "👋 Это бот панели управления «Росметстрой».\n\n"
            "Чтобы получать уведомления, войдите в панель → «Настройки учётной записи» → "
            "«Привязать Telegram».",
            None,
        )


# Состояние опроса — для карточки Telegram в настройках учётной записи
_state: dict[str, Any] = {"last_ok": 0.0, "error": ""}


def bot_health() -> tuple[bool, str]:
    """(бот получает сообщения, последняя ошибка). Опрос отвечает не реже раза в POLL_TIMEOUT секунд."""
    online = time.monotonic() - float(_state["last_ok"]) < POLL_TIMEOUT + 30
    return online, str(_state["error"])


def _explain(exc: TelegramError) -> str:
    if exc.code == 409:
        return "Этого бота уже опрашивает другой процесс с тем же токеном (например, локальный backend)"
    if exc.code == 401:
        return "Telegram не принял токен: проверьте TELEGRAM_BOT_TOKEN"
    if exc.code == 0:
        return f"Нет связи с api.telegram.org ({exc.description})"
    return str(exc)


async def _poll_forever() -> None:
    # Если когда-то был задан webhook, getUpdates с ним не работает
    await call("deleteWebhook", drop_pending_updates=False)
    await bot_username()
    _state.update(last_ok=time.monotonic(), error="")
    log.info("Telegram-бот @%s запущен (long polling)", _bot_username)
    offset = 0
    while True:
        try:
            updates = await call("getUpdates", offset=offset, timeout=POLL_TIMEOUT, allowed_updates=["message"])
        except TelegramError as exc:
            _state["error"] = _explain(exc)
            log.warning("Telegram: getUpdates — %s", _state["error"])
            await asyncio.sleep(5)
            continue
        _state.update(last_ok=time.monotonic(), error="")
        for update in updates:
            offset = max(offset, int(update["update_id"]) + 1)
            try:
                await handle_update(update)
            except Exception:
                log.exception("Telegram: ошибка обработки сообщения")


async def bot_loop() -> None:
    """Опрос Telegram. Блокировки не нужны: два процесса с одним токеном Telegram сам не пускает
    (ошибка 409) — это видно в состоянии бота и в логах."""
    while True:
        try:
            await _poll_forever()
        except asyncio.CancelledError:
            raise
        except TelegramError as exc:
            _state["error"] = _explain(exc)
            log.warning("Telegram-бот не запустился: %s. Повтор через 15 с", _state["error"])
        except Exception as exc:
            _state["error"] = f"Внутренняя ошибка: {type(exc).__name__}"
            log.exception("Telegram-бот остановился, перезапуск через 15 с")
        await asyncio.sleep(15)


# ---------- Вход по кнопке «Войти в панель» ----------

LOGIN_FIELDS = {"id", "first_name", "last_name", "username", "photo_url", "auth_date"}
_used_login_hashes: dict[str, float] = {}


def verify_login(params: dict[str, str]) -> int | None:
    """Проверка данных Telegram Login (https://core.telegram.org/widgets/login#checking-authorization).
    Возвращает Telegram id или None."""
    received = params.get("hash", "")
    fields = {k: v for k, v in params.items() if k in LOGIN_FIELDS}
    if not (enabled() and received and fields.get("id", "").isdigit() and fields.get("auth_date", "").isdigit()):
        return None
    check = "\n".join(f"{k}={fields[k]}" for k in sorted(fields))
    secret = hashlib.sha256(settings.telegram_bot_token.encode()).digest()
    expected = hmac.new(secret, check.encode(), hashlib.sha256).hexdigest()
    if not hmac.compare_digest(expected, received):
        return None
    if abs(time.time() - int(fields["auth_date"])) > LOGIN_MAX_AGE:
        return None
    # Одна подписанная ссылка — один вход
    now = time.monotonic()
    for key, expires in list(_used_login_hashes.items()):
        if expires < now:
            del _used_login_hashes[key]
    if received in _used_login_hashes:
        return None
    _used_login_hashes[received] = now + LOGIN_MAX_AGE * 2
    return int(fields["id"])
