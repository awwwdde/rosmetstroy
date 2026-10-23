"""Обновление стартового контента: юрлицо, политика, партнёрская студия, страница IT-решений

Контент живёт в базе, поэтому правки стартовых текстов сами по себе не попадают на уже
развёрнутый сайт. Миграция переносит их, но меняет только то, что осталось в исходном виде:
всё, что отредактировано в CMS, не трогается.

Revision ID: 0005
Revises: 0004
"""

import json

import sqlalchemy as sa

from alembic import op
from app import seed_data as data

revision = "0005"
down_revision = "0004"
branch_labels = None
depends_on = None

OLD_LEGAL_NAME = "ООО «Росметстрой»"
OLD_FULL_NAME = "Общество с ограниченной ответственностью «Росметстрой»"
OLD_IT_SUMMARY = "Разработка сайтов и веб-сервисов и техническое сопровождение через партнёрскую студию разработки."
# Признаки исходных версий политики: черновик из первого наполнения и вариант с ИП
OLD_PRIVACY_MARKERS = ("Текст политики требует проверки юристом", "ООО «Росметстрой»", "ИП Кузьмин")

SERVICE_FIELDS = (
    "subtitle",
    "summary",
    "description",
    "tasks",
    "hero_badges",
    "uses_title",
    "uses_text",
    "uses",
    "scope",
    "stages",
    "execution_note",
    "limitations",
    "cta_title",
    "cta_text",
)
JSON_FIELDS = {"tasks", "hero_badges", "uses", "scope", "stages", "limitations"}


def _refresh_settings(conn: sa.Connection) -> None:
    rows = conn.execute(sa.text("SELECT id, value FROM site_settings WHERE key = 'site'")).mappings().all()
    seed_partner = data.SITE_SETTINGS["partner"]
    for row in rows:
        value = dict(row["value"])
        changed = False
        if value.get("legal_name") == OLD_LEGAL_NAME:
            value["legal_name"] = data.SITE_SETTINGS["legal_name"]
            changed = True
        requisites = value.get("requisites") or []
        for item in requisites:
            if item.get("v") == OLD_FULL_NAME:
                item["v"] = OLD_FULL_NAME.replace("«Росметстрой»", "«Комплексные решения»")
                changed = True
        partner = value.get("partner") or {}
        # Описание студии дописываем, только если его ещё нет; название и ссылку, заданные в CMS, сохраняем
        if not partner.get("about"):
            value["partner"] = {**seed_partner, **{k: v for k, v in partner.items() if v}}
            changed = True
        if changed:
            conn.execute(
                sa.text("UPDATE site_settings SET value = CAST(:value AS jsonb) WHERE id = :id"),
                {"value": json.dumps(value, ensure_ascii=False), "id": row["id"]},
            )


def _refresh_privacy(conn: sa.Connection) -> None:
    page = next(p for p in data.PAGES if p["slug"] == "privacy")
    rows = conn.execute(sa.text("SELECT id, body_html FROM pages WHERE slug = 'privacy'")).mappings().all()
    for row in rows:
        body = row["body_html"] or ""
        if any(marker in body for marker in OLD_PRIVACY_MARKERS):
            conn.execute(
                sa.text(
                    "UPDATE pages SET body_html = :body, seo_description = :seo, updated_at = now() WHERE id = :id"
                ),
                {"body": page["body_html"], "seo": page["seo_description"], "id": row["id"]},
            )


def _refresh_it_service(conn: sa.Connection) -> None:
    raw = next(s for s in data.SERVICES if s["slug"] == "it-resheniya")
    rows = (
        conn.execute(
            sa.text("SELECT id, locale FROM services WHERE slug = 'it-resheniya' AND summary = :old"),
            {"old": OLD_IT_SUMMARY},
        )
        .mappings()
        .all()
    )
    for row in rows:
        params: dict[str, object] = {"id": row["id"]}
        assignments = []
        for field in SERVICE_FIELDS:
            if field in JSON_FIELDS:
                assignments.append(f"{field} = CAST(:{field} AS jsonb)")
                params[field] = json.dumps(raw[field], ensure_ascii=False)
            else:
                assignments.append(f"{field} = :{field}")
                params[field] = raw[field]
        # Имена колонок — из постоянного списка SERVICE_FIELDS, значения передаются параметрами
        query = f"UPDATE services SET {', '.join(assignments)}, updated_at = now() WHERE id = :id"  # noqa: S608
        conn.execute(sa.text(query), params)

        conn.execute(sa.text("DELETE FROM faq_items WHERE service_id = :id"), {"id": row["id"]})
        for order, (question, answer) in enumerate(raw["faq"]):
            conn.execute(
                sa.text(
                    "INSERT INTO faq_items (locale, question, answer, sort_order, is_published, service_id) "
                    "VALUES (:locale, :q, :a, :order, true, :id)"
                ),
                {"locale": row["locale"], "q": question, "a": answer, "order": order, "id": row["id"]},
            )


def upgrade() -> None:
    conn = op.get_bind()
    _refresh_settings(conn)
    _refresh_privacy(conn)
    _refresh_it_service(conn)


def downgrade() -> None:
    # Данные не откатываются: прежние стартовые тексты не нужны
    pass
