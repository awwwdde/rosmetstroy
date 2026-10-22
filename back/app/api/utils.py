from collections.abc import Iterable

from fastapi import HTTPException, status
from sqlalchemy.exc import IntegrityError
from sqlalchemy.ext.asyncio import AsyncSession

from app.repositories.content import MediaRepository


async def ensure_media(db: AsyncSession, ids: Iterable[int | None]) -> None:
    wanted = {i for i in ids if i is not None}
    missing = wanted - await MediaRepository(db).existing_ids(list(wanted))
    if missing:
        raise HTTPException(status.HTTP_422_UNPROCESSABLE_CONTENT, f"Медиафайлы не найдены: {sorted(missing)}")


async def commit_or_conflict(db: AsyncSession, message: str = "Запись с таким адресом (slug) уже существует") -> None:
    try:
        await db.commit()
    except IntegrityError as exc:
        await db.rollback()
        raise HTTPException(status.HTTP_409_CONFLICT, message) from exc


def not_found(what: str = "Запись") -> HTTPException:
    return HTTPException(status.HTTP_404_NOT_FOUND, f"{what} не найдена")
