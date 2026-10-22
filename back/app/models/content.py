from datetime import datetime
from enum import StrEnum
from typing import Any

from sqlalchemy import (
    Boolean,
    Column,
    DateTime,
    ForeignKey,
    Integer,
    String,
    Table,
    Text,
    UniqueConstraint,
)
from sqlalchemy.dialects.postgresql import JSONB
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base, TimestampMixin
from app.models.media import Media

DEFAULT_LOCALE = "ru"


class SeoMixin:
    seo_title: Mapped[str] = mapped_column(String(255), default="")
    seo_description: Mapped[str] = mapped_column(String(500), default="")


class Page(TimestampMixin, SeoMixin, Base):
    """Страница сайта с набором секций, структура которых задана шаблоном."""

    __tablename__ = "pages"
    __table_args__ = (UniqueConstraint("slug", "locale"),)

    id: Mapped[int] = mapped_column(primary_key=True)
    slug: Mapped[str] = mapped_column(String(100), index=True)
    locale: Mapped[str] = mapped_column(String(8), default=DEFAULT_LOCALE)
    # Шаблон страницы: для системных страниц совпадает со slug, для созданных в CMS — "custom"
    template: Mapped[str] = mapped_column(String(50), default="custom")
    title: Mapped[str] = mapped_column(String(255))
    og_image_url: Mapped[str] = mapped_column(String(1024), default="")
    is_published: Mapped[bool] = mapped_column(Boolean, default=True)
    sections: Mapped[dict[str, Any]] = mapped_column(JSONB, default=dict)
    body_html: Mapped[str] = mapped_column(Text, default="")


class Category(TimestampMixin, Base):
    __tablename__ = "categories"
    __table_args__ = (UniqueConstraint("kind", "slug", "locale"),)

    id: Mapped[int] = mapped_column(primary_key=True)
    kind: Mapped[str] = mapped_column(String(20), default="project")
    slug: Mapped[str] = mapped_column(String(100))
    locale: Mapped[str] = mapped_column(String(8), default=DEFAULT_LOCALE)
    title: Mapped[str] = mapped_column(String(255))
    label: Mapped[str] = mapped_column(String(100), default="")
    sort_order: Mapped[int] = mapped_column(Integer, default=0)


service_projects = Table(
    "service_projects",
    Base.metadata,
    Column("service_id", ForeignKey("services.id", ondelete="CASCADE"), primary_key=True),
    Column("project_id", ForeignKey("projects.id", ondelete="CASCADE"), primary_key=True),
)


class Service(TimestampMixin, SeoMixin, Base):
    __tablename__ = "services"
    __table_args__ = (UniqueConstraint("slug", "locale"),)

    id: Mapped[int] = mapped_column(primary_key=True)
    slug: Mapped[str] = mapped_column(String(150), index=True)
    locale: Mapped[str] = mapped_column(String(8), default=DEFAULT_LOCALE)
    title: Mapped[str] = mapped_column(String(255))
    menu_title: Mapped[str] = mapped_column(String(255), default="")
    menu_group: Mapped[str] = mapped_column(String(100), default="")
    subtitle: Mapped[str] = mapped_column(String(500), default="")
    summary: Mapped[str] = mapped_column(Text, default="")
    # Полное описание услуги (абзацы через пустую строку)
    description: Mapped[str] = mapped_column(Text, default="")
    # «Какие задачи решает», «Состав работ», «Особенности и ограничения»
    tasks: Mapped[list[dict[str, str]]] = mapped_column(JSONB, default=list)
    scope: Mapped[list[dict[str, str]]] = mapped_column(JSONB, default=list)
    limitations: Mapped[list[dict[str, str]]] = mapped_column(JSONB, default=list)
    # «Как организуется выполнение»: кто выполняет работы (свои специалисты, подрядчики, партнёр)
    execution_note: Mapped[str] = mapped_column(Text, default="")
    hero_badges: Mapped[list[dict[str, str]]] = mapped_column(JSONB, default=list)
    uses_title: Mapped[str] = mapped_column(String(255), default="")
    uses_text: Mapped[str] = mapped_column(Text, default="")
    uses: Mapped[list[dict[str, str]]] = mapped_column(JSONB, default=list)
    specs: Mapped[list[dict[str, str]]] = mapped_column(JSONB, default=list)
    stages: Mapped[list[dict[str, str]]] = mapped_column(JSONB, default=list)
    cta_title: Mapped[str] = mapped_column(String(500), default="")
    cta_text: Mapped[str] = mapped_column(Text, default="")
    is_partner: Mapped[bool] = mapped_column(Boolean, default=False)
    show_in_menu: Mapped[bool] = mapped_column(Boolean, default=True)
    sort_order: Mapped[int] = mapped_column(Integer, default=0)
    is_published: Mapped[bool] = mapped_column(Boolean, default=True)
    cover_id: Mapped[int | None] = mapped_column(ForeignKey("media.id", ondelete="SET NULL"))
    tech_image_id: Mapped[int | None] = mapped_column(ForeignKey("media.id", ondelete="SET NULL"))

    cover: Mapped[Media | None] = relationship(foreign_keys=[cover_id], lazy="selectin")
    tech_image: Mapped[Media | None] = relationship(foreign_keys=[tech_image_id], lazy="selectin")
    projects: Mapped[list["Project"]] = relationship(
        secondary=service_projects, back_populates="services", lazy="selectin"
    )
    faq: Mapped[list["FaqItem"]] = relationship(
        back_populates="service", lazy="selectin", order_by="FaqItem.sort_order"
    )


class LayoutSize(StrEnum):
    big = "big"
    wide = "wide"
    tall = "tall"
    small = "s"


class Project(TimestampMixin, SeoMixin, Base):
    __tablename__ = "projects"
    __table_args__ = (UniqueConstraint("slug", "locale"),)

    id: Mapped[int] = mapped_column(primary_key=True)
    slug: Mapped[str] = mapped_column(String(150), index=True)
    locale: Mapped[str] = mapped_column(String(8), default=DEFAULT_LOCALE)
    title: Mapped[str] = mapped_column(String(255))
    type_label: Mapped[str] = mapped_column(String(255), default="")
    location: Mapped[str] = mapped_column(String(255), default="")
    # Роль «Росметстрой» на объекте: генподрядчик, исполнитель отдельных работ, организатор поставки и т. п.
    company_role: Mapped[str] = mapped_column(Text, default="")
    works_summary: Mapped[str] = mapped_column(String(500), default="")
    intro: Mapped[str] = mapped_column(Text, default="")
    features: Mapped[str] = mapped_column(Text, default="")
    solution: Mapped[str] = mapped_column(Text, default="")
    result: Mapped[str] = mapped_column(Text, default="")
    params: Mapped[list[dict[str, str]]] = mapped_column(JSONB, default=list)
    works: Mapped[list[dict[str, str]]] = mapped_column(JSONB, default=list)
    layout_size: Mapped[str] = mapped_column(String(10), default=LayoutSize.small)
    is_featured: Mapped[bool] = mapped_column(Boolean, default=False)
    sort_order: Mapped[int] = mapped_column(Integer, default=0)
    is_published: Mapped[bool] = mapped_column(Boolean, default=True)
    category_id: Mapped[int | None] = mapped_column(ForeignKey("categories.id", ondelete="SET NULL"))
    cover_id: Mapped[int | None] = mapped_column(ForeignKey("media.id", ondelete="SET NULL"))

    category: Mapped[Category | None] = relationship(lazy="selectin")
    cover: Mapped[Media | None] = relationship(lazy="selectin")
    images: Mapped[list["ProjectImage"]] = relationship(
        back_populates="project",
        cascade="all, delete-orphan",
        lazy="selectin",
        order_by="ProjectImage.sort_order",
    )
    services: Mapped[list[Service]] = relationship(
        secondary=service_projects, back_populates="projects", lazy="selectin"
    )


class ProjectImage(Base):
    __tablename__ = "project_images"

    id: Mapped[int] = mapped_column(primary_key=True)
    project_id: Mapped[int] = mapped_column(ForeignKey("projects.id", ondelete="CASCADE"), index=True)
    media_id: Mapped[int] = mapped_column(ForeignKey("media.id", ondelete="CASCADE"))
    sort_order: Mapped[int] = mapped_column(Integer, default=0)
    caption: Mapped[str] = mapped_column(String(500), default="")

    project: Mapped[Project] = relationship(back_populates="images")
    media: Mapped[Media] = relationship(lazy="joined")


class ArticleStatus(StrEnum):
    draft = "draft"
    published = "published"


class Article(TimestampMixin, SeoMixin, Base):
    __tablename__ = "articles"
    __table_args__ = (UniqueConstraint("slug", "locale"),)

    id: Mapped[int] = mapped_column(primary_key=True)
    slug: Mapped[str] = mapped_column(String(200), index=True)
    locale: Mapped[str] = mapped_column(String(8), default=DEFAULT_LOCALE)
    title: Mapped[str] = mapped_column(String(255))
    excerpt: Mapped[str] = mapped_column(Text, default="")
    body_html: Mapped[str] = mapped_column(Text, default="")
    status: Mapped[str] = mapped_column(String(20), default=ArticleStatus.draft, index=True)
    published_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), index=True)
    reading_minutes: Mapped[int] = mapped_column(Integer, default=1)
    cover_id: Mapped[int | None] = mapped_column(ForeignKey("media.id", ondelete="SET NULL"))
    author_id: Mapped[int | None] = mapped_column(ForeignKey("users.id", ondelete="SET NULL"))

    cover: Mapped[Media | None] = relationship(lazy="selectin")


class FaqItem(TimestampMixin, Base):
    __tablename__ = "faq_items"

    id: Mapped[int] = mapped_column(primary_key=True)
    locale: Mapped[str] = mapped_column(String(8), default=DEFAULT_LOCALE)
    question: Mapped[str] = mapped_column(String(500))
    answer: Mapped[str] = mapped_column(Text)
    sort_order: Mapped[int] = mapped_column(Integer, default=0)
    is_published: Mapped[bool] = mapped_column(Boolean, default=True)
    service_id: Mapped[int | None] = mapped_column(ForeignKey("services.id", ondelete="SET NULL"))

    service: Mapped[Service | None] = relationship(back_populates="faq")


class SiteSetting(TimestampMixin, Base):
    __tablename__ = "site_settings"
    __table_args__ = (UniqueConstraint("key", "locale"),)

    id: Mapped[int] = mapped_column(primary_key=True)
    key: Mapped[str] = mapped_column(String(100))
    locale: Mapped[str] = mapped_column(String(8), default=DEFAULT_LOCALE)
    value: Mapped[dict[str, Any]] = mapped_column(JSONB, default=dict)
