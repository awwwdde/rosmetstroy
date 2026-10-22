from datetime import datetime

from sqlalchemy import Boolean, DateTime, LargeBinary, String, func
from sqlalchemy.orm import Mapped, mapped_column

from app.db.base import Base


class StoredFile(Base):
    """Содержимое файла для STORAGE_BACKEND=db — когда кроме PostgreSQL сохранять данные негде."""

    __tablename__ = "stored_files"

    key: Mapped[str] = mapped_column(String(512), primary_key=True)
    private: Mapped[bool] = mapped_column(Boolean, primary_key=True)
    content_type: Mapped[str] = mapped_column(String(100))
    data: Mapped[bytes] = mapped_column(LargeBinary)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
