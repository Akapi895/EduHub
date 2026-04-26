from __future__ import annotations

import uuid
from datetime import datetime
from typing import TYPE_CHECKING

from sqlalchemy import Boolean, DateTime, Float, ForeignKey, Integer, String, Text, UniqueConstraint, func
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base
from app.utils.enums import QuestionType, TextGradingMode, TextInputVariant

if TYPE_CHECKING:
    from app.models.content_package import ContentPackage
    from app.models.package_attempt import (
        PackageQuestionAttempt,
        QuestionAttemptMatchingAnswer,
        QuestionAttemptSelectedOption,
    )
    from app.models.user import User


class QuestionBank(Base):
    __tablename__ = "question_banks"

    id: Mapped[str] = mapped_column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    package_id: Mapped[str] = mapped_column(
        String, ForeignKey("content_packages.id", ondelete="CASCADE"), nullable=False, unique=True
    )
    created_by: Mapped[str] = mapped_column(String, ForeignKey("users.id"), nullable=False)
    created_at: Mapped[datetime] = mapped_column(DateTime, server_default=func.now())
    updated_at: Mapped[datetime] = mapped_column(DateTime, server_default=func.now(), onupdate=func.now())

    package: Mapped["ContentPackage"] = relationship("ContentPackage", back_populates="question_bank")
    items: Mapped[list["QuestionBankItem"]] = relationship(
        "QuestionBankItem", back_populates="question_bank", cascade="all, delete-orphan"
    )


class QuestionBankItem(Base):
    __tablename__ = "question_bank_items"

    id: Mapped[str] = mapped_column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    question_bank_id: Mapped[str] = mapped_column(
        String, ForeignKey("question_banks.id", ondelete="CASCADE"), nullable=False
    )
    type: Mapped[str] = mapped_column(String, default=QuestionType.single_choice, nullable=False)
    difficulty_band: Mapped[str | None] = mapped_column(String, nullable=True)
    content: Mapped[str] = mapped_column(Text, nullable=False)
    instruction: Mapped[str | None] = mapped_column(Text, nullable=True)
    explanation: Mapped[str | None] = mapped_column(Text, nullable=True)
    points: Mapped[int] = mapped_column(Integer, default=1, nullable=False)
    required: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)
    order_index: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    is_active: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)
    created_by: Mapped[str] = mapped_column(String, ForeignKey("users.id"), nullable=False)
    created_at: Mapped[datetime] = mapped_column(DateTime, server_default=func.now())
    updated_at: Mapped[datetime] = mapped_column(DateTime, server_default=func.now(), onupdate=func.now())

    question_bank: Mapped["QuestionBank"] = relationship("QuestionBank", back_populates="items")
    options: Mapped[list["QuestionItemOption"]] = relationship(
        "QuestionItemOption", back_populates="question_item", cascade="all, delete-orphan"
    )
    matching_left_items: Mapped[list["QuestionItemMatchingLeftItem"]] = relationship(
        "QuestionItemMatchingLeftItem", back_populates="question_item", cascade="all, delete-orphan"
    )
    matching_right_items: Mapped[list["QuestionItemMatchingRightItem"]] = relationship(
        "QuestionItemMatchingRightItem", back_populates="question_item", cascade="all, delete-orphan"
    )
    text_config: Mapped["QuestionItemTextConfig | None"] = relationship(
        "QuestionItemTextConfig", back_populates="question_item", uselist=False, cascade="all, delete-orphan"
    )
    assets: Mapped[list["QuestionItemAsset"]] = relationship(
        "QuestionItemAsset", back_populates="question_item", cascade="all, delete-orphan"
    )
    question_attempts: Mapped[list["PackageQuestionAttempt"]] = relationship("PackageQuestionAttempt", back_populates="question_item")


class QuestionItemOption(Base):
    __tablename__ = "question_item_options"
    __table_args__ = (
        UniqueConstraint("question_item_id", "option_key", name="uq_question_item_option_key"),
    )

    id: Mapped[str] = mapped_column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    question_item_id: Mapped[str] = mapped_column(
        String, ForeignKey("question_bank_items.id", ondelete="CASCADE"), nullable=False
    )
    option_key: Mapped[str] = mapped_column(String, default=lambda: str(uuid.uuid4()), nullable=False)
    content: Mapped[str] = mapped_column(Text, nullable=False)
    is_correct: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    order_index: Mapped[int] = mapped_column(Integer, default=0, nullable=False)

    question_item: Mapped["QuestionBankItem"] = relationship("QuestionBankItem", back_populates="options")
    selected_attempts: Mapped[list["QuestionAttemptSelectedOption"]] = relationship(
        "QuestionAttemptSelectedOption", back_populates="option", cascade="all, delete-orphan"
    )


class QuestionItemMatchingRightItem(Base):
    __tablename__ = "question_item_matching_right_items"
    __table_args__ = (
        UniqueConstraint("question_item_id", "right_key", name="uq_question_item_matching_right_key"),
    )

    id: Mapped[str] = mapped_column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    question_item_id: Mapped[str] = mapped_column(
        String, ForeignKey("question_bank_items.id", ondelete="CASCADE"), nullable=False
    )
    right_key: Mapped[str] = mapped_column(String, default=lambda: str(uuid.uuid4()), nullable=False)
    content: Mapped[str] = mapped_column(Text, nullable=False)
    order_index: Mapped[int] = mapped_column(Integer, default=0, nullable=False)

    question_item: Mapped["QuestionBankItem"] = relationship("QuestionBankItem", back_populates="matching_right_items")


class QuestionItemMatchingLeftItem(Base):
    __tablename__ = "question_item_matching_left_items"
    __table_args__ = (
        UniqueConstraint("question_item_id", "left_key", name="uq_question_item_matching_left_key"),
    )

    id: Mapped[str] = mapped_column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    question_item_id: Mapped[str] = mapped_column(
        String, ForeignKey("question_bank_items.id", ondelete="CASCADE"), nullable=False
    )
    left_key: Mapped[str] = mapped_column(String, default=lambda: str(uuid.uuid4()), nullable=False)
    content: Mapped[str] = mapped_column(Text, nullable=False)
    correct_right_key: Mapped[str] = mapped_column(String, nullable=False)
    order_index: Mapped[int] = mapped_column(Integer, default=0, nullable=False)

    question_item: Mapped["QuestionBankItem"] = relationship("QuestionBankItem", back_populates="matching_left_items")
    matching_answers: Mapped[list["QuestionAttemptMatchingAnswer"]] = relationship(
        "QuestionAttemptMatchingAnswer", back_populates="left_item", cascade="all, delete-orphan"
    )


class QuestionItemTextConfig(Base):
    __tablename__ = "question_item_text_configs"

    id: Mapped[str] = mapped_column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    question_item_id: Mapped[str] = mapped_column(
        String, ForeignKey("question_bank_items.id", ondelete="CASCADE"), nullable=False, unique=True
    )
    input_variant: Mapped[str] = mapped_column(String, default=TextInputVariant.paragraph, nullable=False)
    grading_mode: Mapped[str] = mapped_column(String, default=TextGradingMode.manual, nullable=False)
    min_length: Mapped[int | None] = mapped_column(Integer, nullable=True)
    max_length: Mapped[int | None] = mapped_column(Integer, nullable=True)
    case_sensitive: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    accent_sensitive: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    trim_whitespace: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)
    ignore_punctuation: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)
    manual_grading_required: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)

    question_item: Mapped["QuestionBankItem"] = relationship("QuestionBankItem", back_populates="text_config")
    accepted_answers: Mapped[list["QuestionItemTextAcceptedAnswer"]] = relationship(
        "QuestionItemTextAcceptedAnswer", back_populates="text_config", cascade="all, delete-orphan"
    )
    keywords: Mapped[list["QuestionItemTextKeyword"]] = relationship(
        "QuestionItemTextKeyword", back_populates="text_config", cascade="all, delete-orphan"
    )


class QuestionItemTextAcceptedAnswer(Base):
    __tablename__ = "question_item_text_accepted_answers"

    id: Mapped[str] = mapped_column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    text_config_id: Mapped[str] = mapped_column(
        String, ForeignKey("question_item_text_configs.id", ondelete="CASCADE"), nullable=False
    )
    answer_text: Mapped[str] = mapped_column(Text, nullable=False)
    normalized_answer: Mapped[str | None] = mapped_column(Text, nullable=True)
    score_ratio: Mapped[float] = mapped_column(Float, default=1.0, nullable=False)
    order_index: Mapped[int] = mapped_column(Integer, default=0, nullable=False)

    text_config: Mapped["QuestionItemTextConfig"] = relationship("QuestionItemTextConfig", back_populates="accepted_answers")


class QuestionItemTextKeyword(Base):
    __tablename__ = "question_item_text_keywords"

    id: Mapped[str] = mapped_column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    text_config_id: Mapped[str] = mapped_column(
        String, ForeignKey("question_item_text_configs.id", ondelete="CASCADE"), nullable=False
    )
    keyword: Mapped[str] = mapped_column(Text, nullable=False)
    weight: Mapped[float] = mapped_column(Float, default=1.0, nullable=False)
    is_required: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    match_mode: Mapped[str] = mapped_column(String, default="contains", nullable=False)

    text_config: Mapped["QuestionItemTextConfig"] = relationship("QuestionItemTextConfig", back_populates="keywords")


class QuestionItemAsset(Base):
    __tablename__ = "question_item_assets"

    id: Mapped[str] = mapped_column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    question_item_id: Mapped[str] = mapped_column(
        String, ForeignKey("question_bank_items.id", ondelete="CASCADE"), nullable=False
    )
    asset_type: Mapped[str] = mapped_column(String, nullable=False)
    url: Mapped[str] = mapped_column(Text, nullable=False)
    order_index: Mapped[int] = mapped_column(Integer, default=0, nullable=False)

    question_item: Mapped["QuestionBankItem"] = relationship("QuestionBankItem", back_populates="assets")
