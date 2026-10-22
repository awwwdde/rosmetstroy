"""IndexNow: мгновенное уведомление Яндекса и Bing об изменённых страницах.

Ключ выводится из SECRET_KEY (стабилен между деплоями) и публикуется сайтом по адресу
/indexnow-key.txt — так поисковик проверяет, что уведомление пришло от владельца сайта.
"""

import hashlib
import logging
import time
from urllib.parse import urlsplit

import httpx
from sqlalchemy import select

from app.core.config import settings
from app.db.session import SessionLocal
from app.models import Article, ArticleStatus, Page, Project, Service

log = logging.getLogger(__name__)

ENDPOINT = "https://yandex.com/indexnow"
KEY_PATH = "/indexnow-key.txt"
# Повторная отправка того же набора адресов чаще этого интервала бессмысленна
_DEDUP_SECONDS = 60
_recent: dict[frozenset[str], float] = {}

STATIC_BY_TAG: dict[str, tuple[str, ...]] = {
    "pages": ("/", "/about", "/metalwork", "/services", "/projects", "/blog", "/faq", "/contacts", "/privacy"),
    "services": ("/services",),
    "projects": ("/", "/projects"),
    "articles": ("/blog",),
    "faq": ("/faq",),
    "settings": ("/",),
}


def indexnow_key() -> str:
    return hashlib.sha256(f"{settings.secret_key}:indexnow".encode()).hexdigest()[:32]


def enabled() -> bool:
    # Только боевой сайт с публичным https-адресом: локальные и тестовые адреса поисковикам не нужны
    host = urlsplit(settings.site_url).hostname or ""
    return (
        settings.is_production
        and settings.indexnow_enabled
        and settings.site_url.startswith("https://")
        and host not in {"localhost", "127.0.0.1"}
    )


async def paths_for_tags(tags: tuple[str, ...]) -> list[str]:
    paths: set[str] = set()
    for tag in tags:
        paths.update(STATIC_BY_TAG.get(tag, ()))
    async with SessionLocal() as db:
        if "services" in tags or "faq" in tags:
            slugs = await db.scalars(select(Service.slug).where(Service.is_published.is_(True)))
            paths.update(f"/services/{s}" for s in slugs)
        if "projects" in tags:
            slugs = await db.scalars(select(Project.slug).where(Project.is_published.is_(True)))
            paths.update(f"/projects/{s}" for s in slugs)
        if "articles" in tags:
            slugs = await db.scalars(select(Article.slug).where(Article.status == ArticleStatus.published))
            paths.update(f"/blog/{s}" for s in slugs)
        if "pages" in tags:
            slugs = await db.scalars(select(Page.slug).where(Page.template == "custom", Page.is_published.is_(True)))
            paths.update(f"/{s}" for s in slugs)
    return sorted(paths)


async def submit_tags(*tags: str) -> None:
    if not tags or not enabled():
        return
    site = settings.site_url.rstrip("/")
    urls = [f"{site}{path}" for path in await paths_for_tags(tags)]
    if not urls:
        return
    batch = frozenset(urls)
    now = time.monotonic()
    if now - _recent.get(batch, 0) < _DEDUP_SECONDS:
        return
    _recent[batch] = now
    payload = {
        "host": urlsplit(site).hostname,
        "key": indexnow_key(),
        "keyLocation": f"{site}{KEY_PATH}",
        "urlList": urls[:10000],
    }
    try:
        async with httpx.AsyncClient(timeout=10) as client:
            response = await client.post(ENDPOINT, json=payload)
        if response.status_code >= 400:
            log.warning("IndexNow ответил %s: %s", response.status_code, response.text[:200])
    except httpx.HTTPError:
        log.warning("IndexNow недоступен, %d адресов не отправлено", len(urls))
