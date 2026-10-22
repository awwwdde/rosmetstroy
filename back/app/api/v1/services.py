from typing import Annotated

from fastapi import APIRouter, BackgroundTasks, Query, Request, status

from app.api.deps import DB, EditorUser, LocaleQuery, Paging, audit
from app.api.utils import commit_or_conflict, ensure_media, not_found
from app.models import Service
from app.repositories.content import ServiceRepository
from app.schemas.common import Paginated
from app.schemas.content import ServiceAdminOut, ServiceCard, ServiceIn, ServiceOut
from app.services.revalidate import revalidate_tags

router = APIRouter(prefix="/services", tags=["services"])
admin_router = APIRouter(prefix="/services", tags=["admin:services"])

TAGS = ("services", "projects")


def public_view(service: Service) -> ServiceOut:
    out = ServiceOut.model_validate(service)
    out.faq = [f for f, src in zip(out.faq, service.faq, strict=True) if src.is_published]
    out.projects = [p for p, src in zip(out.projects, service.projects, strict=True) if src.is_published]
    return out


@router.get("", response_model=list[ServiceCard])
async def list_services(db: DB, locale: LocaleQuery = "ru") -> list[ServiceCard]:
    repo = ServiceRepository(db)
    items = await repo.all(repo.filtered(locale=locale, published_only=True))
    return [ServiceCard.model_validate(s) for s in items]


@router.get("/{slug}", response_model=ServiceOut)
async def get_service(slug: str, db: DB, locale: LocaleQuery = "ru") -> ServiceOut:
    service = await ServiceRepository(db).by_slug(slug, locale, published_only=True)
    if service is None:
        raise not_found("Услуга")
    return public_view(service)


@admin_router.get("", response_model=Paginated[ServiceCard])
async def admin_list_services(
    db: DB,
    _: EditorUser,
    paging: Paging,
    locale: LocaleQuery = "ru",
    q: Annotated[str | None, Query(max_length=100)] = None,
) -> Paginated[ServiceCard]:
    repo = ServiceRepository(db)
    items, total = await repo.paginate(
        repo.filtered(locale=locale, published_only=False, q=q),
        page=paging.page,
        page_size=paging.page_size,
        sort=paging.sort,
    )
    return Paginated(
        items=[ServiceCard.model_validate(s) for s in items], total=total, page=paging.page, page_size=paging.page_size
    )


@admin_router.get("/{service_id}", response_model=ServiceAdminOut)
async def admin_get_service(service_id: int, db: DB, _: EditorUser) -> ServiceAdminOut:
    service = await ServiceRepository(db).get(service_id)
    if service is None:
        raise not_found("Услуга")
    return ServiceAdminOut.model_validate(service)


async def _save(repo: ServiceRepository, service: Service, data: ServiceIn) -> None:
    await ensure_media(repo.session, [data.cover_id, data.tech_image_id])
    repo.assign(service, data.model_dump(exclude={"project_ids"}))
    await repo.set_projects(service, data.project_ids)


@admin_router.post("", response_model=ServiceAdminOut, status_code=status.HTTP_201_CREATED)
async def admin_create_service(
    data: ServiceIn, request: Request, tasks: BackgroundTasks, db: DB, user: EditorUser
) -> ServiceAdminOut:
    repo = ServiceRepository(db)
    service = Service(projects=[])
    await _save(repo, service, data)
    await repo.add(service)
    await audit(db, request, user, "create", "service", service.id, title=service.title)
    await commit_or_conflict(db)
    await db.refresh(service)
    tasks.add_task(revalidate_tags, *TAGS)
    return ServiceAdminOut.model_validate(service)


@admin_router.put("/{service_id}", response_model=ServiceAdminOut)
async def admin_update_service(
    service_id: int, data: ServiceIn, request: Request, tasks: BackgroundTasks, db: DB, user: EditorUser
) -> ServiceAdminOut:
    repo = ServiceRepository(db)
    service = await repo.get(service_id)
    if service is None:
        raise not_found("Услуга")
    await _save(repo, service, data)
    await audit(db, request, user, "update", "service", service.id, title=service.title)
    await commit_or_conflict(db)
    await db.refresh(service)
    tasks.add_task(revalidate_tags, *TAGS)
    return ServiceAdminOut.model_validate(service)


@admin_router.delete("/{service_id}", status_code=status.HTTP_204_NO_CONTENT)
async def admin_delete_service(
    service_id: int, request: Request, tasks: BackgroundTasks, db: DB, user: EditorUser
) -> None:
    repo = ServiceRepository(db)
    service = await repo.get(service_id)
    if service is None:
        raise not_found("Услуга")
    await audit(db, request, user, "delete", "service", service.id, title=service.title)
    await repo.delete(service)
    await db.commit()
    tasks.add_task(revalidate_tags, *TAGS)
