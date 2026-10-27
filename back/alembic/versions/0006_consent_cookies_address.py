"""152-ФЗ: отдельное согласие на обработку ПД, фиксация согласия в заявке, уведомление о cookie; новый адрес

Как и 0005, меняет контент только там, где он остался в исходном виде: правки из CMS не трогаются.

Revision ID: 0006
Revises: 0005
"""

import json

import sqlalchemy as sa

from alembic import op
from app import seed_data as data

revision = "0006"
down_revision = "0005"
branch_labels = None
depends_on = None

OLD_ADDRESS = "Москва, ул. Верхние Поля, д. 46, стр. 9"
# Признак редакции политики до появления отдельного согласия и уведомления о cookie
OLD_PRIVACY_MARKER = "Сайт не использует cookie-файлы для аналитики или рекламы"


def _refresh_settings(conn: sa.Connection) -> None:
    rows = conn.execute(sa.text("SELECT id, value FROM site_settings WHERE key = 'site'")).mappings().all()
    for row in rows:
        value = dict(row["value"])
        if value.get("address") in (OLD_ADDRESS, ""):
            value["address"] = data.SITE_SETTINGS["address"]
        documents = list(value.get("documents") or [])
        if not any(d.get("href") == "/consent" for d in documents):
            documents.append({"label": "Согласие на обработку персональных данных", "href": "/consent"})
            value["documents"] = documents
        for key in ("cookies", "analytics"):
            value.setdefault(key, data.SITE_SETTINGS[key])
        conn.execute(
            sa.text("UPDATE site_settings SET value = CAST(:value AS jsonb) WHERE id = :id"),
            {"value": json.dumps(value, ensure_ascii=False), "id": row["id"]},
        )


def _pages(conn: sa.Connection) -> None:
    pages = {p["slug"]: p for p in data.PAGES}
    consent = pages["consent"]
    locales = conn.execute(sa.text("SELECT DISTINCT locale FROM pages")).scalars().all()
    for locale in locales:
        exists = conn.execute(
            sa.text("SELECT 1 FROM pages WHERE slug = 'consent' AND locale = :locale"), {"locale": locale}
        ).first()
        if not exists:
            conn.execute(
                sa.text(
                    "INSERT INTO pages (slug, locale, title, seo_title, seo_description, og_image_url, is_published, "
                    "sections, body_html, template) VALUES ('consent', :locale, :title, :seo_title, :seo_description, "
                    "'', true, CAST(:sections AS jsonb), :body, 'consent')"
                ),
                {
                    "locale": locale,
                    "title": consent["title"],
                    "seo_title": consent["seo_title"],
                    "seo_description": consent["seo_description"],
                    "sections": json.dumps(consent["sections"], ensure_ascii=False),
                    "body": consent["body_html"],
                },
            )
    conn.execute(
        sa.text(
            "UPDATE pages SET body_html = :body, updated_at = now() WHERE slug = 'privacy' AND body_html LIKE :old"
        ),
        {"body": pages["privacy"]["body_html"], "old": f"%{OLD_PRIVACY_MARKER}%"},
    )


def upgrade() -> None:
    op.add_column("leads", sa.Column("consent_at", sa.DateTime(timezone=True), nullable=True))
    op.add_column("leads", sa.Column("consent_document", sa.String(255), nullable=False, server_default=""))
    conn = op.get_bind()
    _refresh_settings(conn)
    _pages(conn)


def downgrade() -> None:
    op.drop_column("leads", "consent_document")
    op.drop_column("leads", "consent_at")
