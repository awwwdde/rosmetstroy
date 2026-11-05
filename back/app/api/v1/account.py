"""Настройки своей учётной записи: имя, аватар, привязка Telegram и вход по кнопке из бота.

Всё здесь относится только к текущему пользователю: у каждой учётной записи свой профиль и свой чат.
"""

import io
import logging
import re
from datetime import UTC, datetime
from typing import Annotated
from urllib.parse import quote

from fastapi import APIRouter, Depends, File, HTTPException, Request, UploadFile, status
from fastapi.responses import RedirectResponse
from PIL import Image, ImageOps
from sqlalchemy import select

from app.api.deps import DB, CurrentUser, audit
from app.api.v1.auth import open_session
from app.core.rate_limit import rate_limit
from app.core.security import hash_token, new_token
from app.models import User
from app.schemas.user import ProfileUpdate, TelegramLink, TelegramStatus, UserOut
from app.services import telegram
from app.services.files import FileRejected, inspect_image
from app.services.storage import get_storage, make_key

log = logging.getLogger(__name__)

router = APIRouter(prefix="/auth", tags=["account"])

AVATAR_MAX_BYTES = 5 * 1048576
AVATAR_SIZE = 256


@router.patch("/profile", response_model=UserOut)
async def update_profile(data: ProfileUpdate, request: Request, user: CurrentUser, db: DB) -> UserOut:
    user.full_name = data.full_name.strip()
    await audit(db, request, user, "profile", "user", user.id)
    await db.commit()
    await db.refresh(user)
    return UserOut.model_validate(user)


def _square_webp(data: bytes) -> bytes:
    with Image.open(io.BytesIO(data)) as img:
        img = ImageOps.exif_transpose(img)
        img = ImageOps.fit(img.convert("RGB"), (AVATAR_SIZE, AVATAR_SIZE), Image.Resampling.LANCZOS)
        out = io.BytesIO()
        img.save(out, "WEBP", quality=86, method=6)
        return out.getvalue()


@router.post("/avatar", response_model=UserOut, dependencies=[Depends(rate_limit("avatar", 20, 600))])
async def upload_avatar(request: Request, user: CurrentUser, db: DB, file: Annotated[UploadFile, File()]) -> UserOut:
    data = await file.read(AVATAR_MAX_BYTES + 1)
    if len(data) > AVATAR_MAX_BYTES:
        raise HTTPException(status.HTTP_413_CONTENT_TOO_LARGE, "Изображение больше 5 МБ")
    try:
        inspect_image(data)
    except FileRejected as exc:
        raise HTTPException(status.HTTP_422_UNPROCESSABLE_CONTENT, str(exc)) from exc
    webp = _square_webp(data)

    storage = get_storage()
    key = make_key("avatars", ".webp")
    await storage.save(key, webp, "image/webp", private=False)
    old_key = user.avatar_key
    user.avatar_key, user.avatar_url = key, storage.public_url(key)
    await audit(db, request, user, "avatar", "user", user.id)
    await db.commit()
    if old_key:
        await storage.delete(old_key, private=False)
    await db.refresh(user)
    return UserOut.model_validate(user)


@router.delete("/avatar", response_model=UserOut)
async def delete_avatar(request: Request, user: CurrentUser, db: DB) -> UserOut:
    old_key = user.avatar_key
    user.avatar_key = user.avatar_url = ""
    await audit(db, request, user, "avatar", "user", user.id, removed=True)
    await db.commit()
    if old_key:
        await get_storage().delete(old_key, private=False)
    await db.refresh(user)
    return UserOut.model_validate(user)


# ---------- Telegram ----------


async def _username_or_empty() -> str:
    if not telegram.enabled():
        return ""
    try:
        return await telegram.bot_username()
    except Exception:
        return ""


@router.get("/telegram", response_model=TelegramStatus)
async def telegram_status(user: CurrentUser) -> TelegramStatus:
    online, error = telegram.bot_health()
    return TelegramStatus(
        enabled=telegram.enabled(),
        bot_username=await _username_or_empty(),
        bot_online=telegram.enabled() and online,
        bot_error=error if user.role == "admin" else "",
        linked=user.telegram_linked,
        username=user.telegram_username,
        linked_at=user.telegram_linked_at,
    )


@router.post("/telegram/link", response_model=TelegramLink, dependencies=[Depends(rate_limit("tg-link", 10, 600))])
async def telegram_link(request: Request, user: CurrentUser, db: DB) -> TelegramLink:
    if not telegram.enabled():
        raise HTTPException(status.HTTP_503_SERVICE_UNAVAILABLE, "Telegram-бот не настроен на сервере")
    username = await _username_or_empty()
    if not username:
        raise HTTPException(status.HTTP_503_SERVICE_UNAVAILABLE, "Telegram недоступен, попробуйте позже")
    # Код живёт 15 минут и действует один раз; в базе — только его хеш
    code = new_token()[:32]
    expires = datetime.now(UTC) + telegram.LINK_TTL
    user.telegram_link_hash = hash_token(code)
    user.telegram_link_expires_at = expires
    await audit(db, request, user, "telegram_link", "user", user.id)
    await db.commit()
    return TelegramLink(url=f"https://t.me/{username}?start={code}", expires_at=expires)


@router.delete("/telegram", status_code=status.HTTP_204_NO_CONTENT)
async def telegram_unlink(request: Request, user: CurrentUser, db: DB) -> None:
    chat_id = user.telegram_id
    user.telegram_id = None
    user.telegram_username = ""
    user.telegram_linked_at = None
    user.telegram_link_hash = ""
    user.telegram_link_expires_at = None
    await audit(db, request, user, "telegram_unlink", "user", user.id)
    await db.commit()
    if chat_id and telegram.enabled():
        try:
            await telegram.send(chat_id, "Telegram отвязан от учётной записи в панели. Уведомлений не будет.", None)
        except Exception:
            log.warning("Telegram: не удалось сообщить об отвязке")


@router.post(
    "/telegram/test", status_code=status.HTTP_204_NO_CONTENT, dependencies=[Depends(rate_limit("tg-test", 5, 300))]
)
async def telegram_test(user: CurrentUser) -> None:
    if not (telegram.enabled() and user.telegram_id):
        raise HTTPException(status.HTTP_409_CONFLICT, "Telegram не привязан")
    try:
        await telegram.send(
            user.telegram_id,
            "🔔 <b>Тестовое уведомление</b>\n\n"
            f"Учётная запись: <b>{telegram.esc(user.full_name or user.email)}</b> · {telegram.esc(user.email)}\n"
            f"🕒 {telegram.fmt_date()}\n\n{telegram.SIGNATURE}",
        )
    except telegram.TelegramError as exc:
        detail = "Telegram не принял сообщение. Нажмите «Старт» в боте."
        raise HTTPException(status.HTTP_502_BAD_GATEWAY, detail) from exc


_TARGET = re.compile(r"/admin(/[A-Za-z0-9_\-/]*)?")


def _safe_target(to: str | None) -> str:
    # Только страницы панели этого сайта: без открытого редиректа и переводов строк в Location
    return to if to and _TARGET.fullmatch(to) and "//" not in to else "/admin"


@router.get("/telegram/login", include_in_schema=False, dependencies=[Depends(rate_limit("tg-login", 20, 600))])
async def telegram_login(request: Request, db: DB) -> RedirectResponse:
    """Кнопка «Войти в панель» (Telegram login_url): Telegram добавляет к адресу подписанные данные."""
    params = dict(request.query_params)
    target = _safe_target(params.get("to"))
    telegram_id = telegram.verify_login(params)
    user = None
    if telegram_id is not None:
        user = await db.scalar(select(User).where(User.telegram_id == telegram_id, User.is_active.is_(True)))
    if user is None:
        return RedirectResponse(f"/admin/login?next={quote(target)}&telegram=failed", status.HTTP_303_SEE_OTHER)

    response = RedirectResponse(target, status.HTTP_303_SEE_OTHER)
    await open_session(db, request, response, user)
    await audit(db, request, user, "login", "user", user.id, method="telegram")
    await db.commit()
    response.headers["Cache-Control"] = "no-store"
    return response
