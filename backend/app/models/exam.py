import uuid
from datetime import datetime
from sqlalchemy import Boolean, DateTime, ForeignKey, Integer, String, func
from sqlalchemy.orm import Mapped, mapped_column, relationship
from app.db.base import Base
from app.utils.enums import ExamStatus


class Exam(Base):
    __tablename__ = "exams"

    id: Mapped[str] = mapped_column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    class_id: Mapped[str] = mapped_column(String, ForeignKey("classes.id"), nullable=False)
    title: Mapped[str] = mapped_column(String, nullable=False)
    description: Mapped[str | None] = mapped_column(String, nullable=True)
    thumbnail_url: Mapped[str | None] = mapped_column(String, nullable=True)
    start_time: Mapped[datetime | None] = mapped_column(DateTime, nullable=True)
    end_time: Mapped[datetime | None] = mapped_column(DateTime, nullable=True)
    duration_minutes: Mapped[int | None] = mapped_column(Integer, nullable=True)
    shuffle_questions: Mapped[bool] = mapped_column(Boolean, default=False)
    max_attempts: Mapped[int] = mapped_column(Integer, default=1)
    allow_review: Mapped[bool] = mapped_column(Boolean, default=True)
    show_answers_policy: Mapped[str] = mapped_column(String, default="never")
    status: Mapped[str] = mapped_column(String, default=ExamStatus.upcoming, nullable=False)
    created_by: Mapped[str] = mapped_column(String, ForeignKey("users.id"), nullable=False)
    created_at: Mapped[datetime] = mapped_column(DateTime, server_default=func.now())

    class_: Mapped["Class"] = relationship("Class", back_populates="exams")
    creator: Mapped["User"] = relationship("User", back_populates="created_exams")
    questions: Mapped[list["Question"]] = relationship("Question", back_populates="exam", cascade="all, delete-orphan")
    submissions: Mapped[list["Submission"]] = relationship("Submission", back_populates="exam", cascade="all, delete-orphan")
