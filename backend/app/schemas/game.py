from __future__ import annotations

from datetime import datetime
from typing import Any

from pydantic import BaseModel, Field

from app.schemas.question import QuestionCreate, QuestionUpdate
from app.utils.enums import ContentPackageStatus, DifficultyBand


class GamePackageCreate(BaseModel):
    title: str
    description: str | None = None
    game_module_id: str
    thumbnail_url: str | None = None
    runtime_config: dict[str, Any] | None = None
    selector_strategy: str = "random_no_repeat"
    scoring_config: dict[str, Any] | None = None
    subject: str | None = None
    grade: str | None = None
    status: ContentPackageStatus = ContentPackageStatus.published
    # Memory Card specific
    background_image_url: str | None = None
    max_moves: int | None = None


class GamePackageUpdate(BaseModel):
    title: str | None = None
    description: str | None = None
    game_module_id: str | None = None
    thumbnail_url: str | None = None
    runtime_config: dict[str, Any] | None = None
    selector_strategy: str | None = None
    scoring_config: dict[str, Any] | None = None
    subject: str | None = None
    grade: str | None = None
    status: ContentPackageStatus | None = None
    # Memory Card specific: background image URL
    background_image_url: str | None = None
    # Memory Card specific: max moves (null = unlimited)
    max_moves: int | None = None


class GamePackagePublicationUpdate(BaseModel):
    published: bool = True
    visibility: str = "public"
    start_at: datetime | None = None
    end_at: datetime | None = None
    featured: bool = False
    sort_order: int = 0
    metadata_json: dict[str, Any] | None = None


class GameLeaderboardEntryOut(BaseModel):
    rank: int
    user_id: str
    student_name: str | None = None
    avatar_url: str | None = None
    best_attempt_id: str | None = None
    best_score_total: float | None = None
    best_score_context: float | None = None
    best_score_question: float | None = None
    best_duration_ms: int | None = None
    attempts_count: int = 0
    last_played_at: datetime | None = None
    is_current_user: bool = False


class GameQuestionCreate(QuestionCreate):
    difficulty_band: DifficultyBand


class GameQuestionUpdate(QuestionUpdate):
    difficulty_band: DifficultyBand | None = None


class GameRuntimeTriggerRequest(BaseModel):
    attempt_id: str
    trigger_type: str
    trigger_key: str
    trigger_value: str
    event_payload: dict[str, Any] | None = None


class GameMatchingAnswerInput(BaseModel):
    left_item_id: str
    selected_right_key: str | None = None


class GameRuntimeAnswerRequest(BaseModel):
    attempt_id: str
    question_attempt_id: str
    text_answer: str | None = None
    selected_option_ids: list[str] = Field(default_factory=list)
    matching_answers: list[GameMatchingAnswerInput] = Field(default_factory=list)
    uploaded_image_url: str | None = None


class GameRuntimeEventRequest(BaseModel):
    attempt_id: str
    event_type: str
    event_payload: dict[str, Any] | None = None


class GameCompleteRequest(BaseModel):
    attempt_id: str
    summary_payload: dict[str, Any]
    runtime_state: dict[str, Any] | None = None
    # Optional: score breakdown for detailed analytics (Memory Card, etc)
    score_breakdown: dict[str, float] | None = None


class GameScoreBreakdown(BaseModel):
    """Detailed score breakdown for gameplay-based games like Memory Card.
    
    - score_base: points from core gameplay (matching pairs)
    - score_bonus: bonus points from efficiency metrics (time, moves, etc)
    """
    score_base: float = 0.0
    score_bonus: float = 0.0

    def total(self) -> float:
        return round(self.score_base + self.score_bonus, 2)


class GamePackageAttemptOut(BaseModel):
    id: str
    package_id: str
    user_id: str
    class_id: str | None = None
    attempt_index: int
    status: str
    started_at: datetime | None = None
    completed_at: datetime | None = None
    score_total: float | None = None
    score_question: float | None = None
    score_context: float | None = None
    score_gameplay_base: float | None = None
    score_gameplay_bonus: float | None = None


# ── Card Pairs (Memory Card / pair-matching games) ──────────────────────────

class GameCardPairCreate(BaseModel):
    """Payload to create a new card pair for a game package."""
    left_label: str | None = None
    left_image_url: str | None = None
    right_label: str | None = None
    right_image_url: str | None = None
    order_index: int = 0
    match_mode: str = "image_image"


class GameCardPairUpdate(BaseModel):
    """Partial-update payload for an existing card pair."""
    left_label: str | None = None
    left_image_url: str | None = None
    right_label: str | None = None
    right_image_url: str | None = None
    order_index: int | None = None
    match_mode: str | None = None
