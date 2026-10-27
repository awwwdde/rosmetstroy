"""Совместимость с платформой деплоя: файлы в PostgreSQL, DATABASE_URL без драйвера."""

from app.core.config import Settings
from app.main import stored_media
from app.services.storage import DatabaseStorage


async def test_database_storage_roundtrip() -> None:
    storage = DatabaseStorage("/media")
    await storage.save("test/a.png", b"public", "image/png", private=False)
    await storage.save("test/a.png", b"secret", "application/pdf", private=True)

    assert await storage.read("test/a.png", private=False) == b"public"
    assert await storage.read("test/a.png", private=True) == b"secret"
    assert storage.public_url("test/a.png") == "/media/test/a.png"

    response = await stored_media("test/a.png")
    assert response.status_code == 200
    assert response.body == b"public"
    assert response.media_type == "image/png"

    await storage.delete("test/a.png", private=False)
    assert (await stored_media("test/a.png")).status_code == 404
    # Приватный файл по публичному адресу не отдаётся
    assert await storage.read("test/a.png", private=True) == b"secret"


def test_platform_env_is_understood(monkeypatch) -> None:  # type: ignore[no-untyped-def]
    monkeypatch.setenv("DATABASE_URL", "postgresql://site:pw@site_db:5432/site")
    monkeypatch.setenv("PUBLIC_SITE_URL", "https://site.example.art")
    monkeypatch.delenv("SITE_URL", raising=False)
    settings = Settings(_env_file=None)  # type: ignore[call-arg]
    assert settings.database_url == "postgresql+asyncpg://site:pw@site_db:5432/site"
    assert settings.site_url == "https://site.example.art"


async def test_indexnow_key_and_paths(client) -> None:  # type: ignore[no-untyped-def]
    from app.services import indexnow

    response = await client.get("/api/v1/indexnow-key")
    assert response.status_code == 200
    assert response.text == indexnow.indexnow_key()
    assert len(response.text) == 32

    paths = await indexnow.paths_for_tags(("services",))
    assert "/services" in paths
    assert any(p.startswith("/services/") for p in paths)
    # Вне production с https поисковики не уведомляются
    assert not indexnow.enabled()


async def test_bootstrap_admin_from_env(monkeypatch) -> None:  # type: ignore[no-untyped-def]
    from sqlalchemy import func, select

    from app.cli import bootstrap
    from app.core.security import verify_password
    from app.db.session import SessionLocal
    from app.models import Role, User

    async def get(email: str) -> User | None:
        async with SessionLocal() as db:
            return await db.scalar(select(User).where(func.lower(User.email) == email))

    # В базе уже есть пользователи (администратор из фикстуры), а в окружении — новый e-mail
    monkeypatch.setenv("ADMIN_EMAIL", "new-admin@example.com")
    monkeypatch.setenv("ADMIN_PASSWORD", "first-password-123")
    monkeypatch.delenv("ADMIN_RESET_PASSWORD", raising=False)
    await bootstrap()
    user = await get("new-admin@example.com")
    assert user is not None
    assert user.role == Role.admin
    assert verify_password("first-password-123", user.password_hash)

    # Повторный деплой с другим паролем не перезаписывает пароль, сменённый в админке
    monkeypatch.setenv("ADMIN_PASSWORD", "second-password-456")
    await bootstrap()
    assert verify_password("first-password-123", (await get("new-admin@example.com")).password_hash)  # type: ignore[union-attr]

    # Явный сброс пароля
    monkeypatch.setenv("ADMIN_RESET_PASSWORD", "true")
    await bootstrap()
    assert verify_password("second-password-456", (await get("new-admin@example.com")).password_hash)  # type: ignore[union-attr]


async def test_expired_leads_are_purged(monkeypatch) -> None:  # type: ignore[no-untyped-def]
    from datetime import UTC, datetime, timedelta

    from sqlalchemy import select

    from app.db.session import SessionLocal
    from app.models import Lead
    from app.services import retention

    async with SessionLocal() as db:
        old = Lead(name="Старая заявка", files=[], created_at=datetime.now(UTC) - timedelta(days=1200))
        fresh = Lead(name="Свежая заявка", files=[])
        db.add_all([old, fresh])
        await db.commit()
        old_id, fresh_id = old.id, fresh.id

    monkeypatch.setattr(retention.settings, "lead_retention_days", 1095)
    assert await retention.purge_expired_leads() >= 1

    async with SessionLocal() as db:
        ids = set(await db.scalars(select(Lead.id).where(Lead.id.in_([old_id, fresh_id]))))
    assert ids == {fresh_id}


def test_telegram_notification_has_no_personal_data() -> None:
    from app.services.notifications import lead_short

    text = lead_short(
        {
            "id": "7",
            "number": "RMS-00007",
            "name": "Иван Петров",
            "phone": "+79001234567",
            "email": "i@ex.ru",
            "company": "ООО Ромашка",
            "service": "Металлоконструкции",
            "files": "2",
            "description": "Лестница",
        }
    )
    for secret in ("Иван", "+79001234567", "i@ex.ru", "Ромашка", "Лестница"):
        assert secret not in text
    assert "RMS-00007" in text
