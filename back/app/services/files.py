"""Проверка загружаемых файлов по сигнатуре содержимого, а не только по расширению."""

import io
from dataclasses import dataclass
from pathlib import PurePath

from PIL import Image, UnidentifiedImageError

Image.MAX_IMAGE_PIXELS = 60_000_000


class FileRejected(ValueError):
    pass


@dataclass(frozen=True)
class FileType:
    extension: str
    mime: str


def _is_dxf(head: bytes) -> bool:
    text = head[:256].decode("ascii", errors="ignore").lstrip()
    return text.startswith("0") and "SECTION" in text[:64]


def _is_dwg(head: bytes) -> bool:
    return head[:4] == b"AC10" or head[:4] == b"AC20" or head[:4] == b"AC40"


LEAD_TYPES: dict[str, FileType] = {
    ".pdf": FileType(".pdf", "application/pdf"),
    ".dwg": FileType(".dwg", "image/vnd.dwg"),
    ".dxf": FileType(".dxf", "image/vnd.dxf"),
    ".jpg": FileType(".jpg", "image/jpeg"),
    ".jpeg": FileType(".jpg", "image/jpeg"),
    ".png": FileType(".png", "image/png"),
    ".zip": FileType(".zip", "application/zip"),
}

IMAGE_TYPES: dict[str, str] = {
    "JPEG": "image/jpeg",
    "PNG": "image/png",
    "WEBP": "image/webp",
    "GIF": "image/gif",
}


def _signature_ok(ext: str, head: bytes) -> bool:
    match ext:
        case ".pdf":
            return head.startswith(b"%PDF-")
        case ".png":
            return head.startswith(b"\x89PNG\r\n\x1a\n")
        case ".jpg" | ".jpeg":
            return head.startswith(b"\xff\xd8\xff")
        case ".zip":
            return head.startswith(b"PK\x03\x04") or head.startswith(b"PK\x05\x06")
        case ".dwg":
            return _is_dwg(head)
        case ".dxf":
            return _is_dxf(head)
    return False


def safe_filename(name: str) -> str:
    base = PurePath(name.replace("\\", "/")).name
    cleaned = "".join(ch for ch in base if ch.isprintable() and ch not in '<>:"/\\|?*')
    return cleaned.strip()[:200] or "file"


def validate_lead_file(name: str, data: bytes, max_bytes: int) -> FileType:
    ext = PurePath(name.lower()).suffix
    file_type = LEAD_TYPES.get(ext)
    if file_type is None:
        raise FileRejected(f"Формат файла «{safe_filename(name)}» не поддерживается")
    if len(data) == 0:
        raise FileRejected(f"Файл «{safe_filename(name)}» пустой")
    if len(data) > max_bytes:
        raise FileRejected(f"Файл «{safe_filename(name)}» больше {max_bytes // 1048576} МБ")
    if not _signature_ok(ext, data[:512]):
        raise FileRejected(f"Содержимое файла «{safe_filename(name)}» не соответствует формату")
    return file_type


@dataclass(frozen=True)
class ImageInfo:
    mime: str
    extension: str
    width: int
    height: int


def inspect_image(data: bytes) -> ImageInfo:
    try:
        with Image.open(io.BytesIO(data)) as img:
            img.verify()
        with Image.open(io.BytesIO(data)) as img:
            fmt = img.format or ""
            width, height = img.size
    except (UnidentifiedImageError, OSError, Image.DecompressionBombError) as exc:
        raise FileRejected("Файл не является изображением") from exc
    mime = IMAGE_TYPES.get(fmt)
    if mime is None:
        raise FileRejected("Поддерживаются JPEG, PNG, WebP и GIF")
    ext = {"JPEG": ".jpg", "PNG": ".png", "WEBP": ".webp", "GIF": ".gif"}[fmt]
    return ImageInfo(mime=mime, extension=ext, width=width, height=height)
