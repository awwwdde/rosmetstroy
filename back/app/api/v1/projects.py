from typing import Annotated

from fastapi import APIRouter, BackgroundTasks, Query, Request, status

from app.api.deps import DB, EditorUser, LocaleQuery, Paging, audit
from app.api.utils import commit_or_conflict, ensure_media, not_found
from app.models import Project
from app.repositories.content import ProjectRepository
from app.schemas.common import Paginated
from app.schemas.content import ProjectAdminOut, ProjectCard, ProjectDetail, ProjectIn
from app.services.revalidate import revalidate_tags

router = APIRouter(prefix="/projects", tags=["projects"])
admin_router = APIRouter(prefix="/projects", tags=["admin:projects"])

TAGS = ("projects", "services")
SlugQuery = Annotated[str | None, Query(max_length=100, pattern="^[a-z0-9-]+$")]


@router.get("", response_model=list[ProjectCard])
async def list_projects(
    db: DB,
    locale: LocaleQuery = "ru",
    category: SlugQuery = None,
    featured: bool | None = None,
    limit: Annotated[int, Query(ge=1, le=200)] = 100,
) -> list[ProjectCard]:
    repo = ProjectRepository(db)
    items = await repo.all(repo.filtered(locale=locale, published_only=True, category=category, featured=featured))
    return [ProjectCard.model_validate(p) for p in items[:limit]]


@router.get("/{slug}", response_model=ProjectDetail)
async def get_project(slug: str, db: DB, locale: LocaleQuery = "ru") -> ProjectDetail:
    repo = ProjectRepository(db)
    project = await repo.by_slug(slug, locale, published_only=True)
    if project is None:
        raise not_found("Проект")
    out = ProjectDetail.model_validate(project)
    out.services = [s for s, src in zip(out.services, project.services, strict=True) if src.is_published]
    nxt = await repo.next_after(project)
    out.next_project = ProjectCard.model_validate(nxt) if nxt else None
    return out


@admin_router.get("", response_model=Paginated[ProjectCard])
async def admin_list_projects(
    db: DB,
    _: EditorUser,
    paging: Paging,
    locale: LocaleQuery = "ru",
    category: SlugQuery = None,
    q: Annotated[str | None, Query(max_length=100)] = None,
) -> Paginated[ProjectCard]:
    repo = ProjectRepository(db)
    items, total = await repo.paginate(
        repo.filtered(locale=locale, published_only=False, category=category, q=q),
        page=paging.page,
        page_size=paging.page_size,
        sort=paging.sort,
    )
    return Paginated(
        items=[ProjectCard.model_validate(p) for p in items], total=total, page=paging.page, page_size=paging.page_size
    )


@admin_router.get("/{project_id}", response_model=ProjectAdminOut)
async def admin_get_project(project_id: int, db: DB, _: EditorUser) -> ProjectAdminOut:
    project = await ProjectRepository(db).get(project_id)
    if project is None:
        raise not_found("Проект")
    return ProjectAdminOut.model_validate(project)


async def _save(repo: ProjectRepository, project: Project, data: ProjectIn) -> None:
    await ensure_media(repo.session, [data.cover_id, *(i.media_id for i in data.images)])
    repo.assign(project, data.model_dump(exclude={"images", "service_ids"}))
    await repo.set_images(project, [i.model_dump() for i in data.images])
    await repo.set_services(project, data.service_ids)


@admin_router.post("", response_model=ProjectAdminOut, status_code=status.HTTP_201_CREATED)
async def admin_create_project(
    data: ProjectIn, request: Request, tasks: BackgroundTasks, db: DB, user: EditorUser
) -> ProjectAdminOut:
    repo = ProjectRepository(db)
    project = Project(images=[], services=[])
    await _save(repo, project, data)
    await repo.add(project)
    await audit(db, request, user, "create", "project", project.id, title=project.title)
    await commit_or_conflict(db)
    await db.refresh(project)
    tasks.add_task(revalidate_tags, *TAGS)
    return ProjectAdminOut.model_validate(project)


@admin_router.put("/{project_id}", response_model=ProjectAdminOut)
async def admin_update_project(
    project_id: int, data: ProjectIn, request: Request, tasks: BackgroundTasks, db: DB, user: EditorUser
) -> ProjectAdminOut:
    repo = ProjectRepository(db)
    project = await repo.get(project_id)
    if project is None:
        raise not_found("Проект")
    await _save(repo, project, data)
    await audit(db, request, user, "update", "project", project.id, title=project.title)
    await commit_or_conflict(db)
    await db.refresh(project)
    tasks.add_task(revalidate_tags, *TAGS)
    return ProjectAdminOut.model_validate(project)


@admin_router.delete("/{project_id}", status_code=status.HTTP_204_NO_CONTENT)
async def admin_delete_project(
    project_id: int, request: Request, tasks: BackgroundTasks, db: DB, user: EditorUser
) -> None:
    repo = ProjectRepository(db)
    project = await repo.get(project_id)
    if project is None:
        raise not_found("Проект")
    await audit(db, request, user, "delete", "project", project.id, title=project.title)
    await repo.delete(project)
    await db.commit()
    tasks.add_task(revalidate_tags, *TAGS)
