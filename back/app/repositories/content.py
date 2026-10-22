from collections.abc import Sequence
from typing import Any

from sqlalchemy import Select, func, or_, select

from app.models import (
    Article,
    ArticleStatus,
    Category,
    FaqItem,
    Media,
    Page,
    Project,
    ProjectImage,
    Service,
    SiteSetting,
)
from app.repositories.base import Repository


class PageRepository(Repository[Page]):
    model = Page
    sortable = ("slug", "title", "updated_at")
    default_sort = "slug"

    async def by_slug(self, slug: str, locale: str) -> Page | None:
        return await self.first(select(Page).where(Page.slug == slug, Page.locale == locale))

    async def for_locale(self, locale: str) -> Sequence[Page]:
        return await self.all(select(Page).where(Page.locale == locale))


class CategoryRepository(Repository[Category]):
    model = Category
    sortable = ("sort_order", "title")
    default_sort = "sort_order"

    def for_kind(self, kind: str, locale: str) -> Select[tuple[Category]]:
        return select(Category).where(Category.kind == kind, Category.locale == locale)


class ServiceRepository(Repository[Service]):
    model = Service
    sortable = ("sort_order", "title", "updated_at", "created_at")
    default_sort = "sort_order"

    def filtered(self, *, locale: str, published_only: bool, q: str | None = None) -> Select[tuple[Service]]:
        query = select(Service).where(Service.locale == locale)
        if published_only:
            query = query.where(Service.is_published.is_(True))
        if q:
            query = query.where(Service.title.ilike(f"%{q}%"))
        return query

    async def by_slug(self, slug: str, locale: str, published_only: bool) -> Service | None:
        return await self.first(self.filtered(locale=locale, published_only=published_only).where(Service.slug == slug))

    async def set_projects(self, service: Service, project_ids: list[int]) -> None:
        projects = await self.session.scalars(select(Project).where(Project.id.in_(project_ids))) if project_ids else []
        service.projects = list(projects)


class ProjectRepository(Repository[Project]):
    model = Project
    sortable = ("sort_order", "title", "updated_at", "created_at")
    default_sort = "sort_order"

    def filtered(
        self,
        *,
        locale: str,
        published_only: bool,
        category: str | None = None,
        featured: bool | None = None,
        q: str | None = None,
    ) -> Select[tuple[Project]]:
        query = select(Project).where(Project.locale == locale)
        if published_only:
            query = query.where(Project.is_published.is_(True))
        if category:
            query = query.join(Category).where(Category.slug == category)
        if featured is not None:
            query = query.where(Project.is_featured.is_(featured))
        if q:
            query = query.where(or_(Project.title.ilike(f"%{q}%"), Project.type_label.ilike(f"%{q}%")))
        return query

    async def by_slug(self, slug: str, locale: str, published_only: bool) -> Project | None:
        return await self.first(self.filtered(locale=locale, published_only=published_only).where(Project.slug == slug))

    async def next_after(self, project: Project) -> Project | None:
        items = await self.all(self.filtered(locale=project.locale, published_only=True))
        if len(items) < 2:
            return None
        ids = [p.id for p in items]
        idx = ids.index(project.id) if project.id in ids else -1
        return items[(idx + 1) % len(items)]

    async def set_images(self, project: Project, images: list[dict[str, Any]]) -> None:
        project.images.clear()
        await self.session.flush()
        for order, item in enumerate(images):
            project.images.append(
                ProjectImage(media_id=item["media_id"], caption=item.get("caption", ""), sort_order=order)
            )

    async def set_services(self, project: Project, service_ids: list[int]) -> None:
        services = await self.session.scalars(select(Service).where(Service.id.in_(service_ids))) if service_ids else []
        project.services = list(services)


class ArticleRepository(Repository[Article]):
    model = Article
    sortable = ("published_at", "title", "updated_at", "created_at")
    default_sort = "-published_at"

    def filtered(
        self, *, locale: str, published_only: bool, status: str | None = None, q: str | None = None
    ) -> Select[tuple[Article]]:
        query = select(Article).where(Article.locale == locale)
        if published_only:
            query = query.where(Article.status == ArticleStatus.published, Article.published_at <= func.now())
        if status:
            query = query.where(Article.status == status)
        if q:
            query = query.where(Article.title.ilike(f"%{q}%"))
        return query

    async def by_slug(self, slug: str, locale: str, published_only: bool) -> Article | None:
        return await self.first(self.filtered(locale=locale, published_only=published_only).where(Article.slug == slug))


class FaqRepository(Repository[FaqItem]):
    model = FaqItem
    sortable = ("sort_order", "id")
    default_sort = "sort_order"

    def filtered(self, *, locale: str, published_only: bool, service_id: int | None = None) -> Select[tuple[FaqItem]]:
        query = select(FaqItem).where(FaqItem.locale == locale)
        if published_only:
            query = query.where(FaqItem.is_published.is_(True))
        if service_id is not None:
            query = query.where(FaqItem.service_id == service_id)
        return query


class MediaRepository(Repository[Media]):
    model = Media
    sortable = ("created_at", "original_name", "size")
    default_sort = "-created_at"

    def filtered(self, *, kind: str | None, q: str | None) -> Select[tuple[Media]]:
        query = select(Media)
        if kind:
            query = query.where(Media.kind == kind)
        if q:
            query = query.where(or_(Media.original_name.ilike(f"%{q}%"), Media.alt.ilike(f"%{q}%")))
        return query

    async def existing_ids(self, ids: Sequence[int]) -> set[int]:
        if not ids:
            return set()
        return set(await self.session.scalars(select(Media.id).where(Media.id.in_(ids))))


class SettingRepository(Repository[SiteSetting]):
    model = SiteSetting

    async def by_key(self, key: str, locale: str) -> SiteSetting | None:
        return await self.first(select(SiteSetting).where(SiteSetting.key == key, SiteSetting.locale == locale))
