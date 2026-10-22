"""Служебные административные эндпоинты: дашборд, пользователи, журнал действий."""

from datetime import UTC, datetime, timedelta
from typing import Annotated

from fastapi import APIRouter, HTTPException, Query, Request, status
from sqlalchemy import delete, func, select

from app.api.deps import DB, AdminUser, EditorUser, Paging, audit
from app.api.utils import commit_or_conflict, not_found
from app.core.security import hash_password
from app.models import AdminSession, Article, AuditLog, Lead, LeadStatus, Page, Project, Service, User
from app.repositories.base import Repository
from app.schemas.common import Paginated
from app.schemas.user import AuditOut, DailyCount, DashboardOut, DraftCounts, UserCreate, UserOut, UserUpdate

router = APIRouter(tags=["admin"])


@router.get("/dashboard", response_model=DashboardOut)
async def dashboard(db: DB, _: EditorUser) -> DashboardOut:
    async def count(model: type, *where: object) -> int:
        return await db.scalar(select(func.count()).select_from(model).where(*where)) or 0  # type: ignore[arg-type]

    recent = await db.scalars(select(Lead).order_by(Lead.created_at.desc()).limit(6))
    by_status = dict((await db.execute(select(Lead.status, func.count()).group_by(Lead.status))).all())

    today = datetime.now(UTC).date()
    start = today - timedelta(days=13)
    day = func.date(Lead.created_at)
    per_day = dict((await db.execute(select(day, func.count()).where(Lead.created_at >= start).group_by(day))).all())
    daily = [
        DailyCount(date=(start + timedelta(days=i)).isoformat(), count=per_day.get(start + timedelta(days=i), 0))
        for i in range(14)
    ]

    return DashboardOut(
        leads_new=await count(Lead, Lead.status == LeadStatus.new),
        leads_total=await count(Lead),
        services=await count(Service),
        projects=await count(Project),
        articles=await count(Article),
        recent_leads=[
            {
                "id": x.id,
                "number": x.number,
                "name": x.name,
                "service_label": x.service_label,
                "status": x.status,
                "created_at": x.created_at.isoformat(),
            }
            for x in recent
        ],
        leads_by_status={status.value: by_status.get(status.value, 0) for status in LeadStatus},
        leads_daily=daily,
        drafts=DraftCounts(
            services=await count(Service, Service.is_published.is_(False)),
            projects=await count(Project, Project.is_published.is_(False)),
            articles=await count(Article, Article.status != "published"),
            pages=await count(Page, Page.is_published.is_(False)),
        ),
    )


class UserRepository(Repository[User]):
    model = User
    sortable = ("created_at", "email")
    default_sort = "created_at"


@router.get("/users", response_model=list[UserOut])
async def list_users(db: DB, _: AdminUser) -> list[UserOut]:
    return [UserOut.model_validate(u) for u in await UserRepository(db).all()]


@router.post("/users", response_model=UserOut, status_code=status.HTTP_201_CREATED)
async def create_user(data: UserCreate, request: Request, db: DB, admin: AdminUser) -> UserOut:
    user = await UserRepository(db).add(
        User(
            email=data.email.lower(),
            full_name=data.full_name,
            role=data.role,
            password_hash=hash_password(data.password),
        )
    )
    await audit(db, request, admin, "create", "user", user.id, email=user.email, role=user.role)
    await commit_or_conflict(db, "Пользователь с таким e-mail уже существует")
    await db.refresh(user)
    return UserOut.model_validate(user)


@router.patch("/users/{user_id}", response_model=UserOut)
async def update_user(user_id: int, data: UserUpdate, request: Request, db: DB, admin: AdminUser) -> UserOut:
    user = await UserRepository(db).get(user_id)
    if user is None:
        raise not_found("Пользователь")
    if user.id == admin.id and (data.role not in (None, "admin") or data.is_active is False):
        raise HTTPException(status.HTTP_400_BAD_REQUEST, "Нельзя понизить или отключить собственную учётную запись")
    changes = data.model_dump(exclude_unset=True, exclude={"password"})
    for key, value in changes.items():
        setattr(user, key, value)
    if data.password:
        user.password_hash = hash_password(data.password)
    if data.password or data.is_active is False or data.role:
        await db.execute(delete(AdminSession).where(AdminSession.user_id == user.id))
    await audit(
        db, request, admin, "update", "user", user.id, fields=sorted(changes) + (["password"] if data.password else [])
    )
    await db.commit()
    await db.refresh(user)
    return UserOut.model_validate(user)


@router.delete("/users/{user_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_user(user_id: int, request: Request, db: DB, admin: AdminUser) -> None:
    repo = UserRepository(db)
    user = await repo.get(user_id)
    if user is None:
        raise not_found("Пользователь")
    if user.id == admin.id:
        raise HTTPException(status.HTTP_400_BAD_REQUEST, "Нельзя удалить собственную учётную запись")
    # Записи журнала, комментарии и материалы остаются: ссылка на автора обнуляется (ON DELETE SET NULL)
    await audit(db, request, admin, "delete", "user", user.id, email=user.email)
    await repo.delete(user)
    await db.commit()


class AuditRepository(Repository[AuditLog]):
    model = AuditLog
    sortable = ("created_at",)
    default_sort = "-created_at"


@router.get("/audit", response_model=Paginated[AuditOut])
async def audit_log(
    db: DB,
    _: AdminUser,
    paging: Paging,
    action: Annotated[str | None, Query(max_length=50)] = None,
    entity: Annotated[str | None, Query(max_length=50)] = None,
) -> Paginated[AuditOut]:
    query = select(AuditLog)
    if action:
        query = query.where(AuditLog.action == action)
    if entity:
        query = query.where(AuditLog.entity == entity)
    items, total = await AuditRepository(db).paginate(
        query, page=paging.page, page_size=paging.page_size, sort=paging.sort
    )
    return Paginated(
        items=[AuditOut.model_validate(a) for a in items], total=total, page=paging.page, page_size=paging.page_size
    )
