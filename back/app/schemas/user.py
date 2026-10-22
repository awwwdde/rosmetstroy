from datetime import datetime
from typing import Any, Literal

from pydantic import EmailStr, Field

from app.schemas.common import Schema


class LoginIn(Schema):
    # Без проверки домена: при входе важно только совпадение с учётной записью
    email: str = Field(min_length=3, max_length=255)
    password: str = Field(min_length=1, max_length=256)


class UserOut(Schema):
    id: int
    email: str
    full_name: str
    role: str
    is_active: bool
    last_login_at: datetime | None
    created_at: datetime


class MeOut(Schema):
    user: UserOut
    csrf_token: str


class UserCreate(Schema):
    email: EmailStr
    full_name: str = Field(default="", max_length=255)
    role: Literal["admin", "editor"] = "editor"
    password: str = Field(min_length=10, max_length=256)


class UserUpdate(Schema):
    full_name: str | None = Field(default=None, max_length=255)
    role: Literal["admin", "editor"] | None = None
    is_active: bool | None = None
    password: str | None = Field(default=None, min_length=10, max_length=256)


class PasswordChange(Schema):
    current_password: str = Field(min_length=1, max_length=256)
    new_password: str = Field(min_length=10, max_length=256)


class AuditOut(Schema):
    id: int
    action: str
    entity: str
    entity_id: str
    meta: dict[str, Any]
    ip: str
    created_at: datetime
    user: UserOut | None


class DailyCount(Schema):
    date: str
    count: int


class DraftCounts(Schema):
    services: int
    projects: int
    articles: int
    pages: int


class DashboardOut(Schema):
    leads_new: int
    leads_total: int
    services: int
    projects: int
    articles: int
    recent_leads: list[dict[str, Any]]
    leads_by_status: dict[str, int]
    # Заявки по дням за последние 14 дней (включая сегодня), от старых к новым
    leads_daily: list[DailyCount]
    drafts: DraftCounts
