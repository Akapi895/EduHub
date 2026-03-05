import uuid
from datetime import datetime
from sqlalchemy import Boolean, DateTime, String, func
from sqlalchemy.orm import Mapped, mapped_column, relationship
from app.db.base import Base
from app.utils.enums import UserRole


class User(Base):
    __tablename__ = "users"

    id: Mapped[str] = mapped_column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    full_name: Mapped[str] = mapped_column(String, nullable=False)
    email: Mapped[str] = mapped_column(String, unique=True, index=True, nullable=False)
    password_hash: Mapped[str] = mapped_column(String, nullable=False)
    role: Mapped[str] = mapped_column(String, default=UserRole.student, nullable=False)
    avatar_url: Mapped[str | None] = mapped_column(String, nullable=True)
    is_active: Mapped[bool] = mapped_column(Boolean, default=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, server_default=func.now())
    updated_at: Mapped[datetime] = mapped_column(DateTime, server_default=func.now(), onupdate=func.now())

    owned_classes: Mapped[list["Class"]] = relationship(  # noqa: F821
        "Class", back_populates="teacher", foreign_keys="Class.teacher_id"
    )
    class_memberships: Mapped[list["ClassStudent"]] = relationship(  # noqa: F821
        "ClassStudent", back_populates="student"
    )
    materials: Mapped[list["Material"]] = relationship(  # noqa: F821
        "Material", back_populates="creator"
    )
    created_exams: Mapped[list["Exam"]] = relationship(  # noqa: F821
        "Exam", back_populates="creator"
    )
    submissions: Mapped[list["Submission"]] = relationship(  # noqa: F821
        "Submission", back_populates="student"
    )
    sent_messages: Mapped[list["Message"]] = relationship(  # noqa: F821
        "Message", back_populates="sender"
    )
    conversation_memberships: Mapped[list["ConversationMember"]] = relationship(  # noqa: F821
        "ConversationMember", back_populates="user"
    )
