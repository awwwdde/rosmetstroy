"""После изменений контента в CMS: инвалидация кэша Next.js и уведомление поисковиков."""

import logging

import httpx

from app.core.config import settings
from app.services import indexnow

log = logging.getLogger(__name__)


async def revalidate_tags(*tags: str) -> None:
    await _revalidate_frontend(*tags)
    # Поисковик должен получить уже обновлённую страницу, поэтому — после сброса кэша
    await indexnow.submit_tags(*tags)


async def _revalidate_frontend(*tags: str) -> None:
    if not settings.revalidate_secret or not tags:
        return
    url = f"{settings.frontend_internal_url.rstrip('/')}/api/revalidate"
    try:
        async with httpx.AsyncClient(timeout=5) as client:
            await client.post(
                url,
                json={"tags": list(tags)},
                headers={"x-revalidate-secret": settings.revalidate_secret},
            )
    except httpx.HTTPError:
        log.warning("Не удалось инвалидировать кэш фронтенда: %s", tags)
