from fastapi import APIRouter, BackgroundTasks, Request, status

from app.api.deps import DB, EditorUser, LocaleQuery, audit
from app.api.utils import commit_or_conflict, not_found
from app.models import Category
from app.repositories.content import CategoryRepository
from app.schemas.content import CategoryIn, CategoryOut
from app.services.revalidate import revalidate_tags

router = APIRouter(prefix="/categories", tags=["categories"])
admin_router = APIRouter(prefix="/categories", tags=["admin:categories"])


@router.get("", response_model=list[CategoryOut])
async def list_categories(db: DB, locale: LocaleQuery = "ru", kind: str = "project") -> list[CategoryOut]:
    repo = CategoryRepository(db)
    return [CategoryOut.model_validate(c) for c in await repo.all(repo.for_kind(kind, locale))]


@admin_router.post("", response_model=CategoryOut, status_code=status.HTTP_201_CREATED)
async def create_category(
    data: CategoryIn, request: Request, tasks: BackgroundTasks, db: DB, user: EditorUser
) -> CategoryOut:
    category = await CategoryRepository(db).add(Category(**data.model_dump()))
    await audit(db, request, user, "create", "category", category.id, title=category.title)
    await commit_or_conflict(db)
    tasks.add_task(revalidate_tags, "projects")
    return CategoryOut.model_validate(category)


@admin_router.put("/{category_id}", response_model=CategoryOut)
async def update_category(
    category_id: int, data: CategoryIn, request: Request, tasks: BackgroundTasks, db: DB, user: EditorUser
) -> CategoryOut:
    repo = CategoryRepository(db)
    category = await repo.get(category_id)
    if category is None:
        raise not_found("Категория")
    repo.assign(category, data.model_dump())
    await audit(db, request, user, "update", "category", category.id, title=category.title)
    await commit_or_conflict(db)
    tasks.add_task(revalidate_tags, "projects")
    return CategoryOut.model_validate(category)


@admin_router.delete("/{category_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_category(category_id: int, request: Request, tasks: BackgroundTasks, db: DB, user: EditorUser) -> None:
    repo = CategoryRepository(db)
    category = await repo.get(category_id)
    if category is None:
        raise not_found("Категория")
    await audit(db, request, user, "delete", "category", category.id, title=category.title)
    await repo.delete(category)
    await db.commit()
    tasks.add_task(revalidate_tags, "projects")
