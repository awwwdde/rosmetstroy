from fastapi import APIRouter, BackgroundTasks, Request, status

from app.api.deps import DB, EditorUser, LocaleQuery, audit
from app.api.utils import not_found
from app.models import FaqItem
from app.repositories.content import FaqRepository
from app.schemas.content import FaqIn, FaqOut, FaqPublic
from app.services.revalidate import revalidate_tags

router = APIRouter(prefix="/faq", tags=["faq"])
admin_router = APIRouter(prefix="/faq", tags=["admin:faq"])

TAGS = ("faq", "services")


@router.get("", response_model=list[FaqPublic])
async def list_faq(db: DB, locale: LocaleQuery = "ru", service_id: int | None = None) -> list[FaqPublic]:
    repo = FaqRepository(db)
    items = await repo.all(repo.filtered(locale=locale, published_only=True, service_id=service_id))
    return [FaqPublic.model_validate(f) for f in items]


@admin_router.get("", response_model=list[FaqOut])
async def admin_list_faq(db: DB, _: EditorUser, locale: LocaleQuery = "ru") -> list[FaqOut]:
    repo = FaqRepository(db)
    return [FaqOut.model_validate(f) for f in await repo.all(repo.filtered(locale=locale, published_only=False))]


@admin_router.post("", response_model=FaqOut, status_code=status.HTTP_201_CREATED)
async def admin_create_faq(data: FaqIn, request: Request, tasks: BackgroundTasks, db: DB, user: EditorUser) -> FaqOut:
    item = await FaqRepository(db).add(FaqItem(**data.model_dump()))
    await audit(db, request, user, "create", "faq", item.id)
    await db.commit()
    tasks.add_task(revalidate_tags, *TAGS)
    return FaqOut.model_validate(item)


@admin_router.put("/{faq_id}", response_model=FaqOut)
async def admin_update_faq(
    faq_id: int, data: FaqIn, request: Request, tasks: BackgroundTasks, db: DB, user: EditorUser
) -> FaqOut:
    repo = FaqRepository(db)
    item = await repo.get(faq_id)
    if item is None:
        raise not_found("Вопрос")
    repo.assign(item, data.model_dump())
    await audit(db, request, user, "update", "faq", item.id)
    await db.commit()
    tasks.add_task(revalidate_tags, *TAGS)
    return FaqOut.model_validate(item)


@admin_router.delete("/{faq_id}", status_code=status.HTTP_204_NO_CONTENT)
async def admin_delete_faq(faq_id: int, request: Request, tasks: BackgroundTasks, db: DB, user: EditorUser) -> None:
    repo = FaqRepository(db)
    item = await repo.get(faq_id)
    if item is None:
        raise not_found("Вопрос")
    await audit(db, request, user, "delete", "faq", item.id)
    await repo.delete(item)
    await db.commit()
    tasks.add_task(revalidate_tags, *TAGS)
