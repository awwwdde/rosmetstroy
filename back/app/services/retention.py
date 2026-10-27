"""Удаление заявок по истечении срока хранения персональных данных (152-ФЗ, ст. 5 ч. 7, ст. 21 ч. 4).

Срок задаётся LEAD_RETENTION_DAYS (по умолчанию 3 года, 0 — не удалять) и указан в согласии
на обработку данных. Проверка выполняется раз в сутки внутри процесса backend.
"""

import asyncio
import logging
from datetime import UTC, datetime, timedelta

from sqlalchemy import select

from app.core.config import settings
from app.db.session import SessionLocal
from app.models import Lead
from app.services.storage import get_storage

log = logging.getLogger(__name__)

CHECK_INTERVAL_SECONDS = 24 * 3600


async def purge_expired_leads() -> int:
    if settings.lead_retention_days <= 0:
        return 0
    cutoff = datetime.now(UTC) - timedelta(days=settings.lead_retention_days)
    async with SessionLocal() as db:
        leads = list(await db.scalars(select(Lead).where(Lead.created_at < cutoff)))
        keys = [f.storage_key for lead in leads for f in lead.files]
        for lead in leads:
            await db.delete(lead)
        await db.commit()
    storage = get_storage()
    for key in keys:
        try:
            await storage.delete(key, private=True)
        except Exception:
            log.exception("Не удалось удалить файл заявки %s", key)
    if leads:
        log.info("Удалено заявок с истёкшим сроком хранения: %d", len(leads))
    return len(leads)


async def retention_loop() -> None:
    while True:
        try:
            await purge_expired_leads()
        except Exception:
            log.exception("Ошибка при удалении заявок с истёкшим сроком хранения")
        await asyncio.sleep(CHECK_INTERVAL_SECONDS)
