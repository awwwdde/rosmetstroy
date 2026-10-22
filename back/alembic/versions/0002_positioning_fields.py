"""positioning fields

Revision ID: 0002
Revises: 0001
Create Date: 2026-10-22 12:14:49.964368
"""

from collections.abc import Sequence

import sqlalchemy as sa
from alembic import op
from sqlalchemy.dialects import postgresql

revision: str = "0002"
down_revision: str | None = '0001'
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    # Значения по умолчанию — чтобы миграция применялась к уже заполненным таблицам
    op.add_column('projects', sa.Column('location', sa.String(length=255), nullable=False, server_default=''))
    op.add_column('projects', sa.Column('company_role', sa.Text(), nullable=False, server_default=''))
    op.add_column('services', sa.Column('description', sa.Text(), nullable=False, server_default=''))
    op.add_column('services', sa.Column('tasks', postgresql.JSONB(astext_type=sa.Text()), nullable=False, server_default=sa.text("'[]'::jsonb")))
    op.add_column('services', sa.Column('scope', postgresql.JSONB(astext_type=sa.Text()), nullable=False, server_default=sa.text("'[]'::jsonb")))
    op.add_column('services', sa.Column('limitations', postgresql.JSONB(astext_type=sa.Text()), nullable=False, server_default=sa.text("'[]'::jsonb")))
    op.add_column('services', sa.Column('execution_note', sa.Text(), nullable=False, server_default=''))


def downgrade() -> None:
    op.drop_column('services', 'execution_note')
    op.drop_column('services', 'limitations')
    op.drop_column('services', 'scope')
    op.drop_column('services', 'tasks')
    op.drop_column('services', 'description')
    op.drop_column('projects', 'company_role')
    op.drop_column('projects', 'location')
