from datetime import datetime
from typing import Literal

from pydantic import EmailStr, Field, field_validator, model_validator

from app.schemas.common import Schema

LeadStatusLiteral = Literal["new", "in_progress", "quoted", "done", "rejected", "spam"]


class LeadCreate(Schema):
    name: str = Field(min_length=1, max_length=255)
    company: str = Field(default="", max_length=255)
    phone: str = Field(default="", max_length=50)
    email: EmailStr | Literal[""] = ""
    service_id: int | None = None
    service_label: str = Field(default="", max_length=255)
    description: str = Field(default="", max_length=5000)
    source_page: str = Field(default="", max_length=500)

    @field_validator("name", "company", "phone", "description", "service_label", mode="before")
    @classmethod
    def strip(cls, v: object) -> object:
        return v.strip() if isinstance(v, str) else v

    @field_validator("phone")
    @classmethod
    def phone_digits(cls, v: str) -> str:
        if v and not 10 <= sum(ch.isdigit() for ch in v) <= 15:
            raise ValueError("Некорректный номер телефона")
        if v and any(not (ch.isdigit() or ch in "+-() ") for ch in v):
            raise ValueError("Некорректный номер телефона")
        return v

    @model_validator(mode="after")
    def contact_required(self) -> "LeadCreate":
        if not self.phone and not self.email:
            raise ValueError("Укажите телефон или e-mail")
        return self


class LeadCreated(Schema):
    id: int
    number: str


class LeadFileOut(Schema):
    id: int
    original_name: str
    mime_type: str
    size: int


class Author(Schema):
    id: int
    full_name: str
    email: str


class LeadCommentOut(Schema):
    id: int
    body: str
    created_at: datetime
    author: Author | None


class LeadCommentIn(Schema):
    body: str = Field(min_length=1, max_length=5000)


class LeadListItem(Schema):
    id: int
    number: str
    name: str
    company: str
    phone: str
    email: str
    service_label: str
    status: str
    created_at: datetime
    files_count: int = 0


class LeadOut(LeadListItem):
    service_id: int | None
    description: str
    source_page: str
    ip: str
    user_agent: str
    updated_at: datetime
    files: list[LeadFileOut]
    comments: list[LeadCommentOut]


class LeadStatusUpdate(Schema):
    status: LeadStatusLiteral
