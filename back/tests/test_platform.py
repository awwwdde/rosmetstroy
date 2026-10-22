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
