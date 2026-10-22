from collections.abc import Sequence
from typing import Any

from sqlalchemy import Select, func, select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import InstrumentedAttribute

from app.db.base import Base


class Repository[M: Base]:
    model: type[M]
    # Поля, по которым разрешена сортировка через ?sort=field / ?sort=-field
    sortable: tuple[str, ...] = ("id",)
    default_sort: str = "id"

    def __init__(self, session: AsyncSession) -> None:
        self.session = session

    def base_query(self) -> Select[tuple[M]]:
        return select(self.model)

    def _order(self, query: Select[tuple[M]], sort: str | None) -> Select[tuple[M]]:
        sort = sort or self.default_sort
        desc = sort.startswith("-")
        field = sort.lstrip("-")
        if field not in self.sortable:
            field = self.default_sort.lstrip("-")
            desc = self.default_sort.startswith("-")
        column: InstrumentedAttribute[Any] = getattr(self.model, field)
        return query.order_by(column.desc() if desc else column.asc(), self.model.id.desc())  # type: ignore[attr-defined]

    async def paginate(
        self, query: Select[tuple[M]], *, page: int, page_size: int, sort: str | None
    ) -> tuple[Sequence[M], int]:
        total = await self.session.scalar(select(func.count()).select_from(query.order_by(None).subquery()))
        rows = await self.session.scalars(self._order(query, sort).offset((page - 1) * page_size).limit(page_size))
        return rows.unique().all(), total or 0

    async def all(self, query: Select[tuple[M]] | None = None, sort: str | None = None) -> Sequence[M]:
        rows = await self.session.scalars(self._order(query if query is not None else self.base_query(), sort))
        return rows.unique().all()

    async def get(self, id_: int) -> M | None:
        return await self.session.get(self.model, id_)

    async def first(self, query: Select[tuple[M]]) -> M | None:
        return (await self.session.scalars(query.limit(1))).first()

    async def add(self, obj: M) -> M:
        self.session.add(obj)
        await self.session.flush()
        return obj

    async def delete(self, obj: M) -> None:
        await self.session.delete(obj)
        await self.session.flush()

    @staticmethod
    def assign(obj: M, data: dict[str, Any]) -> M:
        for key, value in data.items():
            setattr(obj, key, value)
        return obj
