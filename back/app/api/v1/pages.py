from fastapi import APIRouter, BackgroundTasks, HTTPException, Request, status

from app.api.deps import DB, EditorUser, LocaleQuery, audit
from app.api.utils import commit_or_conflict
from app.core.sanitize import sanitize_html
from app.models import Page
from app.repositories.content import PageRepository
from app.schemas.content import PageCreate, PageListItem, PageOut, PageUpdate
from app.services.revalidate import revalidate_tags

router = APIRouter(prefix="/pages", tags=["pages"])
admin_router = APIRouter(prefix="/pages", tags=["admin:pages"])

CUSTOM_TEMPLATE = "custom"
# Адреса, занятые разделами сайта и служебными путями: собственные страницы их не перекрывают
RESERVED_SLUGS = {
    "home", "about", "metalwork", "production", "services", "projects", "blog", "faq", "contacts", "request",
    "privacy", "not-found", "admin", "api", "media", "images", "brand", "sitemap", "robots", "manifest",
}  # fmt: skip


@router.get("", response_model=list[PageListItem])
async def list_custom_pages(db: DB, locale: LocaleQuery = "ru") -> list[PageListItem]:
    """Опубликованные страницы, созданные в CMS (для карты сайта и пререндера)."""
    items = await PageRepository(db).for_locale(locale)
    return [PageListItem.model_validate(p) for p in items if p.template == CUSTOM_TEMPLATE and p.is_published]


@router.get("/{slug}", response_model=PageOut)
async def get_page(slug: str, db: DB, locale: LocaleQuery = "ru") -> PageOut:
    page = await PageRepository(db).by_slug(slug, locale)
    if page is None or not page.is_published:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Страница не найдена")
    return PageOut.model_validate(page)


@admin_router.get("", response_model=list[PageListItem])
async def admin_list_pages(db: DB, _: EditorUser, locale: LocaleQuery = "ru") -> list[PageListItem]:
    items = await PageRepository(db).for_locale(locale)
    return [PageListItem.model_validate(p) for p in items]


@admin_router.get("/{slug}", response_model=PageOut)
async def admin_get_page(slug: str, db: DB, _: EditorUser, locale: LocaleQuery = "ru") -> PageOut:
    page = await PageRepository(db).by_slug(slug, locale)
    if page is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Страница не найдена")
    return PageOut.model_validate(page)


@admin_router.post("", response_model=PageOut, status_code=status.HTTP_201_CREATED)
async def admin_create_page(
    data: PageCreate, request: Request, tasks: BackgroundTasks, db: DB, user: EditorUser
) -> PageOut:
    if data.slug in RESERVED_SLUGS:
        raise HTTPException(status.HTTP_422_UNPROCESSABLE_CONTENT, "Этот адрес занят разделом сайта")
    page = Page(
        slug=data.slug,
        locale=data.locale,
        template=CUSTOM_TEMPLATE,
        title=data.title,
        seo_title=data.title,
        is_published=False,
        sections={"hero": {"title": data.title, "text": ""}},
        body_html="",
    )
    db.add(page)
    await audit(db, request, user, "create", "page", data.slug, title=data.title)
    await commit_or_conflict(db, "Страница с таким адресом уже существует")
    await db.refresh(page)
    tasks.add_task(revalidate_tags, "pages")
    return PageOut.model_validate(page)


@admin_router.delete("/{slug}", status_code=status.HTTP_204_NO_CONTENT)
async def admin_delete_page(
    slug: str, request: Request, tasks: BackgroundTasks, db: DB, user: EditorUser, locale: LocaleQuery = "ru"
) -> None:
    repo = PageRepository(db)
    page = await repo.by_slug(slug, locale)
    if page is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Страница не найдена")
    if page.template != CUSTOM_TEMPLATE:
        raise HTTPException(status.HTTP_400_BAD_REQUEST, "Системную страницу удалить нельзя — её можно скрыть")
    await audit(db, request, user, "delete", "page", slug, title=page.title)
    await repo.delete(page)
    await db.commit()
    tasks.add_task(revalidate_tags, "pages")


@admin_router.put("/{slug}", response_model=PageOut)
async def admin_update_page(
    slug: str,
    data: PageUpdate,
    request: Request,
    tasks: BackgroundTasks,
    db: DB,
    user: EditorUser,
    locale: LocaleQuery = "ru",
) -> PageOut:
    repo = PageRepository(db)
    page = await repo.by_slug(slug, locale)
    if page is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Страница не найдена")
    payload = data.model_dump()
    payload["body_html"] = sanitize_html(payload["body_html"])
    repo.assign(page, payload)
    await audit(db, request, user, "update", "page", slug)
    await db.commit()
    await db.refresh(page)
    tasks.add_task(revalidate_tags, "pages")
    return PageOut.model_validate(page)
