from fastapi import APIRouter
from fastapi.responses import PlainTextResponse
from sqlalchemy import text

from app.api.deps import DB
from app.api.v1 import admin, articles, auth, categories, faq, leads, media, pages, projects, services, settings
from app.services.indexnow import indexnow_key

api_router = APIRouter(prefix="/api/v1")


@api_router.get("/health", tags=["health"])
async def health(db: DB) -> dict[str, str]:
    await db.execute(text("SELECT 1"))
    return {"status": "ok"}


@api_router.get("/indexnow-key", tags=["seo"], response_class=PlainTextResponse)
async def indexnow_key_file() -> str:
    """Содержимое /indexnow-key.txt — подтверждение владения сайтом для IndexNow."""
    return indexnow_key()


api_router.include_router(auth.router)
for module in (pages, services, projects, articles, categories, faq, leads, settings):
    api_router.include_router(module.router)

admin_router = APIRouter(prefix="/admin")
admin_router.include_router(admin.router)
for module in (pages, services, projects, articles, categories, faq, leads, settings, media):
    admin_router.include_router(module.admin_router)
api_router.include_router(admin_router)
