from __future__ import annotations

import uuid
from datetime import datetime
from typing import TYPE_CHECKING

from sqlalchemy import Boolean, DateTime, String, func
from sqlalchemy.orm import Mapped, mapped_column, relationship
from app.db.base import Base
from app.utils.enums import UserRole

if TYPE_CHECKING:
    from app.models.class_model import Class, ClassStudent
    from app.models.content_package import ContentPackage
    from app.models.material import Material
    from app.models.package_attempt import PackageAttempt, PackageQuestionAttempt
    from app.models.message import Message, ConversationMember
    from app.models.notification import Notification
    from app.models.interactive_book import InteractiveBook, InteractiveBookAttempt


class User(Base):
    __tablename__ = "users"

    id: Mapped[str] = mapped_column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    full_name: Mapped[str] = mapped_column(String, nullable=False)
    email: Mapped[str] = mapped_column(String, unique=True, index=True, nullable=False)
    password_hash: Mapped[str] = mapped_column(String, nullable=False)
    role: Mapped[str] = mapped_column(String, default=UserRole.student, nullable=False)
    avatar_url: Mapped[str | None] = mapped_column(String, nullable=True)
    phone: Mapped[str | None] = mapped_column(String, nullable=True)
    bio: Mapped[str | None] = mapped_column(String, nullable=True)
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
        "Material", back_populates="creator", foreign_keys="[Material.created_by]"
    )
    created_content_packages: Mapped[list["ContentPackage"]] = relationship(  # noqa: F821
        "ContentPackage", back_populates="creator", foreign_keys="[ContentPackage.created_by]"
    )
    package_attempts: Mapped[list["PackageAttempt"]] = relationship(  # noqa: F821
        "PackageAttempt", back_populates="user"
    )
    graded_question_attempts: Mapped[list["PackageQuestionAttempt"]] = relationship(  # noqa: F821
        "PackageQuestionAttempt", foreign_keys="[PackageQuestionAttempt.graded_by]"
    )
    sent_messages: Mapped[list["Message"]] = relationship(  # noqa: F821
        "Message", back_populates="sender"
    )
    conversation_memberships: Mapped[list["ConversationMember"]] = relationship(  # noqa: F821
        "ConversationMember", back_populates="user"
    )
    notifications: Mapped[list["Notification"]] = relationship(  # noqa: F821
        "Notification", back_populates="user"
    )
    created_interactive_books: Mapped[list["InteractiveBook"]] = relationship(  # noqa: F821
        "InteractiveBook", back_populates="creator"
    )
    interactive_book_attempts: Mapped[list["InteractiveBookAttempt"]] = relationship(  # noqa: F821
        "InteractiveBookAttempt", back_populates="student"
    )
