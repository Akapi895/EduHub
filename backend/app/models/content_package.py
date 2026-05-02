from __future__ import annotations

import uuid
from datetime import datetime
from typing import TYPE_CHECKING, Any

from sqlalchemy import Boolean, DateTime, ForeignKey, Integer, JSON, String, Text, UniqueConstraint, func
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base
from app.utils.enums import ContentPackageStatus, ContentPackageType

if TYPE_CHECKING:
    from app.models.class_model import Class
    from app.models.game_module import GameModule
    from app.models.package_attempt import GameLeaderboardEntry, PackageAttempt
    from app.models.question_bank import QuestionBank
    from app.models.user import User


class ContentPackage(Base):
    __tablename__ = "content_packages"

    id: Mapped[str] = mapped_column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    package_type: Mapped[str] = mapped_column(String, default=ContentPackageType.exam, nullable=False)
    title: Mapped[str] = mapped_column(Text, nullable=False)
    description: Mapped[str | None] = mapped_column(Text, nullable=True)
    subject: Mapped[str | None] = mapped_column(String, nullable=True)
    grade: Mapped[str | None] = mapped_column(String, nullable=True)
    thumbnail_url: Mapped[str | None] = mapped_column(Text, nullable=True)
    status: Mapped[str] = mapped_column(String, default=ContentPackageStatus.draft, nullable=False)
    created_by: Mapped[str] = mapped_column(String, ForeignKey("users.id"), nullable=False)
    version: Mapped[int] = mapped_column(Integer, default=1, nullable=False)
    published_at: Mapped[datetime | None] = mapped_column(DateTime, nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, server_default=func.now())
    updated_at: Mapped[datetime] = mapped_column(DateTime, server_default=func.now(), onupdate=func.now())

    creator: Mapped["User"] = relationship("User", back_populates="created_content_packages", foreign_keys=[created_by])
    assignments: Mapped[list["ContentPackageAssignment"]] = relationship(
        "ContentPackageAssignment", back_populates="package", cascade="all, delete-orphan"
    )
    question_bank: Mapped["QuestionBank | None"] = relationship(
        "QuestionBank", back_populates="package", uselist=False, cascade="all, delete-orphan"
    )
    exam_config: Mapped["ExamPackageConfig | None"] = relationship(
        "ExamPackageConfig", back_populates="package", uselist=False, cascade="all, delete-orphan"
    )
    game_config: Mapped["GamePackageConfig | None"] = relationship(
        "GamePackageConfig", back_populates="package", uselist=False, cascade="all, delete-orphan"
    )
    publications: Mapped[list["ContentPackagePublication"]] = relationship(
        "ContentPackagePublication", back_populates="package", cascade="all, delete-orphan"
    )
    access_rules: Mapped[list["ContentPackageAccessRule"]] = relationship(
        "ContentPackageAccessRule", back_populates="package", cascade="all, delete-orphan"
    )
    attempts: Mapped[list["PackageAttempt"]] = relationship(
        "PackageAttempt", back_populates="package", cascade="all, delete-orphan"
    )
    leaderboard_entries: Mapped[list["GameLeaderboardEntry"]] = relationship(
        "GameLeaderboardEntry", back_populates="package", cascade="all, delete-orphan"
    )


class ContentPackageAssignment(Base):
    __tablename__ = "content_package_assignments"
    __table_args__ = (
        UniqueConstraint("package_id", "class_id", name="uq_content_package_class_assignment"),
    )

    id: Mapped[str] = mapped_column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    package_id: Mapped[str] = mapped_column(String, ForeignKey("content_packages.id", ondelete="CASCADE"), nullable=False)
    class_id: Mapped[str] = mapped_column(String, ForeignKey("classes.id", ondelete="CASCADE"), nullable=False)
    assigned_by: Mapped[str] = mapped_column(String, ForeignKey("users.id"), nullable=False)
    start_at: Mapped[datetime | None] = mapped_column(DateTime, nullable=True)
    end_at: Mapped[datetime | None] = mapped_column(DateTime, nullable=True)
    is_active: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)
    created_at: Mapped[datetime] = mapped_column(DateTime, server_default=func.now())

    package: Mapped["ContentPackage"] = relationship("ContentPackage", back_populates="assignments")
    class_: Mapped["Class"] = relationship("Class", back_populates="package_assignments")


class ContentPackagePublication(Base):
    __tablename__ = "content_package_publications"
    __table_args__ = (
        UniqueConstraint("package_id", "channel", name="uq_content_package_publication_channel"),
    )

    id: Mapped[str] = mapped_column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    package_id: Mapped[str] = mapped_column(String, ForeignKey("content_packages.id", ondelete="CASCADE"), nullable=False)
    channel: Mapped[str] = mapped_column(String, default="game_hub", nullable=False)
    visibility: Mapped[str] = mapped_column(String, default="public", nullable=False)
    status: Mapped[str] = mapped_column(String, default="draft", nullable=False)
    published_by: Mapped[str | None] = mapped_column(String, ForeignKey("users.id"), nullable=True)
    published_at: Mapped[datetime | None] = mapped_column(DateTime, nullable=True)
    start_at: Mapped[datetime | None] = mapped_column(DateTime, nullable=True)
    end_at: Mapped[datetime | None] = mapped_column(DateTime, nullable=True)
    featured: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    sort_order: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    metadata_json: Mapped[dict[str, Any] | None] = mapped_column(JSON, nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, server_default=func.now())
    updated_at: Mapped[datetime] = mapped_column(DateTime, server_default=func.now(), onupdate=func.now())

    package: Mapped["ContentPackage"] = relationship("ContentPackage", back_populates="publications")
    publisher: Mapped["User | None"] = relationship("User", foreign_keys=[published_by])


class ContentPackageAccessRule(Base):
    __tablename__ = "content_package_access_rules"

    id: Mapped[str] = mapped_column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    package_id: Mapped[str] = mapped_column(String, ForeignKey("content_packages.id", ondelete="CASCADE"), nullable=False)
    permission: Mapped[str] = mapped_column(String, default="play", nullable=False)
    audience_type: Mapped[str] = mapped_column(String, default="all_students", nullable=False)
    audience_id: Mapped[str | None] = mapped_column(String, nullable=True)
    effect: Mapped[str] = mapped_column(String, default="allow", nullable=False)
    is_active: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)
    start_at: Mapped[datetime | None] = mapped_column(DateTime, nullable=True)
    end_at: Mapped[datetime | None] = mapped_column(DateTime, nullable=True)
    created_by: Mapped[str] = mapped_column(String, ForeignKey("users.id"), nullable=False)
    created_at: Mapped[datetime] = mapped_column(DateTime, server_default=func.now())
    updated_at: Mapped[datetime] = mapped_column(DateTime, server_default=func.now(), onupdate=func.now())

    package: Mapped["ContentPackage"] = relationship("ContentPackage", back_populates="access_rules")
    creator: Mapped["User"] = relationship("User", foreign_keys=[created_by])


class ExamPackageConfig(Base):
    __tablename__ = "exam_package_configs"

    package_id: Mapped[str] = mapped_column(
        String, ForeignKey("content_packages.id", ondelete="CASCADE"), primary_key=True
    )
    start_time: Mapped[datetime | None] = mapped_column(DateTime, nullable=True)
    end_time: Mapped[datetime | None] = mapped_column(DateTime, nullable=True)
    duration_minutes: Mapped[int | None] = mapped_column(Integer, nullable=True)
    shuffle_questions: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    max_attempts: Mapped[int] = mapped_column(Integer, default=1, nullable=False)
    allow_review: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)
    show_answers_policy: Mapped[str] = mapped_column(String, default="never", nullable=False)
    created_at: Mapped[datetime] = mapped_column(DateTime, server_default=func.now())
    updated_at: Mapped[datetime] = mapped_column(DateTime, server_default=func.now(), onupdate=func.now())

    package: Mapped["ContentPackage"] = relationship("ContentPackage", back_populates="exam_config")


class GamePackageConfig(Base):
    __tablename__ = "game_package_configs"

    package_id: Mapped[str] = mapped_column(
        String, ForeignKey("content_packages.id", ondelete="CASCADE"), primary_key=True
    )
    game_module_id: Mapped[str] = mapped_column(String, ForeignKey("game_modules.id"), nullable=False)
    selector_strategy: Mapped[str] = mapped_column(String, default="random_no_repeat", nullable=False)
    runtime_config: Mapped[dict[str, Any] | None] = mapped_column(JSON, nullable=True)
    scoring_config: Mapped[dict[str, Any] | None] = mapped_column(JSON, nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, server_default=func.now())
    updated_at: Mapped[datetime] = mapped_column(DateTime, server_default=func.now(), onupdate=func.now())

    package: Mapped["ContentPackage"] = relationship("ContentPackage", back_populates="game_config")
    game_module: Mapped["GameModule"] = relationship("GameModule", back_populates="package_configs")
