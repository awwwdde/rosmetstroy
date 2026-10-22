from datetime import datetime

from sqlalchemy import Select, or_, select

from app.models import Lead
from app.repositories.base import Repository


class LeadRepository(Repository[Lead]):
    model = Lead
    sortable = ("created_at", "status", "name")
    default_sort = "-created_at"

    def filtered(
        self,
        *,
        status: str | None = None,
        q: str | None = None,
        service_id: int | None = None,
        date_from: datetime | None = None,
        date_to: datetime | None = None,
    ) -> Select[tuple[Lead]]:
        query = select(Lead)
        if status:
            query = query.where(Lead.status == status)
        if service_id:
            query = query.where(Lead.service_id == service_id)
        if date_from:
            query = query.where(Lead.created_at >= date_from)
        if date_to:
            query = query.where(Lead.created_at <= date_to)
        if q:
            like = f"%{q}%"
            query = query.where(
                or_(Lead.name.ilike(like), Lead.company.ilike(like), Lead.phone.ilike(like), Lead.email.ilike(like))
            )
        return query
