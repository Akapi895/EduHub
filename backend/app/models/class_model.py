import uuid
from datetime import datetime
from sqlalchemy import DateTime, ForeignKey, Integer, String, func
from sqlalchemy.orm import Mapped, mapped_column, relationship
from app.db.base import Base


class Class(Base):
    __tablename__ = "classes"

    id: Mapped[str] = mapped_column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    name: Mapped[str] = mapped_column(String, nullable=False)
    description: Mapped[str | None] = mapped_column(String, nullable=True)
    thumbnail_url: Mapped[str | None] = mapped_column(String, nullable=True)
    teacher_id: Mapped[str] = mapped_column(String, ForeignKey("users.id"), nullable=False)
    join_code: Mapped[str] = mapped_column(String, unique=True, index=True, nullable=False)
    created_at: Mapped[datetime] = mapped_column(DateTime, server_default=func.now())
    updated_at: Mapped[datetime] = mapped_column(DateTime, server_default=func.now(), onupdate=func.now())

    teacher: Mapped["User"] = relationship("User", back_populates="owned_classes", foreign_keys=[teacher_id])
    students: Mapped[list["ClassStudent"]] = relationship("ClassStudent", back_populates="class_", cascade="all, delete-orphan")
    chapters: Mapped[list["Chapter"]] = relationship("Chapter", back_populates="class_", cascade="all, delete-orphan")
    class_materials: Mapped[list["ClassMaterial"]] = relationship("ClassMaterial", back_populates="class_", cascade="all, delete-orphan")
    exams: Mapped[list["Exam"]] = relationship("Exam", back_populates="class_", cascade="all, delete-orphan")


class ClassStudent(Base):
    __tablename__ = "class_students"

    id: Mapped[str] = mapped_column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    class_id: Mapped[str] = mapped_column(String, ForeignKey("classes.id"), nullable=False)
    student_id: Mapped[str] = mapped_column(String, ForeignKey("users.id"), nullable=False)
    joined_at: Mapped[datetime] = mapped_column(DateTime, server_default=func.now())

    class_: Mapped["Class"] = relationship("Class", back_populates="students")
    student: Mapped["User"] = relationship("User", back_populates="class_memberships")


class Chapter(Base):
    __tablename__ = "chapters"

    id: Mapped[str] = mapped_column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    class_id: Mapped[str] = mapped_column(String, ForeignKey("classes.id"), nullable=False)
    name: Mapped[str] = mapped_column(String, nullable=False)
    order_index: Mapped[int] = mapped_column(Integer, default=0)
    created_at: Mapped[datetime] = mapped_column(DateTime, server_default=func.now())

    class_: Mapped["Class"] = relationship("Class", back_populates="chapters")
    class_materials: Mapped[list["ClassMaterial"]] = relationship("ClassMaterial", back_populates="chapter")


class ClassMaterial(Base):
    __tablename__ = "class_materials"

    id: Mapped[str] = mapped_column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    class_id: Mapped[str] = mapped_column(String, ForeignKey("classes.id"), nullable=False)
    material_id: Mapped[str] = mapped_column(String, ForeignKey("library_materials.id"), nullable=False)
    chapter_id: Mapped[str | None] = mapped_column(String, ForeignKey("chapters.id"), nullable=True)
    assigned_at: Mapped[datetime] = mapped_column(DateTime, server_default=func.now())

    class_: Mapped["Class"] = relationship("Class", back_populates="class_materials")
    material: Mapped["Material"] = relationship("Material", back_populates="class_materials")
    chapter: Mapped["Chapter | None"] = relationship("Chapter", back_populates="class_materials")
