from datetime import datetime
from typing import Any, Literal

from pydantic import Field

from app.schemas.common import SLUG_PATTERN, KeyValue, MediaOut, Schema, TitleText, UseItem

Locale = Literal["ru", "en"]


class SeoFields(Schema):
    seo_title: str = Field(default="", max_length=255)
    seo_description: str = Field(default="", max_length=500)


# ---------- Страницы ----------


class PageBase(SeoFields):
    title: str = Field(min_length=1, max_length=255)
    og_image_url: str = Field(default="", max_length=1024)
    is_published: bool = True
    sections: dict[str, Any] = Field(default_factory=dict)
    body_html: str = ""


class PageUpdate(PageBase):
    pass


class PageOut(PageBase):
    id: int
    slug: str
    locale: str
    template: str
    updated_at: datetime


class PageCreate(Schema):
    slug: str = Field(pattern=SLUG_PATTERN, max_length=100)
    title: str = Field(min_length=1, max_length=255)
    locale: Locale = "ru"


class PageListItem(Schema):
    id: int
    slug: str
    locale: str
    template: str
    title: str
    is_published: bool
    updated_at: datetime


# ---------- Категории ----------


class CategoryIn(Schema):
    kind: Literal["project"] = "project"
    slug: str = Field(pattern=SLUG_PATTERN, max_length=100)
    locale: Locale = "ru"
    title: str = Field(min_length=1, max_length=255)
    label: str = Field(default="", max_length=100)
    sort_order: int = 0


class CategoryOut(CategoryIn):
    id: int


# ---------- FAQ ----------


class FaqIn(Schema):
    locale: Locale = "ru"
    question: str = Field(min_length=1, max_length=500)
    answer: str = Field(min_length=1, max_length=5000)
    sort_order: int = 0
    is_published: bool = True
    service_id: int | None = None


class FaqOut(FaqIn):
    id: int


class FaqPublic(Schema):
    id: int
    question: str
    answer: str
    service_id: int | None


# ---------- Услуги ----------


class ServiceBase(SeoFields):
    slug: str = Field(pattern=SLUG_PATTERN, max_length=150)
    locale: Locale = "ru"
    title: str = Field(min_length=1, max_length=255)
    menu_title: str = Field(default="", max_length=255)
    menu_group: str = Field(default="", max_length=100)
    subtitle: str = Field(default="", max_length=500)
    summary: str = Field(default="", max_length=3000)
    description: str = Field(default="", max_length=10000)
    tasks: list[TitleText] = Field(default_factory=list, max_length=20)
    scope: list[TitleText] = Field(default_factory=list, max_length=30)
    limitations: list[TitleText] = Field(default_factory=list, max_length=20)
    execution_note: str = Field(default="", max_length=3000)
    hero_badges: list[KeyValue] = Field(default_factory=list, max_length=6)
    uses_title: str = Field(default="", max_length=255)
    uses_text: str = Field(default="", max_length=2000)
    uses: list[UseItem] = Field(default_factory=list, max_length=24)
    specs: list[KeyValue] = Field(default_factory=list, max_length=40)
    stages: list[TitleText] = Field(default_factory=list, max_length=12)
    cta_title: str = Field(default="", max_length=500)
    cta_text: str = Field(default="", max_length=2000)
    is_partner: bool = False
    show_in_menu: bool = True
    sort_order: int = 0
    is_published: bool = True


class ServiceIn(ServiceBase):
    cover_id: int | None = None
    tech_image_id: int | None = None
    project_ids: list[int] = Field(default_factory=list)


class ServiceCard(Schema):
    id: int
    slug: str
    title: str
    menu_title: str
    menu_group: str
    subtitle: str
    summary: str
    is_partner: bool
    show_in_menu: bool
    sort_order: int
    is_published: bool
    cover: MediaOut | None
    updated_at: datetime


class ProjectCard(Schema):
    id: int
    slug: str
    title: str
    type_label: str
    location: str
    works_summary: str
    layout_size: str
    is_featured: bool
    is_published: bool
    sort_order: int
    category: CategoryOut | None
    cover: MediaOut | None
    updated_at: datetime


class ServiceOut(ServiceBase):
    id: int
    cover: MediaOut | None
    tech_image: MediaOut | None
    projects: list[ProjectCard]
    faq: list[FaqPublic]
    updated_at: datetime


class ServiceAdminOut(ServiceOut):
    cover_id: int | None
    tech_image_id: int | None


# ---------- Проекты ----------


class ProjectImageIn(Schema):
    media_id: int
    caption: str = Field(default="", max_length=500)


class ProjectImageOut(Schema):
    id: int
    media: MediaOut
    caption: str
    sort_order: int


class ProjectBase(SeoFields):
    slug: str = Field(pattern=SLUG_PATTERN, max_length=150)
    locale: Locale = "ru"
    title: str = Field(min_length=1, max_length=255)
    type_label: str = Field(default="", max_length=255)
    location: str = Field(default="", max_length=255)
    company_role: str = Field(default="", max_length=3000)
    works_summary: str = Field(default="", max_length=500)
    intro: str = Field(default="", max_length=5000)
    features: str = Field(default="", max_length=5000)
    solution: str = Field(default="", max_length=5000)
    result: str = Field(default="", max_length=5000)
    params: list[KeyValue] = Field(default_factory=list, max_length=12)
    works: list[TitleText] = Field(default_factory=list, max_length=20)
    layout_size: Literal["big", "wide", "tall", "s"] = "s"
    is_featured: bool = False
    sort_order: int = 0
    is_published: bool = True


class ProjectIn(ProjectBase):
    category_id: int | None = None
    cover_id: int | None = None
    images: list[ProjectImageIn] = Field(default_factory=list, max_length=60)
    service_ids: list[int] = Field(default_factory=list)


class ServiceRef(Schema):
    id: int
    slug: str
    title: str


class ProjectOut(ProjectBase):
    id: int
    category: CategoryOut | None
    cover: MediaOut | None
    images: list[ProjectImageOut]
    services: list[ServiceRef]
    updated_at: datetime


class ProjectAdminOut(ProjectOut):
    category_id: int | None
    cover_id: int | None


class ProjectDetail(ProjectOut):
    next_project: ProjectCard | None = None


# ---------- Статьи ----------


class ArticleBase(SeoFields):
    slug: str = Field(pattern=SLUG_PATTERN, max_length=200)
    locale: Locale = "ru"
    title: str = Field(min_length=1, max_length=255)
    excerpt: str = Field(default="", max_length=1000)
    body_html: str = ""
    status: Literal["draft", "published"] = "draft"
    published_at: datetime | None = None


class ArticleIn(ArticleBase):
    cover_id: int | None = None


class ArticleCard(Schema):
    id: int
    slug: str
    title: str
    excerpt: str
    published_at: datetime | None
    reading_minutes: int
    status: str
    cover: MediaOut | None
    updated_at: datetime


class ArticleOut(ArticleBase):
    id: int
    reading_minutes: int
    cover: MediaOut | None
    updated_at: datetime


class ArticleAdminOut(ArticleOut):
    cover_id: int | None


# ---------- Настройки сайта ----------


class SettingOut(Schema):
    key: str
    locale: str
    value: dict[str, Any]
    updated_at: datetime


class SettingUpdate(Schema):
    value: dict[str, Any]
