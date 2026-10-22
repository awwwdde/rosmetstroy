from datetime import UTC, datetime
from typing import Annotated, Any

from fastapi import Depends, HTTPException, Query, Request, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import settings
from app.core.rate_limit import client_ip
from app.core.security import hash_token, tokens_equal
from app.db.session import get_db
from app.models import AdminSession, AuditLog, Role, User

DB = Annotated[AsyncSession, Depends(get_db)]

SAFE_METHODS = {"GET", "HEAD", "OPTIONS"}


async def get_admin_session(request: Request, db: DB) -> AdminSession:
    token = request.cookies.get(settings.session_cookie_name)
    if not token:
        raise HTTPException(status.HTTP_401_UNAUTHORIZED, "Требуется авторизация")
    session = await db.scalar(select(AdminSession).where(AdminSession.token_hash == hash_token(token)))
    if session is None or session.expires_at < datetime.now(UTC) or not session.user.is_active:
        raise HTTPException(status.HTTP_401_UNAUTHORIZED, "Сессия истекла")
    if request.method not in SAFE_METHODS:
        header = request.headers.get("x-csrf-token", "")
        if not header or not tokens_equal(header, session.csrf_token):
            raise HTTPException(status.HTTP_403_FORBIDDEN, "Неверный CSRF-токен")
    return session


SessionDep = Annotated[AdminSession, Depends(get_admin_session)]


async def current_user(session: SessionDep) -> User:
    return session.user


CurrentUser = Annotated[User, Depends(current_user)]


def require_role(*roles: Role):
    async def checker(user: CurrentUser) -> User:
        if user.role not in roles:
            raise HTTPException(status.HTTP_403_FORBIDDEN, "Недостаточно прав")
        return user

    return checker


AdminUser = Annotated[User, Depends(require_role(Role.admin))]
EditorUser = Annotated[User, Depends(require_role(Role.admin, Role.editor))]


class PageParams:
    def __init__(
        self,
        page: Annotated[int, Query(ge=1)] = 1,
        page_size: Annotated[int, Query(ge=1, le=100)] = 20,
        sort: Annotated[str | None, Query(max_length=50)] = None,
    ) -> None:
        self.page = page
        self.page_size = page_size
        self.sort = sort


Paging = Annotated[PageParams, Depends()]
LocaleQuery = Annotated[str, Query(pattern="^(ru|en)$")]


async def audit(
    db: AsyncSession,
    request: Request,
    user: User | None,
    action: str,
    entity: str = "",
    entity_id: Any = "",
    **meta: Any,
) -> None:
    db.add(
        AuditLog(
            user_id=user.id if user else None,
            action=action,
            entity=entity,
            entity_id=str(entity_id),
            meta=meta,
            ip=client_ip(request),
        )
    )
