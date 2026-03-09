import uuid
from datetime import datetime
from sqlalchemy import Boolean, DateTime, ForeignKey, String, UniqueConstraint, func
from sqlalchemy.orm import Mapped, mapped_column, relationship
from app.db.base import Base
from app.utils.enums import MaterialType


class Folder(Base):
    __tablename__ = "folders"

    id: Mapped[str] = mapped_column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    name: Mapped[str] = mapped_column(String, nullable=False)
    created_by: Mapped[str] = mapped_column(String, ForeignKey("users.id"), nullable=False)
    created_at: Mapped[datetime] = mapped_column(DateTime, server_default=func.now())

    materials: Mapped[list["Material"]] = relationship("Material", back_populates="folder")


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
    folder_id: Mapped[str | None] = mapped_column(String, ForeignKey("folders.id"), nullable=True)
    created_by: Mapped[str] = mapped_column(String, ForeignKey("users.id"), nullable=False)
    shared_by: Mapped[str | None] = mapped_column(String, ForeignKey("users.id"), nullable=True)
    source_id: Mapped[str | None] = mapped_column(
        String, ForeignKey("library_materials.id", ondelete="CASCADE"), nullable=True,
    )
    created_at: Mapped[datetime] = mapped_column(DateTime, server_default=func.now())

    creator: Mapped["User"] = relationship("User", foreign_keys=[created_by], back_populates="materials")
    sharer: Mapped["User | None"] = relationship("User", foreign_keys=[shared_by])
    folder: Mapped["Folder | None"] = relationship("Folder", back_populates="materials")
    source: Mapped["Material | None"] = relationship(
        "Material", remote_side=[id], foreign_keys=[source_id],
    )
    class_materials: Mapped[list["ClassMaterial"]] = relationship(
        "ClassMaterial", back_populates="material", cascade="all, delete-orphan", passive_deletes=True,
    )
    views: Mapped[list["MaterialView"]] = relationship(
        "MaterialView", back_populates="material", cascade="all, delete-orphan", passive_deletes=True,
    )


class MaterialView(Base):
    __tablename__ = "material_views"
    __table_args__ = (
        UniqueConstraint("material_id", "student_id", name="uq_material_student_view"),
    )

    id: Mapped[str] = mapped_column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    material_id: Mapped[str] = mapped_column(
        String, ForeignKey("library_materials.id", ondelete="CASCADE"), nullable=False,
    )
    student_id: Mapped[str] = mapped_column(String, ForeignKey("users.id"), nullable=False)
    class_id: Mapped[str | None] = mapped_column(
        String, ForeignKey("classes.id", ondelete="CASCADE"), nullable=True,
    )
    viewed_at: Mapped[datetime] = mapped_column(DateTime, server_default=func.now())

    material: Mapped["Material"] = relationship("Material", back_populates="views")
    student: Mapped["User"] = relationship("User", foreign_keys=[student_id])
    class_: Mapped["Class | None"] = relationship("Class", foreign_keys=[class_id])
