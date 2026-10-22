"""page template

Revision ID: 0003
Revises: 0002
Create Date: 2026-10-22 18:38:32.952512
"""

from collections.abc import Sequence

import sqlalchemy as sa
from alembic import op


revision: str = "0003"
down_revision: str | None = '0002'
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


SYSTEM_PAGES = (
    "home", "about", "metalwork", "services", "projects", "blog", "faq", "contacts", "request", "privacy", "not-found",
)  # fmt: skip


def upgrade() -> None:
    op.add_column("pages", sa.Column("template", sa.String(length=50), nullable=False, server_default="custom"))
    # Существующие страницы — системные: их шаблон совпадает со slug
    op.execute(
        sa.text("UPDATE pages SET template = slug WHERE slug IN :slugs").bindparams(
            sa.bindparam("slugs", expanding=True, value=list(SYSTEM_PAGES))
        )
    )


def downgrade() -> None:
    op.drop_column("pages", "template")
