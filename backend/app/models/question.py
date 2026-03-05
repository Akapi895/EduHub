import uuid
from datetime import datetime
from sqlalchemy import Boolean, DateTime, ForeignKey, Integer, String, func
from sqlalchemy.orm import Mapped, mapped_column, relationship
from app.db.base import Base
from app.utils.enums import QuestionType


class Question(Base):
    __tablename__ = "questions"

    id: Mapped[str] = mapped_column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    exam_id: Mapped[str] = mapped_column(String, ForeignKey("exams.id"), nullable=False)
    type: Mapped[str] = mapped_column(String, default=QuestionType.single_choice, nullable=False)
    content: Mapped[str] = mapped_column(String, nullable=False)
    instruction: Mapped[str | None] = mapped_column(String, nullable=True)
    points: Mapped[int] = mapped_column(Integer, default=1)
    required: Mapped[bool] = mapped_column(Boolean, default=True)
    order_index: Mapped[int] = mapped_column(Integer, default=0)
    created_at: Mapped[datetime] = mapped_column(DateTime, server_default=func.now())

    exam: Mapped["Exam"] = relationship("Exam", back_populates="questions")
    options: Mapped[list["QuestionOption"]] = relationship("QuestionOption", back_populates="question", cascade="all, delete-orphan")
    matching_pairs: Mapped[list["MatchingPair"]] = relationship("MatchingPair", back_populates="question", cascade="all, delete-orphan")
    answers: Mapped[list["Answer"]] = relationship("Answer", back_populates="question", cascade="all, delete-orphan")


class QuestionOption(Base):
    __tablename__ = "question_options"

    id: Mapped[str] = mapped_column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    question_id: Mapped[str] = mapped_column(String, ForeignKey("questions.id"), nullable=False)
    content: Mapped[str] = mapped_column(String, nullable=False)
    is_correct: Mapped[bool] = mapped_column(Boolean, default=False)

    question: Mapped["Question"] = relationship("Question", back_populates="options")
    answer_options: Mapped[list["AnswerOption"]] = relationship("AnswerOption", back_populates="option", cascade="all, delete-orphan")


class MatchingPair(Base):
    __tablename__ = "matching_pairs"

    id: Mapped[str] = mapped_column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    question_id: Mapped[str] = mapped_column(String, ForeignKey("questions.id"), nullable=False)
    left_text: Mapped[str] = mapped_column(String, nullable=False)
    right_text: Mapped[str] = mapped_column(String, nullable=False)
    correct_match: Mapped[str] = mapped_column(String, nullable=False)

    question: Mapped["Question"] = relationship("Question", back_populates="matching_pairs")
