"""Баннер для соцсетей по умолчанию — JPEG на 68 КБ вместо PNG на 460 КБ

WhatsApp не показывает превью тяжелее ~300 КБ, а Telegram и VK бросают медленную загрузку.
Меняет адрес, только если в CMS остался исходный: свой баннер не трогается.

Revision ID: 0008
Revises: 0007
"""

import json

import sqlalchemy as sa

from alembic import op

revision = "0008"
down_revision = "0007"
branch_labels = None
depends_on = None

OLD_IMAGE = "/images/og-default.png"
NEW_IMAGE = "/images/og-default.jpg"


def upgrade() -> None:
    conn = op.get_bind()
    rows = conn.execute(sa.text("SELECT id, value FROM site_settings WHERE key = 'site'")).mappings().all()
    for row in rows:
        value = dict(row["value"])
        seo = dict(value.get("seo") or {})
        if seo.get("og_image_url") != OLD_IMAGE:
            continue
        seo["og_image_url"] = NEW_IMAGE
        value["seo"] = seo
        conn.execute(
            sa.text("UPDATE site_settings SET value = CAST(:value AS jsonb) WHERE id = :id"),
            {"value": json.dumps(value, ensure_ascii=False), "id": row["id"]},
        )
    conn.execute(
        sa.text("UPDATE pages SET og_image_url = :new WHERE og_image_url = :old"),
        {"new": NEW_IMAGE, "old": OLD_IMAGE},
    )


def downgrade() -> None:
    # Данные не откатываются
    pass
