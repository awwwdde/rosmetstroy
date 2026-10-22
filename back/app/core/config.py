from functools import lru_cache
from pathlib import Path
from typing import Annotated, Literal

from pydantic import AliasChoices, Field, field_validator
from pydantic_settings import BaseSettings, NoDecode, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", env_file_encoding="utf-8", extra="ignore")

    environment: Literal["development", "production", "test"] = "development"
    debug: bool = False

    # Секрет для подписи токенов форм; в production обязателен
    secret_key: str = "dev-insecure-secret-change-me"  # noqa: S105 — main.py запрещает его в production

    database_url: str = "postgresql+asyncpg://rosmetstroy:rosmetstroy@localhost:5432/rosmetstroy"

    # Публичный адрес сайта — для ссылок в уведомлениях и CORS
    site_url: str = Field("http://localhost:3000", validation_alias=AliasChoices("SITE_URL", "PUBLIC_SITE_URL"))
    cors_origins: Annotated[list[str], NoDecode] = Field(default_factory=lambda: ["http://localhost:3000"])

    # Сессии администраторов
    session_cookie_name: str = "rms_session"
    csrf_cookie_name: str = "rms_csrf"
    session_ttl_hours: int = 12
    cookie_secure: bool = False

    # Хранилище медиа: local | s3 | db (содержимое файлов в PostgreSQL)
    storage_backend: Literal["local", "s3", "db"] = "local"
    media_root: Path = Path("storage/media")
    private_root: Path = Path("storage/private")
    media_url_prefix: str = "/media"
    s3_bucket: str = ""
    s3_endpoint_url: str = ""
    s3_region: str = ""
    s3_access_key: str = ""
    s3_secret_key: str = ""
    s3_public_url: str = ""

    # Лимиты загрузок
    lead_max_files: int = 10
    lead_max_file_mb: int = 25
    media_max_file_mb: int = 15

    # Уведомления
    smtp_host: str = ""
    smtp_port: int = 587
    smtp_user: str = ""
    smtp_password: str = ""
    smtp_from: str = ""
    smtp_starttls: bool = True
    notify_emails: Annotated[list[str], NoDecode] = Field(default_factory=list)
    telegram_bot_token: str = ""
    telegram_chat_id: str = ""

    # Инвалидация кэша Next.js
    frontend_internal_url: str = "http://localhost:3000"
    revalidate_secret: str = ""

    # IndexNow (Яндекс, Bing): уведомлять поисковики об изменённых страницах. Работает только
    # в production с https-адресом сайта; ключ выводится из SECRET_KEY
    indexnow_enabled: bool = True

    # Антиспам: минимальное время заполнения формы, секунды
    lead_min_fill_seconds: int = 3

    @field_validator("database_url")
    @classmethod
    def async_driver(cls, v: str) -> str:
        # Платформы отдают DATABASE_URL в виде postgresql://… — SQLAlchemy async нужен драйвер asyncpg
        for prefix in ("postgresql://", "postgres://"):
            if v.startswith(prefix):
                return "postgresql+asyncpg://" + v.removeprefix(prefix)
        return v

    @field_validator("cors_origins", "notify_emails", mode="before")
    @classmethod
    def split_csv(cls, v: object) -> object:
        if isinstance(v, str):
            return [x.strip() for x in v.split(",") if x.strip()]
        return v

    @property
    def is_production(self) -> bool:
        return self.environment == "production"


@lru_cache
def get_settings() -> Settings:
    return Settings()


settings = get_settings()
