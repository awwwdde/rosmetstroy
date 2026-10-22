from datetime import UTC, datetime, timedelta

from fastapi import APIRouter, Depends, HTTPException, Request, Response, status
from sqlalchemy import delete, func, select

from app.api.deps import DB, CurrentUser, SessionDep, audit
from app.core.config import settings
from app.core.rate_limit import client_ip, limiter, rate_limit
from app.core.security import hash_password, hash_token, needs_rehash, new_token, verify_password
from app.models import AdminSession, User
from app.schemas.user import LoginIn, MeOut, PasswordChange, UserOut

router = APIRouter(prefix="/auth", tags=["auth"])


def _set_cookies(response: Response, token: str, csrf: str, max_age: int) -> None:
    common = {"secure": settings.cookie_secure, "samesite": "lax", "path": "/", "max_age": max_age}
    response.set_cookie(settings.session_cookie_name, token, httponly=True, **common)  # type: ignore[arg-type]
    # CSRF-токен читается клиентом и отправляется в заголовке X-CSRF-Token (double submit)
    response.set_cookie(settings.csrf_cookie_name, csrf, httponly=False, **common)  # type: ignore[arg-type]


def _clear_cookies(response: Response) -> None:
    response.delete_cookie(settings.session_cookie_name, path="/")
    response.delete_cookie(settings.csrf_cookie_name, path="/")


@router.post("/login", response_model=MeOut, dependencies=[Depends(rate_limit("login", 10, 900))])
async def login(data: LoginIn, request: Request, response: Response, db: DB) -> MeOut:
    email = data.email.lower()
    if not limiter.hit(f"login-email:{email}", 10, 900):
        raise HTTPException(status.HTTP_429_TOO_MANY_REQUESTS, "Слишком много попыток входа. Повторите позже.")
    user = await db.scalar(select(User).where(func.lower(User.email) == email))
    if not verify_password(data.password, user.password_hash if user else None) or user is None or not user.is_active:
        await audit(db, request, user, "login_failed", "user", user.id if user else "", email=email)
        await db.commit()
        raise HTTPException(status.HTTP_401_UNAUTHORIZED, "Неверный e-mail или пароль")

    if needs_rehash(user.password_hash):
        user.password_hash = hash_password(data.password)
    token, csrf = new_token(), new_token()
    ttl = timedelta(hours=settings.session_ttl_hours)
    db.add(
        AdminSession(
            token_hash=hash_token(token),
            csrf_token=csrf,
            user_id=user.id,
            expires_at=datetime.now(UTC) + ttl,
            ip=client_ip(request),
            user_agent=request.headers.get("user-agent", "")[:512],
        )
    )
    user.last_login_at = datetime.now(UTC)
    # Удаляем просроченные сессии пользователя
    await db.execute(
        delete(AdminSession).where(AdminSession.user_id == user.id, AdminSession.expires_at < datetime.now(UTC))
    )
    await audit(db, request, user, "login", "user", user.id)
    await db.commit()
    await db.refresh(user)
    _set_cookies(response, token, csrf, int(ttl.total_seconds()))
    return MeOut(user=UserOut.model_validate(user), csrf_token=csrf)


@router.post("/logout", status_code=status.HTTP_204_NO_CONTENT)
async def logout(request: Request, response: Response, session: SessionDep, db: DB) -> None:
    await audit(db, request, session.user, "logout", "user", session.user_id)
    await db.execute(delete(AdminSession).where(AdminSession.id == session.id))
    await db.commit()
    _clear_cookies(response)


@router.get("/me", response_model=MeOut)
async def me(session: SessionDep) -> MeOut:
    return MeOut(user=UserOut.model_validate(session.user), csrf_token=session.csrf_token)


@router.post("/password", status_code=status.HTTP_204_NO_CONTENT)
async def change_password(
    data: PasswordChange, request: Request, user: CurrentUser, session: SessionDep, db: DB
) -> None:
    if not verify_password(data.current_password, user.password_hash):
        raise HTTPException(status.HTTP_400_BAD_REQUEST, "Текущий пароль указан неверно")
    user.password_hash = hash_password(data.new_password)
    # Завершаем остальные сессии пользователя
    await db.execute(delete(AdminSession).where(AdminSession.user_id == user.id, AdminSession.id != session.id))
    await audit(db, request, user, "password_change", "user", user.id)
    await db.commit()
