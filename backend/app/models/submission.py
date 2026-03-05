import uuid
from datetime import datetime
from sqlalchemy import DateTime, Float, ForeignKey, String, func
from sqlalchemy.orm import Mapped, mapped_column, relationship
from app.db.base import Base
from app.utils.enums import SubmissionStatus


class Submission(Base):
    __tablename__ = "exam_submissions"

    id: Mapped[str] = mapped_column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    exam_id: Mapped[str] = mapped_column(String, ForeignKey("exams.id"), nullable=False)
    student_id: Mapped[str] = mapped_column(String, ForeignKey("users.id"), nullable=False)
    started_at: Mapped[datetime] = mapped_column(DateTime, server_default=func.now())
    submitted_at: Mapped[datetime | None] = mapped_column(DateTime, nullable=True)
    total_score: Mapped[float | None] = mapped_column(Float, nullable=True)
    status: Mapped[str] = mapped_column(String, default=SubmissionStatus.in_progress, nullable=False)

    exam: Mapped["Exam"] = relationship("Exam", back_populates="submissions")
    student: Mapped["User"] = relationship("User", back_populates="submissions")
    answers: Mapped[list["Answer"]] = relationship("Answer", back_populates="submission", cascade="all, delete-orphan")


class Answer(Base):
    __tablename__ = "answers"

    id: Mapped[str] = mapped_column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    submission_id: Mapped[str] = mapped_column(String, ForeignKey("exam_submissions.id"), nullable=False)
    question_id: Mapped[str] = mapped_column(String, ForeignKey("questions.id"), nullable=False)
    text_answer: Mapped[str | None] = mapped_column(String, nullable=True)
    uploaded_image_url: Mapped[str | None] = mapped_column(String, nullable=True)
    score: Mapped[float | None] = mapped_column(Float, nullable=True)
    graded_by: Mapped[str | None] = mapped_column(String, ForeignKey("users.id"), nullable=True)
    graded_at: Mapped[datetime | None] = mapped_column(DateTime, nullable=True)

    submission: Mapped["Submission"] = relationship("Submission", back_populates="answers")
    question: Mapped["Question"] = relationship("Question", back_populates="answers")
    selected_options: Mapped[list["AnswerOption"]] = relationship("AnswerOption", back_populates="answer", cascade="all, delete-orphan")


class AnswerOption(Base):
    __tablename__ = "answer_options"

    id: Mapped[str] = mapped_column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    answer_id: Mapped[str] = mapped_column(String, ForeignKey("answers.id"), nullable=False)
    option_id: Mapped[str] = mapped_column(String, ForeignKey("question_options.id"), nullable=False)

    answer: Mapped["Answer"] = relationship("Answer", back_populates="selected_options")
    option: Mapped["QuestionOption"] = relationship("QuestionOption", back_populates="answer_options")
