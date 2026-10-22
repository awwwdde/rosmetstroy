from fastapi import APIRouter, BackgroundTasks, Request

from app.api.deps import DB, AdminUser, EditorUser, LocaleQuery, audit
from app.api.utils import not_found
from app.models import SiteSetting
from app.repositories.content import SettingRepository
from app.schemas.content import SettingOut, SettingUpdate
from app.services.revalidate import revalidate_tags

router = APIRouter(prefix="/settings", tags=["settings"])
admin_router = APIRouter(prefix="/settings", tags=["admin:settings"])

PUBLIC_KEYS = {"site"}


@router.get("/{key}", response_model=SettingOut)
async def get_setting(key: str, db: DB, locale: LocaleQuery = "ru") -> SettingOut:
    if key not in PUBLIC_KEYS:
        raise not_found("Настройка")
    setting = await SettingRepository(db).by_key(key, locale)
    if setting is None:
        raise not_found("Настройка")
    return SettingOut.model_validate(setting)


@admin_router.get("/{key}", response_model=SettingOut)
async def admin_get_setting(key: str, db: DB, _: EditorUser, locale: LocaleQuery = "ru") -> SettingOut:
    setting = await SettingRepository(db).by_key(key, locale)
    if setting is None:
        raise not_found("Настройка")
    return SettingOut.model_validate(setting)


@admin_router.put("/{key}", response_model=SettingOut)
async def admin_put_setting(
    key: str,
    data: SettingUpdate,
    request: Request,
    tasks: BackgroundTasks,
    db: DB,
    user: AdminUser,
    locale: LocaleQuery = "ru",
) -> SettingOut:
    if key not in PUBLIC_KEYS:
        raise not_found("Настройка")
    repo = SettingRepository(db)
    setting = await repo.by_key(key, locale)
    if setting is None:
        setting = await repo.add(SiteSetting(key=key, locale=locale, value=data.value))
    else:
        setting.value = data.value
    await audit(db, request, user, "update", "settings", key)
    await db.commit()
    await db.refresh(setting)
    tasks.add_task(revalidate_tags, "settings")
    return SettingOut.model_validate(setting)
