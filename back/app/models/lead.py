from datetime import datetime
from enum import StrEnum

from sqlalchemy import DateTime, ForeignKey, Integer, String, Text, func
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base, TimestampMixin
from app.models.user import User


class LeadStatus(StrEnum):
    new = "new"
    in_progress = "in_progress"
    quoted = "quoted"
    done = "done"
    rejected = "rejected"
    spam = "spam"


class Lead(TimestampMixin, Base):
    __tablename__ = "leads"

    id: Mapped[int] = mapped_column(primary_key=True)
    name: Mapped[str] = mapped_column(String(255))
    company: Mapped[str] = mapped_column(String(255), default="")
    phone: Mapped[str] = mapped_column(String(50), default="")
    email: Mapped[str] = mapped_column(String(255), default="")
    service_id: Mapped[int | None] = mapped_column(ForeignKey("services.id", ondelete="SET NULL"))
    service_label: Mapped[str] = mapped_column(String(255), default="")
    description: Mapped[str] = mapped_column(Text, default="")
    status: Mapped[str] = mapped_column(String(20), default=LeadStatus.new, index=True)
    source_page: Mapped[str] = mapped_column(String(500), default="")
    ip: Mapped[str] = mapped_column(String(64), default="")
    user_agent: Mapped[str] = mapped_column(String(512), default="")
    # Подтверждение согласия на обработку ПД (152-ФЗ): когда и на какую редакцию документа
    consent_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    consent_document: Mapped[str] = mapped_column(String(255), default="")

    files: Mapped[list["LeadFile"]] = relationship(back_populates="lead", cascade="all, delete-orphan", lazy="selectin")
    comments: Mapped[list["LeadComment"]] = relationship(
        back_populates="lead",
        cascade="all, delete-orphan",
        lazy="selectin",
        order_by="LeadComment.created_at",
    )

    @property
    def number(self) -> str:
        return f"RMS-{self.id:05d}"

    @property
    def files_count(self) -> int:
        return len(self.files)


class LeadFile(Base):
    __tablename__ = "lead_files"

    id: Mapped[int] = mapped_column(primary_key=True)
    lead_id: Mapped[int] = mapped_column(ForeignKey("leads.id", ondelete="CASCADE"), index=True)
    original_name: Mapped[str] = mapped_column(String(255))
    storage_key: Mapped[str] = mapped_column(String(512))
    mime_type: Mapped[str] = mapped_column(String(100))
    size: Mapped[int] = mapped_column(Integer)

    lead: Mapped[Lead] = relationship(back_populates="files")


class LeadComment(Base):
    __tablename__ = "lead_comments"

    id: Mapped[int] = mapped_column(primary_key=True)
    lead_id: Mapped[int] = mapped_column(ForeignKey("leads.id", ondelete="CASCADE"), index=True)
    author_id: Mapped[int | None] = mapped_column(ForeignKey("users.id", ondelete="SET NULL"))
    body: Mapped[str] = mapped_column(Text)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())

    lead: Mapped[Lead] = relationship(back_populates="comments")
    author: Mapped[User | None] = relationship(lazy="joined")
