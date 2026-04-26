from __future__ import annotations

import uuid
from datetime import datetime
from typing import TYPE_CHECKING, Any

from sqlalchemy import Boolean, DateTime, Float, ForeignKey, Integer, JSON, String, Text, UniqueConstraint, func
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base
from app.utils.enums import PackageAttemptStatus, QuestionAttemptStatus, QuestionSourceContext

if TYPE_CHECKING:
    from app.models.class_model import Class
    from app.models.content_package import ContentPackage
    from app.models.game_module import GameRuntimeEvent
    from app.models.question_bank import (
        QuestionBankItem,
        QuestionItemMatchingLeftItem,
        QuestionItemOption,
    )
    from app.models.user import User


class PackageAttempt(Base):
    __tablename__ = "package_attempts"
    __table_args__ = (
        UniqueConstraint("package_id", "user_id", "attempt_index", name="uq_package_attempt_index"),
    )

    id: Mapped[str] = mapped_column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    package_id: Mapped[str] = mapped_column(String, ForeignKey("content_packages.id", ondelete="CASCADE"), nullable=False)
    user_id: Mapped[str] = mapped_column(String, ForeignKey("users.id"), nullable=False)
    class_id: Mapped[str | None] = mapped_column(String, ForeignKey("classes.id", ondelete="CASCADE"), nullable=True)
    attempt_index: Mapped[int] = mapped_column(Integer, default=1, nullable=False)
    status: Mapped[str] = mapped_column(String, default=PackageAttemptStatus.in_progress, nullable=False)
    started_at: Mapped[datetime] = mapped_column(DateTime, server_default=func.now())
    submitted_at: Mapped[datetime | None] = mapped_column(DateTime, nullable=True)
    completed_at: Mapped[datetime | None] = mapped_column(DateTime, nullable=True)
    score_total: Mapped[float | None] = mapped_column(Float, nullable=True)
    score_question: Mapped[float | None] = mapped_column(Float, nullable=True)
    score_context: Mapped[float | None] = mapped_column(Float, nullable=True)
    summary_payload: Mapped[dict[str, Any] | None] = mapped_column(JSON, nullable=True)
    runtime_state: Mapped[dict[str, Any] | None] = mapped_column(JSON, nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, server_default=func.now())
    updated_at: Mapped[datetime] = mapped_column(DateTime, server_default=func.now(), onupdate=func.now())

    package: Mapped["ContentPackage"] = relationship("ContentPackage", back_populates="attempts")
    user: Mapped["User"] = relationship("User", back_populates="package_attempts")
    class_: Mapped["Class | None"] = relationship("Class")
    question_attempts: Mapped[list["PackageQuestionAttempt"]] = relationship(
        "PackageQuestionAttempt", back_populates="package_attempt", cascade="all, delete-orphan"
    )
    runtime_events: Mapped[list["GameRuntimeEvent"]] = relationship(
        "GameRuntimeEvent", back_populates="package_attempt", cascade="all, delete-orphan"
    )


class PackageQuestionAttempt(Base):
    __tablename__ = "package_question_attempts"

    id: Mapped[str] = mapped_column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    package_attempt_id: Mapped[str] = mapped_column(
        String, ForeignKey("package_attempts.id", ondelete="CASCADE"), nullable=False
    )
    question_item_id: Mapped[str] = mapped_column(
        String, ForeignKey("question_bank_items.id", ondelete="CASCADE"), nullable=False
    )
    source_context: Mapped[str] = mapped_column(String, default=QuestionSourceContext.exam_sequence, nullable=False)
    source_payload: Mapped[dict[str, Any] | None] = mapped_column(JSON, nullable=True)
    display_order: Mapped[int | None] = mapped_column(Integer, nullable=True)
    difficulty_band_snapshot: Mapped[str | None] = mapped_column(String, nullable=True)
    presented_at: Mapped[datetime] = mapped_column(DateTime, server_default=func.now())
    answered_at: Mapped[datetime | None] = mapped_column(DateTime, nullable=True)
    graded_at: Mapped[datetime | None] = mapped_column(DateTime, nullable=True)
    resolved_at: Mapped[datetime | None] = mapped_column(DateTime, nullable=True)
    pause_started_at: Mapped[datetime | None] = mapped_column(DateTime, nullable=True)
    pause_ended_at: Mapped[datetime | None] = mapped_column(DateTime, nullable=True)
    status: Mapped[str] = mapped_column(String, default=QuestionAttemptStatus.presented, nullable=False)
    is_correct: Mapped[bool | None] = mapped_column(Boolean, nullable=True)
    score_awarded: Mapped[float | None] = mapped_column(Float, nullable=True)
    graded_by: Mapped[str | None] = mapped_column(String, ForeignKey("users.id"), nullable=True)
    feedback_message: Mapped[str | None] = mapped_column(Text, nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, server_default=func.now())
    updated_at: Mapped[datetime] = mapped_column(DateTime, server_default=func.now(), onupdate=func.now())

    package_attempt: Mapped["PackageAttempt"] = relationship("PackageAttempt", back_populates="question_attempts")
    question_item: Mapped["QuestionBankItem"] = relationship("QuestionBankItem", back_populates="question_attempts")
    selected_options: Mapped[list["QuestionAttemptSelectedOption"]] = relationship(
        "QuestionAttemptSelectedOption", back_populates="question_attempt", cascade="all, delete-orphan"
    )
    matching_answers: Mapped[list["QuestionAttemptMatchingAnswer"]] = relationship(
        "QuestionAttemptMatchingAnswer", back_populates="question_attempt", cascade="all, delete-orphan"
    )
    text_answer: Mapped["QuestionAttemptTextAnswer | None"] = relationship(
        "QuestionAttemptTextAnswer", back_populates="question_attempt", uselist=False, cascade="all, delete-orphan"
    )
    uploaded_assets: Mapped[list["QuestionAttemptUploadedAsset"]] = relationship(
        "QuestionAttemptUploadedAsset", back_populates="question_attempt", cascade="all, delete-orphan"
    )


class QuestionAttemptSelectedOption(Base):
    __tablename__ = "question_attempt_selected_options"
    __table_args__ = (
        UniqueConstraint("question_attempt_id", "option_id", name="uq_question_attempt_option"),
    )

    id: Mapped[str] = mapped_column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    question_attempt_id: Mapped[str] = mapped_column(
        String, ForeignKey("package_question_attempts.id", ondelete="CASCADE"), nullable=False
    )
    option_id: Mapped[str] = mapped_column(String, ForeignKey("question_item_options.id", ondelete="CASCADE"), nullable=False)

    question_attempt: Mapped["PackageQuestionAttempt"] = relationship("PackageQuestionAttempt", back_populates="selected_options")
    option: Mapped["QuestionItemOption"] = relationship("QuestionItemOption", back_populates="selected_attempts")


class QuestionAttemptMatchingAnswer(Base):
    __tablename__ = "question_attempt_matching_answers"

    id: Mapped[str] = mapped_column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    question_attempt_id: Mapped[str] = mapped_column(
        String, ForeignKey("package_question_attempts.id", ondelete="CASCADE"), nullable=False
    )
    left_item_id: Mapped[str] = mapped_column(
        String, ForeignKey("question_item_matching_left_items.id", ondelete="CASCADE"), nullable=False
    )
    selected_right_key: Mapped[str | None] = mapped_column(String, nullable=True)
    is_correct: Mapped[bool | None] = mapped_column(Boolean, nullable=True)

    question_attempt: Mapped["PackageQuestionAttempt"] = relationship("PackageQuestionAttempt", back_populates="matching_answers")
    left_item: Mapped["QuestionItemMatchingLeftItem"] = relationship("QuestionItemMatchingLeftItem", back_populates="matching_answers")


class QuestionAttemptTextAnswer(Base):
    __tablename__ = "question_attempt_text_answers"

    id: Mapped[str] = mapped_column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    question_attempt_id: Mapped[str] = mapped_column(
        String, ForeignKey("package_question_attempts.id", ondelete="CASCADE"), nullable=False, unique=True
    )
    raw_answer: Mapped[str] = mapped_column(Text, nullable=False)
    normalized_answer: Mapped[str | None] = mapped_column(Text, nullable=True)
    grading_mode_snapshot: Mapped[str | None] = mapped_column(String, nullable=True)
    score_awarded: Mapped[float | None] = mapped_column(Float, nullable=True)

    question_attempt: Mapped["PackageQuestionAttempt"] = relationship("PackageQuestionAttempt", back_populates="text_answer")


class QuestionAttemptUploadedAsset(Base):
    __tablename__ = "question_attempt_uploaded_assets"

    id: Mapped[str] = mapped_column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    question_attempt_id: Mapped[str] = mapped_column(
        String, ForeignKey("package_question_attempts.id", ondelete="CASCADE"), nullable=False
    )
    asset_url: Mapped[str] = mapped_column(Text, nullable=False)
    asset_type: Mapped[str | None] = mapped_column(String, nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, server_default=func.now())

    question_attempt: Mapped["PackageQuestionAttempt"] = relationship("PackageQuestionAttempt", back_populates="uploaded_assets")
