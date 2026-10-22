from datetime import UTC, datetime
from typing import Annotated, Literal

from fastapi import APIRouter, BackgroundTasks, Query, Request, status

from app.api.deps import DB, EditorUser, LocaleQuery, Paging, audit
from app.api.utils import commit_or_conflict, ensure_media, not_found
from app.core.sanitize import reading_minutes, sanitize_html
from app.models import Article
from app.repositories.content import ArticleRepository
from app.schemas.common import Paginated
from app.schemas.content import ArticleAdminOut, ArticleCard, ArticleIn, ArticleOut
from app.services.revalidate import revalidate_tags

router = APIRouter(prefix="/articles", tags=["articles"])
admin_router = APIRouter(prefix="/articles", tags=["admin:articles"])


@router.get("", response_model=Paginated[ArticleCard])
async def list_articles(
    db: DB,
    locale: LocaleQuery = "ru",
    page: Annotated[int, Query(ge=1)] = 1,
    page_size: Annotated[int, Query(ge=1, le=50)] = 12,
) -> Paginated[ArticleCard]:
    repo = ArticleRepository(db)
    items, total = await repo.paginate(
        repo.filtered(locale=locale, published_only=True), page=page, page_size=page_size, sort="-published_at"
    )
    return Paginated(items=[ArticleCard.model_validate(a) for a in items], total=total, page=page, page_size=page_size)


@router.get("/{slug}", response_model=ArticleOut)
async def get_article(slug: str, db: DB, locale: LocaleQuery = "ru") -> ArticleOut:
    article = await ArticleRepository(db).by_slug(slug, locale, published_only=True)
    if article is None:
        raise not_found("Статья")
    return ArticleOut.model_validate(article)


@admin_router.get("", response_model=Paginated[ArticleCard])
async def admin_list_articles(
    db: DB,
    _: EditorUser,
    paging: Paging,
    locale: LocaleQuery = "ru",
    status_: Annotated[Literal["draft", "published"] | None, Query(alias="status")] = None,
    q: Annotated[str | None, Query(max_length=100)] = None,
) -> Paginated[ArticleCard]:
    repo = ArticleRepository(db)
    items, total = await repo.paginate(
        repo.filtered(locale=locale, published_only=False, status=status_, q=q),
        page=paging.page,
        page_size=paging.page_size,
        sort=paging.sort,
    )
    return Paginated(
        items=[ArticleCard.model_validate(a) for a in items], total=total, page=paging.page, page_size=paging.page_size
    )


@admin_router.get("/{article_id}", response_model=ArticleAdminOut)
async def admin_get_article(article_id: int, db: DB, _: EditorUser) -> ArticleAdminOut:
    article = await ArticleRepository(db).get(article_id)
    if article is None:
        raise not_found("Статья")
    return ArticleAdminOut.model_validate(article)


async def _save(repo: ArticleRepository, article: Article, data: ArticleIn) -> None:
    await ensure_media(repo.session, [data.cover_id])
    payload = data.model_dump()
    payload["body_html"] = sanitize_html(payload["body_html"])
    if payload["status"] == "published" and payload["published_at"] is None:
        payload["published_at"] = article.published_at or datetime.now(UTC)
    payload["reading_minutes"] = reading_minutes(payload["body_html"])
    repo.assign(article, payload)


@admin_router.post("", response_model=ArticleAdminOut, status_code=status.HTTP_201_CREATED)
async def admin_create_article(
    data: ArticleIn, request: Request, tasks: BackgroundTasks, db: DB, user: EditorUser
) -> ArticleAdminOut:
    repo = ArticleRepository(db)
    article = Article(author_id=user.id)
    await _save(repo, article, data)
    await repo.add(article)
    await audit(db, request, user, "create", "article", article.id, title=article.title)
    await commit_or_conflict(db)
    await db.refresh(article)
    tasks.add_task(revalidate_tags, "articles")
    return ArticleAdminOut.model_validate(article)


@admin_router.put("/{article_id}", response_model=ArticleAdminOut)
async def admin_update_article(
    article_id: int, data: ArticleIn, request: Request, tasks: BackgroundTasks, db: DB, user: EditorUser
) -> ArticleAdminOut:
    repo = ArticleRepository(db)
    article = await repo.get(article_id)
    if article is None:
        raise not_found("Статья")
    await _save(repo, article, data)
    await audit(db, request, user, "update", "article", article.id, title=article.title, status=article.status)
    await commit_or_conflict(db)
    await db.refresh(article)
    tasks.add_task(revalidate_tags, "articles")
    return ArticleAdminOut.model_validate(article)


@admin_router.delete("/{article_id}", status_code=status.HTTP_204_NO_CONTENT)
async def admin_delete_article(
    article_id: int, request: Request, tasks: BackgroundTasks, db: DB, user: EditorUser
) -> None:
    repo = ArticleRepository(db)
    article = await repo.get(article_id)
    if article is None:
        raise not_found("Статья")
    await audit(db, request, user, "delete", "article", article.id, title=article.title)
    await repo.delete(article)
    await db.commit()
    tasks.add_task(revalidate_tags, "articles")
