from pathlib import PurePath
from typing import Annotated, Literal

from fastapi import APIRouter, File, HTTPException, Query, Request, UploadFile, status

from app.api.deps import DB, EditorUser, Paging, audit
from app.api.utils import not_found
from app.core.config import settings
from app.models import Media
from app.repositories.content import MediaRepository
from app.schemas.common import MediaOut, MediaUpdate, Paginated
from app.services.files import FileRejected, inspect_image, safe_filename
from app.services.storage import get_storage, make_key

admin_router = APIRouter(prefix="/media", tags=["admin:media"])


async def _read_limited(upload: UploadFile, max_bytes: int) -> bytes:
    data = await upload.read(max_bytes + 1)
    if len(data) > max_bytes:
        raise HTTPException(status.HTTP_413_CONTENT_TOO_LARGE, f"Файл больше {max_bytes // 1048576} МБ")
    return data


@admin_router.get("", response_model=Paginated[MediaOut])
async def list_media(
    db: DB,
    _: EditorUser,
    paging: Paging,
    kind: Literal["image", "document"] | None = None,
    q: Annotated[str | None, Query(max_length=100)] = None,
) -> Paginated[MediaOut]:
    repo = MediaRepository(db)
    items, total = await repo.paginate(
        repo.filtered(kind=kind, q=q), page=paging.page, page_size=paging.page_size, sort=paging.sort
    )
    return Paginated(
        items=[MediaOut.model_validate(m) for m in items], total=total, page=paging.page, page_size=paging.page_size
    )


@admin_router.post("", response_model=MediaOut, status_code=status.HTTP_201_CREATED)
async def upload_media(
    request: Request,
    db: DB,
    user: EditorUser,
    file: Annotated[UploadFile, File()],
    alt: Annotated[str, Query(max_length=500)] = "",
) -> MediaOut:
    data = await _read_limited(file, settings.media_max_file_mb * 1048576)
    name = safe_filename(file.filename or "file")
    width = height = None
    if PurePath(name.lower()).suffix == ".pdf":
        if not data.startswith(b"%PDF-"):
            raise HTTPException(status.HTTP_422_UNPROCESSABLE_CONTENT, "Файл не является PDF")
        kind, mime, ext = "document", "application/pdf", ".pdf"
    else:
        try:
            info = inspect_image(data)
        except FileRejected as exc:
            raise HTTPException(status.HTTP_422_UNPROCESSABLE_CONTENT, str(exc)) from exc
        kind, mime, ext, width, height = "image", info.mime, info.extension, info.width, info.height

    storage = get_storage()
    key = make_key("uploads", ext)
    await storage.save(key, data, mime, private=False)
    media = await MediaRepository(db).add(
        Media(
            storage_key=key,
            url=storage.public_url(key),
            original_name=name,
            mime_type=mime,
            size=len(data),
            width=width,
            height=height,
            alt=alt,
            kind=kind,
            created_by_id=user.id,
        )
    )
    await audit(db, request, user, "upload", "media", media.id, name=name)
    await db.commit()
    await db.refresh(media)
    return MediaOut.model_validate(media)


@admin_router.patch("/{media_id}", response_model=MediaOut)
async def update_media(media_id: int, data: MediaUpdate, db: DB, _: EditorUser) -> MediaOut:
    media = await MediaRepository(db).get(media_id)
    if media is None:
        raise not_found("Файл")
    media.alt = data.alt
    await db.commit()
    await db.refresh(media)
    return MediaOut.model_validate(media)


@admin_router.delete("/{media_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_media(media_id: int, request: Request, db: DB, user: EditorUser) -> None:
    repo = MediaRepository(db)
    media = await repo.get(media_id)
    if media is None:
        raise not_found("Файл")
    await audit(db, request, user, "delete", "media", media.id, name=media.original_name)
    await repo.delete(media)
    await db.commit()
    await get_storage().delete(media.storage_key, private=False)
