"""Профиль учётной записи (аватар) и персональная привязка к Telegram-боту

Revision ID: 0009
Revises: 0008
"""

import sqlalchemy as sa

from alembic import op

revision = "0009"
down_revision = "0008"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column("users", sa.Column("avatar_key", sa.String(512), nullable=False, server_default=""))
    op.add_column("users", sa.Column("avatar_url", sa.String(1024), nullable=False, server_default=""))
    op.add_column("users", sa.Column("telegram_id", sa.BigInteger(), nullable=True))
    op.add_column("users", sa.Column("telegram_username", sa.String(64), nullable=False, server_default=""))
    op.add_column("users", sa.Column("telegram_linked_at", sa.DateTime(timezone=True), nullable=True))
    op.add_column("users", sa.Column("telegram_link_hash", sa.String(64), nullable=False, server_default=""))
    op.add_column("users", sa.Column("telegram_link_expires_at", sa.DateTime(timezone=True), nullable=True))
    op.create_unique_constraint("uq_users_telegram_id", "users", ["telegram_id"])
    op.create_index("ix_users_telegram_link_hash", "users", ["telegram_link_hash"])


def downgrade() -> None:
    op.drop_index("ix_users_telegram_link_hash", table_name="users")
    op.drop_constraint("uq_users_telegram_id", "users", type_="unique")
    for column in (
        "telegram_link_expires_at",
        "telegram_link_hash",
        "telegram_linked_at",
        "telegram_username",
        "telegram_id",
        "avatar_url",
        "avatar_key",
    ):
        op.drop_column("users", column)
