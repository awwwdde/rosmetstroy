"""Хранилище файлов: локальная файловая система, S3-совместимый бакет или PostgreSQL.

Публичные медиа доступны по URL, приватные файлы (вложения заявок)
отдаются только через авторизованный эндпоинт админки.
"""

import asyncio
import uuid
from datetime import UTC, datetime
from pathlib import Path
from typing import Protocol

from sqlalchemy import delete as sa_delete
from sqlalchemy import select

from app.core.config import settings
from app.db.session import SessionLocal
from app.models.stored_file import StoredFile


class Storage(Protocol):
    async def save(self, key: str, data: bytes, content_type: str, *, private: bool) -> None: ...
    async def read(self, key: str, *, private: bool) -> bytes: ...
    async def delete(self, key: str, *, private: bool) -> None: ...
    def public_url(self, key: str) -> str: ...


def make_key(prefix: str, extension: str) -> str:
    now = datetime.now(UTC)
    return f"{prefix}/{now:%Y/%m}/{uuid.uuid4().hex}{extension}"


class LocalStorage:
    def __init__(self, public_root: Path, private_root: Path, url_prefix: str) -> None:
        self.public_root = public_root
        self.private_root = private_root
        self.url_prefix = url_prefix.rstrip("/")

    def _path(self, key: str, private: bool) -> Path:
        root = (self.private_root if private else self.public_root).resolve()
        path = (root / key).resolve()
        if not path.is_relative_to(root):
            raise ValueError("Недопустимый путь")
        return path

    async def save(self, key: str, data: bytes, content_type: str, *, private: bool) -> None:
        path = self._path(key, private)

        def write() -> None:
            path.parent.mkdir(parents=True, exist_ok=True)
            path.write_bytes(data)

        await asyncio.to_thread(write)

    async def read(self, key: str, *, private: bool) -> bytes:
        return await asyncio.to_thread(self._path(key, private).read_bytes)

    async def delete(self, key: str, *, private: bool) -> None:
        await asyncio.to_thread(self._path(key, private).unlink, True)

    def public_url(self, key: str) -> str:
        return f"{self.url_prefix}/{key}"


class S3Storage:
    def __init__(self) -> None:
        import boto3

        self.bucket = settings.s3_bucket
        self.client = boto3.client(
            "s3",
            endpoint_url=settings.s3_endpoint_url or None,
            region_name=settings.s3_region or None,
            aws_access_key_id=settings.s3_access_key or None,
            aws_secret_access_key=settings.s3_secret_key or None,
        )

    @staticmethod
    def _key(key: str, private: bool) -> str:
        return f"{'private' if private else 'public'}/{key}"

    async def save(self, key: str, data: bytes, content_type: str, *, private: bool) -> None:
        await asyncio.to_thread(
            self.client.put_object,
            Bucket=self.bucket,
            Key=self._key(key, private),
            Body=data,
            ContentType=content_type,
        )

    async def read(self, key: str, *, private: bool) -> bytes:
        obj = await asyncio.to_thread(self.client.get_object, Bucket=self.bucket, Key=self._key(key, private))
        return obj["Body"].read()

    async def delete(self, key: str, *, private: bool) -> None:
        await asyncio.to_thread(self.client.delete_object, Bucket=self.bucket, Key=self._key(key, private))

    def public_url(self, key: str) -> str:
        return f"{settings.s3_public_url.rstrip('/')}/public/{key}"


class DatabaseStorage:
    """Файлы в таблице stored_files. Для платформ, где диск контейнера стирается
    при каждом деплое и сохраняется только база. Публичные файлы отдаёт /media/{key}."""

    def __init__(self, url_prefix: str) -> None:
        self.url_prefix = url_prefix.rstrip("/")

    async def save(self, key: str, data: bytes, content_type: str, *, private: bool) -> None:
        async with SessionLocal() as db:
            await db.merge(StoredFile(key=key, private=private, content_type=content_type, data=data))
            await db.commit()

    async def read(self, key: str, *, private: bool) -> bytes:
        async with SessionLocal() as db:
            data = await db.scalar(
                select(StoredFile.data).where(StoredFile.key == key, StoredFile.private.is_(private))
            )
        if data is None:
            raise FileNotFoundError(key)
        return data

    async def delete(self, key: str, *, private: bool) -> None:
        async with SessionLocal() as db:
            await db.execute(sa_delete(StoredFile).where(StoredFile.key == key, StoredFile.private.is_(private)))
            await db.commit()

    def public_url(self, key: str) -> str:
        return f"{self.url_prefix}/{key}"


_storage: Storage | None = None


def get_storage() -> Storage:
    global _storage
    if _storage is None:
        if settings.storage_backend == "s3":
            _storage = S3Storage()
        elif settings.storage_backend == "db":
            _storage = DatabaseStorage(settings.media_url_prefix)
        else:
            _storage = LocalStorage(settings.media_root, settings.private_root, settings.media_url_prefix)
    return _storage
