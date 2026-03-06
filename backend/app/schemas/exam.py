from datetime import datetime
from pydantic import BaseModel
from app.utils.enums import ExamStatus


class ExamCreate(BaseModel):
    title: str
    description: str | None = None
    thumbnail_url: str | None = None
    start_time: datetime | None = None
    end_time: datetime | None = None
    duration_minutes: int | None = None
    shuffle_questions: bool = False
    max_attempts: int = 1
    allow_review: bool = True
    show_answers_policy: str = "never"


class ExamUpdate(BaseModel):
    title: str | None = None
    description: str | None = None
    thumbnail_url: str | None = None
    start_time: datetime | None = None
    end_time: datetime | None = None
    duration_minutes: int | None = None
    shuffle_questions: bool | None = None
    max_attempts: int | None = None
    allow_review: bool | None = None
    show_answers_policy: str | None = None
    status: ExamStatus | None = None


class ExamOut(BaseModel):
    id: str
    class_id: str
    title: str
    description: str | None = None
    thumbnail_url: str | None = None
    start_time: datetime | None = None
    end_time: datetime | None = None
    duration_minutes: int | None = None
    shuffle_questions: bool = False
    max_attempts: int = 1
    allow_review: bool = True
    show_answers_policy: str = "never"
    status: str
    created_by: str
    created_at: datetime

    model_config = {"from_attributes": True}
