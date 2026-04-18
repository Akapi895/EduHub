from __future__ import annotations

import uuid
from datetime import datetime
from typing import Any

from sqlalchemy import Boolean, DateTime, Float, ForeignKey, Integer, JSON, String, UniqueConstraint, func
from sqlalchemy.dialects.postgresql import JSONB
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base
from app.utils.enums import InteractiveBookAttemptStatus, InteractiveBookStatus


JSON_PAYLOAD = JSON().with_variant(JSONB, "postgresql")


class InteractiveBook(Base):
    __tablename__ = "interactive_books"

    id: Mapped[str] = mapped_column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    material_id: Mapped[str] = mapped_column(
        String,
        ForeignKey("library_materials.id", ondelete="CASCADE"),
        unique=True,
        nullable=False,
    )
    status: Mapped[str] = mapped_column(String, default=InteractiveBookStatus.draft, nullable=False)
    draft_manifest: Mapped[dict[str, Any] | None] = mapped_column(JSON_PAYLOAD, nullable=True)
    published_manifest: Mapped[dict[str, Any] | None] = mapped_column(JSON_PAYLOAD, nullable=True)
    manifest_version: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    entry_scene_id: Mapped[str | None] = mapped_column(String, nullable=True)
    estimated_duration: Mapped[int | None] = mapped_column(Integer, nullable=True)
    created_by: Mapped[str] = mapped_column(String, ForeignKey("users.id"), nullable=False)
    published_at: Mapped[datetime | None] = mapped_column(DateTime, nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, server_default=func.now())
    updated_at: Mapped[datetime] = mapped_column(
        DateTime,
        server_default=func.now(),
        onupdate=func.now(),
    )

    material: Mapped["Material"] = relationship("Material", back_populates="interactive_book")
    creator: Mapped["User"] = relationship("User", back_populates="created_interactive_books")
    media_assets: Mapped[list["InteractiveBookMedia"]] = relationship(
        "InteractiveBookMedia",
        back_populates="interactive_book",
        cascade="all, delete-orphan",
    )
    scenes: Mapped[list["InteractiveBookScene"]] = relationship(
        "InteractiveBookScene",
        back_populates="interactive_book",
        cascade="all, delete-orphan",
    )
    actions: Mapped[list["InteractiveBookAction"]] = relationship(
        "InteractiveBookAction",
        back_populates="interactive_book",
        cascade="all, delete-orphan",
    )
    quizzes: Mapped[list["InteractiveBookQuiz"]] = relationship(
        "InteractiveBookQuiz",
        back_populates="interactive_book",
        cascade="all, delete-orphan",
    )
    attempts: Mapped[list["InteractiveBookAttempt"]] = relationship(
        "InteractiveBookAttempt",
        back_populates="interactive_book",
        cascade="all, delete-orphan",
    )


class InteractiveBookMedia(Base):
    __tablename__ = "interactive_book_media"
    __table_args__ = (
        UniqueConstraint("interactive_book_id", "media_key", name="uq_interactive_book_media_key"),
    )

    id: Mapped[str] = mapped_column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    interactive_book_id: Mapped[str] = mapped_column(
        String,
        ForeignKey("interactive_books.id", ondelete="CASCADE"),
        nullable=False,
    )
    media_key: Mapped[str | None] = mapped_column(String, nullable=True)
    media_type: Mapped[str] = mapped_column(String, nullable=False)
    url: Mapped[str] = mapped_column(String, nullable=False)
    thumbnail_url: Mapped[str | None] = mapped_column(String, nullable=True)
    duration: Mapped[float | None] = mapped_column(Float, nullable=True)
    metadata_json: Mapped[dict[str, Any] | None] = mapped_column(JSON_PAYLOAD, nullable=True)
    order_index: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    created_at: Mapped[datetime] = mapped_column(DateTime, server_default=func.now())
    updated_at: Mapped[datetime] = mapped_column(
        DateTime,
        server_default=func.now(),
        onupdate=func.now(),
    )

    interactive_book: Mapped["InteractiveBook"] = relationship(
        "InteractiveBook",
        back_populates="media_assets",
    )
    background_for_scenes: Mapped[list["InteractiveBookScene"]] = relationship(
        "InteractiveBookScene",
        back_populates="background_media",
        foreign_keys="InteractiveBookScene.background_media_id",
    )


class InteractiveBookScene(Base):
    __tablename__ = "interactive_book_scenes"
    __table_args__ = (
        UniqueConstraint("interactive_book_id", "scene_key", name="uq_interactive_book_scene_key"),
    )

    id: Mapped[str] = mapped_column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    interactive_book_id: Mapped[str] = mapped_column(
        String,
        ForeignKey("interactive_books.id", ondelete="CASCADE"),
        nullable=False,
    )
    scene_key: Mapped[str] = mapped_column(String, nullable=False)
    title: Mapped[str | None] = mapped_column(String, nullable=True)
    scene_type: Mapped[str] = mapped_column(String, nullable=False)
    order_index: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    background_media_id: Mapped[str | None] = mapped_column(
        String,
        ForeignKey("interactive_book_media.id", ondelete="SET NULL"),
        nullable=True,
    )
    auto_play: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    content_json: Mapped[dict[str, Any] | None] = mapped_column(JSON_PAYLOAD, nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, server_default=func.now())
    updated_at: Mapped[datetime] = mapped_column(
        DateTime,
        server_default=func.now(),
        onupdate=func.now(),
    )

    interactive_book: Mapped["InteractiveBook"] = relationship(
        "InteractiveBook",
        back_populates="scenes",
    )
    background_media: Mapped["InteractiveBookMedia | None"] = relationship(
        "InteractiveBookMedia",
        back_populates="background_for_scenes",
        foreign_keys=[background_media_id],
    )
    elements: Mapped[list["InteractiveBookSceneElement"]] = relationship(
        "InteractiveBookSceneElement",
        back_populates="scene",
        cascade="all, delete-orphan",
    )
    transitions: Mapped[list["InteractiveBookTransition"]] = relationship(
        "InteractiveBookTransition",
        back_populates="scene",
        cascade="all, delete-orphan",
    )
    video_interactions: Mapped[list["InteractiveBookVideoInteraction"]] = relationship(
        "InteractiveBookVideoInteraction",
        back_populates="scene",
        cascade="all, delete-orphan",
    )


class InteractiveBookAction(Base):
    __tablename__ = "interactive_book_actions"
    __table_args__ = (
        UniqueConstraint("interactive_book_id", "action_key", name="uq_interactive_book_action_key"),
    )

    id: Mapped[str] = mapped_column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    interactive_book_id: Mapped[str] = mapped_column(
        String,
        ForeignKey("interactive_books.id", ondelete="CASCADE"),
        nullable=False,
    )
    action_key: Mapped[str | None] = mapped_column(String, nullable=True)
    action_type: Mapped[str] = mapped_column(String, nullable=False)
    config_json: Mapped[dict[str, Any] | None] = mapped_column(JSON_PAYLOAD, nullable=True)
    order_index: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    created_at: Mapped[datetime] = mapped_column(DateTime, server_default=func.now())
    updated_at: Mapped[datetime] = mapped_column(
        DateTime,
        server_default=func.now(),
        onupdate=func.now(),
    )

    interactive_book: Mapped["InteractiveBook"] = relationship(
        "InteractiveBook",
        back_populates="actions",
    )
    scene_elements: Mapped[list["InteractiveBookSceneElement"]] = relationship(
        "InteractiveBookSceneElement",
        back_populates="action",
    )


class InteractiveBookQuiz(Base):
    __tablename__ = "interactive_book_quizzes"
    __table_args__ = (
        UniqueConstraint("interactive_book_id", "quiz_key", name="uq_interactive_book_quiz_key"),
    )

    id: Mapped[str] = mapped_column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    interactive_book_id: Mapped[str] = mapped_column(
        String,
        ForeignKey("interactive_books.id", ondelete="CASCADE"),
        nullable=False,
    )
    quiz_key: Mapped[str | None] = mapped_column(String, nullable=True)
    question: Mapped[str] = mapped_column(String, nullable=False)
    quiz_type: Mapped[str] = mapped_column(String, default="multiple_choice", nullable=False)
    config_json: Mapped[dict[str, Any] | None] = mapped_column(JSON_PAYLOAD, nullable=True)
    order_index: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    created_at: Mapped[datetime] = mapped_column(DateTime, server_default=func.now())
    updated_at: Mapped[datetime] = mapped_column(
        DateTime,
        server_default=func.now(),
        onupdate=func.now(),
    )

    interactive_book: Mapped["InteractiveBook"] = relationship(
        "InteractiveBook",
        back_populates="quizzes",
    )
    options: Mapped[list["InteractiveBookQuizOption"]] = relationship(
        "InteractiveBookQuizOption",
        back_populates="quiz",
        cascade="all, delete-orphan",
    )
    scene_elements: Mapped[list["InteractiveBookSceneElement"]] = relationship(
        "InteractiveBookSceneElement",
        back_populates="quiz",
    )


class InteractiveBookSceneElement(Base):
    __tablename__ = "interactive_book_scene_elements"
    __table_args__ = (
        UniqueConstraint("scene_id", "element_key", name="uq_interactive_book_scene_element_key"),
    )

    id: Mapped[str] = mapped_column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    scene_id: Mapped[str] = mapped_column(
        String,
        ForeignKey("interactive_book_scenes.id", ondelete="CASCADE"),
        nullable=False,
    )
    element_key: Mapped[str | None] = mapped_column(String, nullable=True)
    element_type: Mapped[str] = mapped_column(String, nullable=False)
    media_id: Mapped[str | None] = mapped_column(
        String,
        ForeignKey("interactive_book_media.id", ondelete="SET NULL"),
        nullable=True,
    )
    quiz_id: Mapped[str | None] = mapped_column(
        String,
        ForeignKey("interactive_book_quizzes.id", ondelete="SET NULL"),
        nullable=True,
    )
    action_id: Mapped[str | None] = mapped_column(
        String,
        ForeignKey("interactive_book_actions.id", ondelete="SET NULL"),
        nullable=True,
    )
    order_index: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    config_json: Mapped[dict[str, Any] | None] = mapped_column(JSON_PAYLOAD, nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, server_default=func.now())
    updated_at: Mapped[datetime] = mapped_column(
        DateTime,
        server_default=func.now(),
        onupdate=func.now(),
    )

    scene: Mapped["InteractiveBookScene"] = relationship(
        "InteractiveBookScene",
        back_populates="elements",
    )
    media: Mapped["InteractiveBookMedia | None"] = relationship("InteractiveBookMedia")
    quiz: Mapped["InteractiveBookQuiz | None"] = relationship(
        "InteractiveBookQuiz",
        back_populates="scene_elements",
    )
    action: Mapped["InteractiveBookAction | None"] = relationship(
        "InteractiveBookAction",
        back_populates="scene_elements",
    )


class InteractiveBookQuizOption(Base):
    __tablename__ = "interactive_book_quiz_options"

    id: Mapped[str] = mapped_column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    quiz_id: Mapped[str] = mapped_column(
        String,
        ForeignKey("interactive_book_quizzes.id", ondelete="CASCADE"),
        nullable=False,
    )
    option_key: Mapped[str | None] = mapped_column(String, nullable=True)
    content: Mapped[str] = mapped_column(String, nullable=False)
    is_correct: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    order_index: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    feedback: Mapped[str | None] = mapped_column(String, nullable=True)
    feedback_audio_url: Mapped[str | None] = mapped_column(String, nullable=True)
    correct_action_key: Mapped[str | None] = mapped_column(String, nullable=True)
    wrong_action_key: Mapped[str | None] = mapped_column(String, nullable=True)
    next_scene_key: Mapped[str | None] = mapped_column(String, nullable=True)
    retry: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    score_delta: Mapped[float | None] = mapped_column(Float, nullable=True)
    config_json: Mapped[dict[str, Any] | None] = mapped_column(JSON_PAYLOAD, nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, server_default=func.now())
    updated_at: Mapped[datetime] = mapped_column(
        DateTime,
        server_default=func.now(),
        onupdate=func.now(),
    )

    quiz: Mapped["InteractiveBookQuiz"] = relationship(
        "InteractiveBookQuiz",
        back_populates="options",
    )


class InteractiveBookTransition(Base):
    __tablename__ = "interactive_book_transitions"

    id: Mapped[str] = mapped_column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    scene_id: Mapped[str] = mapped_column(
        String,
        ForeignKey("interactive_book_scenes.id", ondelete="CASCADE"),
        nullable=False,
    )
    trigger_type: Mapped[str] = mapped_column(String, nullable=False)
    condition_json: Mapped[dict[str, Any] | None] = mapped_column(JSON_PAYLOAD, nullable=True)
    next_scene_key: Mapped[str | None] = mapped_column(String, nullable=True)
    action_key: Mapped[str | None] = mapped_column(String, nullable=True)
    order_index: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    created_at: Mapped[datetime] = mapped_column(DateTime, server_default=func.now())
    updated_at: Mapped[datetime] = mapped_column(
        DateTime,
        server_default=func.now(),
        onupdate=func.now(),
    )

    scene: Mapped["InteractiveBookScene"] = relationship(
        "InteractiveBookScene",
        back_populates="transitions",
    )


class InteractiveBookVideoInteraction(Base):
    __tablename__ = "interactive_book_video_interactions"

    id: Mapped[str] = mapped_column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    scene_id: Mapped[str] = mapped_column(
        String,
        ForeignKey("interactive_book_scenes.id", ondelete="CASCADE"),
        nullable=False,
    )
    interaction_key: Mapped[str | None] = mapped_column(String, nullable=True)
    timestamp: Mapped[float] = mapped_column(Float, nullable=False)
    prompt: Mapped[str | None] = mapped_column(String, nullable=True)
    config_json: Mapped[dict[str, Any] | None] = mapped_column(JSON_PAYLOAD, nullable=True)
    order_index: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    created_at: Mapped[datetime] = mapped_column(DateTime, server_default=func.now())
    updated_at: Mapped[datetime] = mapped_column(
        DateTime,
        server_default=func.now(),
        onupdate=func.now(),
    )

    scene: Mapped["InteractiveBookScene"] = relationship(
        "InteractiveBookScene",
        back_populates="video_interactions",
    )
    options: Mapped[list["InteractiveBookVideoOption"]] = relationship(
        "InteractiveBookVideoOption",
        back_populates="interaction",
        cascade="all, delete-orphan",
    )


class InteractiveBookVideoOption(Base):
    __tablename__ = "interactive_book_video_options"

    id: Mapped[str] = mapped_column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    interaction_id: Mapped[str] = mapped_column(
        String,
        ForeignKey("interactive_book_video_interactions.id", ondelete="CASCADE"),
        nullable=False,
    )
    option_key: Mapped[str | None] = mapped_column(String, nullable=True)
    label: Mapped[str] = mapped_column(String, nullable=False)
    next_scene_key: Mapped[str | None] = mapped_column(String, nullable=True)
    is_correct: Mapped[bool | None] = mapped_column(Boolean, nullable=True)
    retry: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    order_index: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    feedback: Mapped[str | None] = mapped_column(String, nullable=True)
    feedback_audio_url: Mapped[str | None] = mapped_column(String, nullable=True)
    action_key: Mapped[str | None] = mapped_column(String, nullable=True)
    score_delta: Mapped[float | None] = mapped_column(Float, nullable=True)
    config_json: Mapped[dict[str, Any] | None] = mapped_column(JSON_PAYLOAD, nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, server_default=func.now())
    updated_at: Mapped[datetime] = mapped_column(
        DateTime,
        server_default=func.now(),
        onupdate=func.now(),
    )

    interaction: Mapped["InteractiveBookVideoInteraction"] = relationship(
        "InteractiveBookVideoInteraction",
        back_populates="options",
    )


class InteractiveBookAttempt(Base):
    __tablename__ = "interactive_book_attempts"

    id: Mapped[str] = mapped_column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    interactive_book_id: Mapped[str] = mapped_column(
        String,
        ForeignKey("interactive_books.id", ondelete="CASCADE"),
        nullable=False,
    )
    student_id: Mapped[str] = mapped_column(String, ForeignKey("users.id"), nullable=False)
    class_id: Mapped[str | None] = mapped_column(
        String,
        ForeignKey("classes.id", ondelete="SET NULL"),
        nullable=True,
    )
    manifest_version: Mapped[int] = mapped_column(Integer, nullable=False)
    manifest_snapshot: Mapped[dict[str, Any] | None] = mapped_column(JSON_PAYLOAD, nullable=True)
    status: Mapped[str] = mapped_column(
        String,
        default=InteractiveBookAttemptStatus.in_progress,
        nullable=False,
    )
    current_scene_id: Mapped[str | None] = mapped_column(String, nullable=True)
    state_snapshot: Mapped[dict[str, Any] | None] = mapped_column(JSON_PAYLOAD, nullable=True)
    completion_percent: Mapped[float] = mapped_column(Float, default=0.0, nullable=False)
    score_summary: Mapped[dict[str, Any] | None] = mapped_column(JSON_PAYLOAD, nullable=True)
    started_at: Mapped[datetime] = mapped_column(DateTime, server_default=func.now())
    last_seen_at: Mapped[datetime] = mapped_column(DateTime, server_default=func.now())
    completed_at: Mapped[datetime | None] = mapped_column(DateTime, nullable=True)

    interactive_book: Mapped["InteractiveBook"] = relationship(
        "InteractiveBook",
        back_populates="attempts",
    )
    student: Mapped["User"] = relationship("User", back_populates="interactive_book_attempts")
    class_: Mapped["Class | None"] = relationship("Class", foreign_keys=[class_id])
    events: Mapped[list["InteractiveBookEvent"]] = relationship(
        "InteractiveBookEvent",
        back_populates="attempt",
        cascade="all, delete-orphan",
    )


class InteractiveBookEvent(Base):
    __tablename__ = "interactive_book_events"

    id: Mapped[str] = mapped_column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    attempt_id: Mapped[str] = mapped_column(
        String,
        ForeignKey("interactive_book_attempts.id", ondelete="CASCADE"),
        nullable=False,
    )
    scene_id: Mapped[str | None] = mapped_column(String, nullable=True)
    event_type: Mapped[str] = mapped_column(String, nullable=False)
    payload: Mapped[dict[str, Any] | None] = mapped_column(JSON_PAYLOAD, nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, server_default=func.now())

    attempt: Mapped["InteractiveBookAttempt"] = relationship(
        "InteractiveBookAttempt",
        back_populates="events",
    )
