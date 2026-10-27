import asyncio
import contextlib
import logging
from collections.abc import AsyncIterator

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from fastapi.staticfiles import StaticFiles
from sqlalchemy.exc import DBAPIError, IntegrityError
from starlette.requests import Request
from starlette.responses import Response

from app.api.v1.router import api_router
from app.core.config import settings
from app.db.session import SessionLocal
from app.models.stored_file import StoredFile
from app.services.retention import retention_loop

logging.basicConfig(level=logging.DEBUG if settings.debug else logging.INFO)

if settings.is_production and settings.secret_key.startswith("dev-"):
    raise RuntimeError("SECRET_KEY должен быть задан в production")


@contextlib.asynccontextmanager
async def lifespan(_: FastAPI) -> AsyncIterator[None]:
    # Ежедневное удаление заявок с истёкшим сроком хранения (в тестах не запускается)
    task = None if settings.environment == "test" else asyncio.create_task(retention_loop())
    yield
    if task:
        task.cancel()
        with contextlib.suppress(asyncio.CancelledError):
            await task


app = FastAPI(
    lifespan=lifespan,
    title="Росметстрой API",
    version="1.0.0",
    openapi_url="/api/v1/openapi.json",
    docs_url=None if settings.is_production else "/api/docs",
    redoc_url=None,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins,
    allow_credentials=True,
    allow_methods=["GET", "POST", "PUT", "PATCH", "DELETE"],
    allow_headers=["Content-Type", "X-CSRF-Token"],
)


@app.middleware("http")
async def security_headers(request: Request, call_next) -> Response:  # type: ignore[no-untyped-def]
    response: Response = await call_next(request)
    response.headers.setdefault("X-Content-Type-Options", "nosniff")
    response.headers.setdefault("Referrer-Policy", "strict-origin-when-cross-origin")
    if request.url.path.startswith("/api/v1/admin") or request.url.path.startswith("/api/v1/auth"):
        response.headers["Cache-Control"] = "no-store"
    return response


@app.exception_handler(IntegrityError)
async def integrity_error(_: Request, __: IntegrityError) -> JSONResponse:
    # Нарушение уникальности (slug, e-mail) при flush до явного commit
    return JSONResponse(status_code=409, content={"detail": "Запись с такими данными уже существует"})


@app.exception_handler(DBAPIError)
async def database_error(_: Request, exc: DBAPIError) -> JSONResponse:
    # Данные, которые PostgreSQL не принимает (например, NUL в JSON), — ошибка ввода, а не сбой сервера
    # SQLSTATE класса 22 — data exception
    code = str(getattr(exc.orig, "sqlstate", None) or getattr(exc.orig, "pgcode", None) or "")
    if code.startswith("22"):
        return JSONResponse(status_code=422, content={"detail": "Недопустимые символы в данных"})
    logging.getLogger(__name__).exception("Ошибка базы данных")
    return JSONResponse(status_code=503, content={"detail": "База данных временно недоступна"})


app.include_router(api_router)


async def stored_media(key: str) -> Response:
    async with SessionLocal() as db:
        row = await db.get(StoredFile, (key, False))
    if row is None:
        return JSONResponse(status_code=404, content={"detail": "Файл не найден"})
    # Ключи уникальны (uuid), содержимое по ключу не меняется — можно кэшировать навсегда
    return Response(
        content=row.data,
        media_type=row.content_type,
        headers={"Cache-Control": "public, max-age=31536000, immutable"},
    )


# Медиа: из volume (local), из PostgreSQL (db) или напрямую из бакета (s3)
if settings.storage_backend == "db":
    app.add_api_route(
        f"{settings.media_url_prefix}/{{key:path}}", stored_media, methods=["GET"], include_in_schema=False
    )
elif settings.storage_backend == "local":
    settings.media_root.mkdir(parents=True, exist_ok=True)
    app.mount(settings.media_url_prefix, StaticFiles(directory=settings.media_root), name="media")
