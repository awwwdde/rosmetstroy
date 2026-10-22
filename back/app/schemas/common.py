from datetime import datetime

from pydantic import BaseModel, ConfigDict, Field


class Schema(BaseModel):
    model_config = ConfigDict(from_attributes=True, json_schema_serialization_defaults_required=True)


class Paginated[T](Schema):
    items: list[T]
    total: int
    page: int
    page_size: int


class KeyValue(Schema):
    k: str = Field(max_length=255)
    v: str = Field(max_length=1000)


class TitleText(Schema):
    title: str = Field(max_length=255)
    description: str = Field(default="", max_length=2000)


class UseItem(TitleText):
    href: str = Field(default="", max_length=500)


class MediaOut(Schema):
    id: int
    url: str
    alt: str
    width: int | None
    height: int | None
    mime_type: str
    original_name: str
    size: int
    kind: str
    created_at: datetime


class MediaUpdate(Schema):
    alt: str = Field(default="", max_length=500)


SLUG_PATTERN = r"^[a-z0-9]+(?:-[a-z0-9]+)*$"
