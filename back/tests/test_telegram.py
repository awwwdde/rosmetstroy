import hashlib
import hmac
import time
from datetime import UTC, datetime

import pytest
from httpx import AsyncClient
from sqlalchemy import select

from app.core.config import settings
from app.core.security import hash_token
from app.db.session import SessionLocal
from app.models import Lead, LeadFile, User
from app.services import telegram
from tests.conftest import ADMIN_EMAIL

BOT_TOKEN = "123456:test-token"


def _signed(params: dict[str, str]) -> dict[str, str]:
    check = "\n".join(f"{k}={params[k]}" for k in sorted(params))
    secret = hashlib.sha256(BOT_TOKEN.encode()).digest()
    return {**params, "hash": hmac.new(secret, check.encode(), hashlib.sha256).hexdigest()}


@pytest.fixture
def bot_token(monkeypatch: pytest.MonkeyPatch) -> None:
    monkeypatch.setattr(settings, "telegram_bot_token", BOT_TOKEN)


def test_verify_login(bot_token: None) -> None:
    params = _signed({"id": "42", "first_name": "Иван", "auth_date": str(int(time.time()))})
    assert telegram.verify_login({**params, "to": "/admin/leads/1"}) == 42
    # Повторно та же подпись не принимается
    assert telegram.verify_login(params) is None


def test_verify_login_rejects_forgery_and_stale(bot_token: None) -> None:
    fresh = _signed({"id": "42", "auth_date": str(int(time.time()))})
    assert telegram.verify_login({**fresh, "id": "43"}) is None
    stale = _signed({"id": "42", "auth_date": str(int(time.time()) - 3600)})
    assert telegram.verify_login(stale) is None


def test_lead_message_escapes_and_lists_files() -> None:
    lead = Lead(
        id=7,
        name="<Иван>",
        company="",
        phone="+7 900 000-00-00",
        email="a@b.ru",
        service_label="Ангары",
        description="Нужно <b>ангар</b>",
        source_page="/services/hangars",
        files=[LeadFile(original_name="чертёж.pdf", storage_key="k", mime_type="application/pdf", size=2_500_000)],
    )
    lead.created_at = datetime(2026, 11, 5, 11, 30, tzinfo=UTC)
    text = telegram.lead_message(lead)
    assert "RMS-00007" in text
    assert "&lt;Иван&gt;" in text
    assert "<b>ангар</b>" not in text
    assert "чертёж.pdf — 2,4 МБ" in text
    assert "5 ноября 2026, 14:30" in text


def test_activity_message() -> None:
    a = telegram.Activity(
        action="status",
        entity="lead",
        entity_id="12",
        meta={"old": "new", "new": "in_progress"},
        user_id=1,
        user_name="Пётр",
        user_email="p@x.ru",
    )
    text = telegram.activity_message(a)
    assert "Заявка RMS-00012" in text
    assert "Новая → <b>В работе</b>" in text
    assert "Пётр" in text
    assert telegram._entity_path(a) == "/admin/leads/12"


async def test_other_tab_account_is_rejected(admin: AsyncClient) -> None:
    me = (await admin.get("/api/v1/auth/me")).json()["user"]
    ok = await admin.get("/api/v1/admin/dashboard", headers={"X-Admin-User": str(me["id"])})
    assert ok.status_code == 200
    other = await admin.get("/api/v1/admin/dashboard", headers={"X-Admin-User": str(me["id"] + 1000)})
    assert other.status_code == 409


async def test_profile_update(admin: AsyncClient) -> None:
    response = await admin.patch("/api/v1/auth/profile", json={"full_name": "Новое имя"})
    assert response.status_code == 200
    assert response.json()["full_name"] == "Новое имя"


async def test_link_and_login_via_telegram(
    admin: AsyncClient, bot_token: None, monkeypatch: pytest.MonkeyPatch
) -> None:
    async def fake_username() -> str:
        return "rms_test_bot"

    monkeypatch.setattr(telegram, "bot_username", fake_username)
    status_ = (await admin.get("/api/v1/auth/telegram")).json()
    assert status_["enabled"] is True
    assert status_["linked"] is False

    # Привязка по коду из /start, как это делает бот
    code = "test-link-code"
    async with SessionLocal() as db:
        user = await db.scalar(select(User).where(User.email == ADMIN_EMAIL))
        assert user is not None
        user.telegram_link_hash = hash_token(code)
        user.telegram_link_expires_at = datetime(2100, 1, 1, tzinfo=UTC)
        await db.commit()

    sent: list[str] = []

    async def fake_send(chat_id: int, text: str, panel_path: str | None = "/admin") -> None:
        sent.append(text)

    monkeypatch.setattr(telegram, "send", fake_send)
    await telegram.link_by_code(code, {"id": 5551, "username": "ivan"})
    assert "Telegram привязан" in sent[-1]
    assert (await admin.get("/api/v1/auth/telegram")).json()["linked"] is True

    params = _signed({"id": "5551", "auth_date": str(int(time.time()))})
    response = await admin.get("/api/v1/auth/telegram/login", params={**params, "to": "/admin/leads"})
    assert response.status_code == 303
    assert response.headers["location"] == "/admin/leads"
    assert settings.session_cookie_name in response.headers.get("set-cookie", "")

    # Чужой Telegram — на страницу входа, без сессии
    params = _signed({"id": "999", "auth_date": str(int(time.time()))})
    response = await admin.get("/api/v1/auth/telegram/login", params={**params, "to": "//evil.example"})
    assert response.status_code == 303
    assert response.headers["location"].startswith("/admin/login")

    assert (await admin.delete("/api/v1/auth/telegram")).status_code == 204


def test_duplicate_activities_are_collapsed() -> None:
    from app.core.rate_limit import limiter

    limiter.reset()
    a = telegram.Activity(
        action="update", entity="project", entity_id="3", meta={}, user_id=1, user_name="", user_email="x@y.ru"
    )
    assert telegram._duplicate(a) is False
    assert telegram._duplicate(a) is True
    failed = telegram.Activity(
        action="login_failed",
        entity="user",
        entity_id="",
        meta={"email": "A@b.ru"},
        user_id=None,
        user_name="",
        user_email="",
    )
    assert telegram._duplicate(failed) is False
    assert telegram._duplicate(failed) is True


async def test_incoming_flood_is_ignored(monkeypatch: pytest.MonkeyPatch) -> None:
    from app.core.rate_limit import limiter

    limiter.reset()
    handled: list[str] = []

    async def fake_link(code: str, chat: dict[str, object]) -> None:
        handled.append(code)

    monkeypatch.setattr(telegram, "link_by_code", fake_link)
    for i in range(20):
        update = {"message": {"chat": {"id": 77, "type": "private"}, "text": f"/start code{i}"}}
        await telegram.handle_update(update)
    assert len(handled) == telegram.IN_CHAT_LIMIT
