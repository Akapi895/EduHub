from __future__ import annotations

from datetime import datetime
from typing import Any

from pydantic import BaseModel, Field


class GamePackageCreate(BaseModel):
    title: str
    description: str | None = None
    thumbnail_url: str | None = None
    game_module_id: str
    runtime_config: dict[str, Any] | None = None


class GamePackageUpdate(BaseModel):
    title: str | None = None
    description: str | None = None
    thumbnail_url: str | None = None
    status: str | None = None
    runtime_config: dict[str, Any] | None = None


class RuntimeTriggerRequest(BaseModel):
    attempt_id: str
    trigger_type: str
    trigger_key: str
    trigger_value: str
    event_payload: dict[str, Any] = Field(default_factory=dict)


class RuntimeAnswerRequest(BaseModel):
    attempt_id: str
    question_attempt_id: str
    text_answer: str | None = None
    selected_option_ids: list[str] = Field(default_factory=list)
    uploaded_image_url: str | None = None


class RuntimeEventRequest(BaseModel):
    attempt_id: str
    event_type: str
    event_payload: dict[str, Any] = Field(default_factory=dict)


class CompleteGameAttemptRequest(BaseModel):
    attempt_id: str
    summary_payload: dict[str, Any] = Field(default_factory=dict)
    runtime_state: dict[str, Any] | None = None


class RuntimeQuestionAttemptOut(BaseModel):
    id: str
    question_item_id: str
    status: str
    difficulty_band: str | None = None
    source_payload: dict[str, Any] | None = None
    presented_at: datetime | None = None
    answered_at: datetime | None = None
    graded_at: datetime | None = None
    score_awarded: float | None = None
    is_correct: bool | None = None
    feedback_message: str | None = None

