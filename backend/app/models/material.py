import uuid
from datetime import datetime
from sqlalchemy import Boolean, DateTime, ForeignKey, String, func
from sqlalchemy.orm import Mapped, mapped_column, relationship
from app.db.base import Base
from app.utils.enums import MaterialType


class Material(Base):
    __tablename__ = "library_materials"

    id: Mapped[str] = mapped_column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    title: Mapped[str] = mapped_column(String, nullable=False)
    description: Mapped[str | None] = mapped_column(String, nullable=True)
    thumbnail_url: Mapped[str | None] = mapped_column(String, nullable=True)
    file_url: Mapped[str | None] = mapped_column(String, nullable=True)
    material_type: Mapped[str] = mapped_column(String, default=MaterialType.document, nullable=False)
    subject: Mapped[str | None] = mapped_column(String, nullable=True)
    grade: Mapped[str | None] = mapped_column(String, nullable=True)
    is_system: Mapped[bool] = mapped_column(Boolean, default=False)
    created_by: Mapped[str] = mapped_column(String, ForeignKey("users.id"), nullable=False)
    created_at: Mapped[datetime] = mapped_column(DateTime, server_default=func.now())

    creator: Mapped["User"] = relationship("User", back_populates="materials")
    class_materials: Mapped[list["ClassMaterial"]] = relationship("ClassMaterial", back_populates="material", cascade="all, delete-orphan")
