import time
from datetime import datetime
from typing import Annotated
from urllib.parse import quote

from fastapi import (
    APIRouter,
    BackgroundTasks,
    Depends,
    File,
    Form,
    HTTPException,
    Query,
    Request,
    UploadFile,
    status,
)
from fastapi.responses import Response
from pydantic import Field

from app.api.deps import DB, EditorUser, Paging, audit
from app.api.utils import not_found
from app.core.config import settings
from app.core.rate_limit import client_ip, rate_limit
from app.core.security import sign, unsign
from app.models import Lead, LeadComment, LeadFile
from app.repositories.content import ServiceRepository
from app.repositories.lead import LeadRepository
from app.schemas.common import Paginated, Schema
from app.schemas.lead import (
    LeadCommentIn,
    LeadCommentOut,
    LeadCreate,
    LeadCreated,
    LeadListItem,
    LeadOut,
    LeadStatusLiteral,
    LeadStatusUpdate,
)
from app.services.files import FileRejected, safe_filename, validate_lead_file
from app.services.notifications import notify_new_lead
from app.services.storage import get_storage, make_key

router = APIRouter(prefix="/leads", tags=["leads"])
admin_router = APIRouter(prefix="/leads", tags=["admin:leads"])

FORM_TOKEN_MAX_AGE = 4 * 3600


class FormToken(Schema):
    token: str


class LeadForm(LeadCreate):
    # Поле-ловушка: скрыто от людей, заполняется ботами
    website: str = Field(default="", max_length=200)
    form_token: str = Field(min_length=1, max_length=200)


@router.get("/token", response_model=FormToken)
async def form_token() -> FormToken:
    return FormToken(token=sign(str(int(time.time())), settings.secret_key))


def _check_antispam(form: LeadForm) -> None:
    issued = unsign(form.form_token, settings.secret_key)
    if issued is None or not issued.isdigit():
        raise HTTPException(status.HTTP_400_BAD_REQUEST, "Форма устарела. Обновите страницу и попробуйте снова.")
    age = time.time() - int(issued)
    if age < settings.lead_min_fill_seconds or age > FORM_TOKEN_MAX_AGE or form.website:
        raise HTTPException(status.HTTP_400_BAD_REQUEST, "Заявка отклонена антиспам-фильтром. Позвоните нам.")


@router.post(
    "",
    response_model=LeadCreated,
    status_code=status.HTTP_201_CREATED,
    dependencies=[Depends(rate_limit("lead", 5, 600))],
)
async def create_lead(
    form: Annotated[LeadForm, Form()],
    request: Request,
    tasks: BackgroundTasks,
    db: DB,
    files: Annotated[list[UploadFile] | None, File()] = None,
) -> LeadCreated:
    _check_antispam(form)
    uploads = [f for f in files or [] if f.filename]
    if len(uploads) > settings.lead_max_files:
        raise HTTPException(status.HTTP_422_UNPROCESSABLE_CONTENT, f"Не больше {settings.lead_max_files} файлов")

    max_bytes = settings.lead_max_file_mb * 1048576
    prepared: list[tuple[str, bytes, str, str]] = []
    for upload in uploads:
        data = await upload.read(max_bytes + 1)
        try:
            file_type = validate_lead_file(upload.filename or "", data, max_bytes)
        except FileRejected as exc:
            raise HTTPException(status.HTTP_422_UNPROCESSABLE_CONTENT, str(exc)) from exc
        prepared.append((safe_filename(upload.filename or "file"), data, file_type.mime, file_type.extension))

    service_label = form.service_label
    service_id = None
    if form.service_id is not None:
        service = await ServiceRepository(db).get(form.service_id)
        if service is not None:
            service_id, service_label = service.id, service.title

    lead = Lead(
        files=[],
        **form.model_dump(exclude={"website", "form_token", "service_id", "service_label", "email"}),
        email=str(form.email),
        service_id=service_id,
        service_label=service_label,
        ip=client_ip(request),
        user_agent=request.headers.get("user-agent", "")[:512],
    )
    db.add(lead)
    await db.flush()

    storage = get_storage()
    saved: list[str] = []
    try:
        for name, data, mime, ext in prepared:
            key = make_key(f"leads/{lead.id}", ext)
            await storage.save(key, data, mime, private=True)
            saved.append(key)
            lead.files.append(LeadFile(original_name=name, storage_key=key, mime_type=mime, size=len(data)))
        await db.commit()
    except Exception:
        await db.rollback()
        for key in saved:
            await storage.delete(key, private=True)
        raise

    tasks.add_task(
        notify_new_lead,
        {
            "id": str(lead.id),
            "number": lead.number,
            "name": lead.name,
            "company": lead.company,
            "phone": lead.phone,
            "email": lead.email,
            "service": lead.service_label,
            "description": lead.description,
            "files": str(len(prepared)),
        },
    )
    return LeadCreated(id=lead.id, number=lead.number)


# ---------- Администрирование ----------


@admin_router.get("", response_model=Paginated[LeadListItem])
async def admin_list_leads(
    db: DB,
    _: EditorUser,
    paging: Paging,
    status_: Annotated[LeadStatusLiteral | None, Query(alias="status")] = None,
    q: Annotated[str | None, Query(max_length=100)] = None,
    service_id: int | None = None,
    date_from: datetime | None = None,
    date_to: datetime | None = None,
) -> Paginated[LeadListItem]:
    repo = LeadRepository(db)
    items, total = await repo.paginate(
        repo.filtered(status=status_, q=q, service_id=service_id, date_from=date_from, date_to=date_to),
        page=paging.page,
        page_size=paging.page_size,
        sort=paging.sort,
    )
    return Paginated(
        items=[LeadListItem.model_validate(x) for x in items], total=total, page=paging.page, page_size=paging.page_size
    )


async def _get_lead(db: DB, lead_id: int) -> Lead:
    lead = await LeadRepository(db).get(lead_id)
    if lead is None:
        raise not_found("Заявка")
    return lead


@admin_router.get("/{lead_id}", response_model=LeadOut)
async def admin_get_lead(lead_id: int, db: DB, _: EditorUser) -> LeadOut:
    return LeadOut.model_validate(await _get_lead(db, lead_id))


@admin_router.patch("/{lead_id}/status", response_model=LeadOut)
async def admin_set_status(lead_id: int, data: LeadStatusUpdate, request: Request, db: DB, user: EditorUser) -> LeadOut:
    lead = await _get_lead(db, lead_id)
    old = lead.status
    lead.status = data.status
    await audit(db, request, user, "status", "lead", lead.id, old=old, new=data.status)
    await db.commit()
    await db.refresh(lead)
    return LeadOut.model_validate(lead)


@admin_router.post("/{lead_id}/comments", response_model=LeadCommentOut, status_code=status.HTTP_201_CREATED)
async def admin_add_comment(
    lead_id: int, data: LeadCommentIn, request: Request, db: DB, user: EditorUser
) -> LeadCommentOut:
    lead = await _get_lead(db, lead_id)
    comment = LeadComment(lead_id=lead.id, author_id=user.id, body=data.body)
    db.add(comment)
    await audit(db, request, user, "comment", "lead", lead.id)
    await db.commit()
    await db.refresh(comment, ["author", "created_at"])
    return LeadCommentOut.model_validate(comment)


@admin_router.delete("/{lead_id}/comments/{comment_id}", status_code=status.HTTP_204_NO_CONTENT)
async def admin_delete_comment(lead_id: int, comment_id: int, request: Request, db: DB, user: EditorUser) -> None:
    lead = await _get_lead(db, lead_id)
    comment = next((c for c in lead.comments if c.id == comment_id), None)
    if comment is None:
        raise not_found("Комментарий")
    # Редактор удаляет свои комментарии, администратор — любые
    if comment.author_id != user.id and user.role != "admin":
        raise HTTPException(status.HTTP_403_FORBIDDEN, "Можно удалять только свои комментарии")
    await audit(db, request, user, "delete", "lead_comment", comment.id, lead=lead.id)
    lead.comments.remove(comment)
    await db.commit()


@admin_router.get("/{lead_id}/files/{file_id}")
async def admin_download_file(lead_id: int, file_id: int, request: Request, db: DB, user: EditorUser) -> Response:
    lead = await _get_lead(db, lead_id)
    item = next((f for f in lead.files if f.id == file_id), None)
    if item is None:
        raise not_found("Файл")
    data = await get_storage().read(item.storage_key, private=True)
    await audit(db, request, user, "download", "lead_file", item.id, lead=lead.id)
    await db.commit()
    return Response(
        content=data,
        media_type="application/octet-stream",
        headers={
            "Content-Disposition": f"attachment; filename*=UTF-8''{quote(item.original_name)}",
            "X-Content-Type-Options": "nosniff",
            "Cache-Control": "private, no-store",
        },
    )


@admin_router.delete("/{lead_id}", status_code=status.HTTP_204_NO_CONTENT)
async def admin_delete_lead(lead_id: int, request: Request, db: DB, user: EditorUser) -> None:
    lead = await _get_lead(db, lead_id)
    keys = [f.storage_key for f in lead.files]
    await audit(db, request, user, "delete", "lead", lead.id)
    await db.delete(lead)
    await db.commit()
    for key in keys:
        await get_storage().delete(key, private=True)
