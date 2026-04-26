from datetime import datetime
from pydantic import BaseModel
from app.utils.enums import QuestionType


class OptionCreate(BaseModel):
    content: str
    is_correct: bool = False


class OptionOut(BaseModel):
    id: str
    content: str
    is_correct: bool

    model_config = {"from_attributes": True}


class OptionStudentOut(BaseModel):
    """Option without is_correct — safe for students."""
    id: str
    content: str

    model_config = {"from_attributes": True}


class MatchingPairCreate(BaseModel):
    left_text: str
    right_text: str
    correct_match: str


class MatchingPairOut(BaseModel):
    id: str
    left_text: str
    right_text: str
    correct_match: str

    model_config = {"from_attributes": True}


class MatchingPairStudentOut(BaseModel):
    """Matching pair without correct_match — safe for students."""
    id: str
    left_text: str
    right_text: str

    model_config = {"from_attributes": True}


class TextConfigCreate(BaseModel):
    input_variant: str = "paragraph"
    grading_mode: str = "manual"
    min_length: int | None = None
    max_length: int | None = None
    case_sensitive: bool = False
    accent_sensitive: bool = False
    trim_whitespace: bool = True
    ignore_punctuation: bool = True
    accepted_answers: list[str] = []
    keywords: list[str] = []


class TextConfigOut(BaseModel):
    input_variant: str
    grading_mode: str
    min_length: int | None = None
    max_length: int | None = None
    case_sensitive: bool = False
    accent_sensitive: bool = False
    trim_whitespace: bool = True
    ignore_punctuation: bool = True


class QuestionCreate(BaseModel):
    type: QuestionType = QuestionType.single_choice
    content: str
    instruction: str | None = None
    explanation: str | None = None
    difficulty_band: str | None = None
    points: int = 1
    required: bool = True
    order_index: int = 0
    options: list[OptionCreate] = []
    matching_pairs: list[MatchingPairCreate] = []
    text_config: TextConfigCreate | None = None


class QuestionUpdate(BaseModel):
    type: str | None = None
    content: str | None = None
    instruction: str | None = None
    explanation: str | None = None
    difficulty_band: str | None = None
    points: int | None = None
    required: bool | None = None
    order_index: int | None = None
    options: list[OptionCreate] | None = None
    matching_pairs: list[MatchingPairCreate] | None = None
    text_config: TextConfigCreate | None = None


class QuestionOut(BaseModel):
    id: str
    exam_id: str
    type: str
    content: str
    instruction: str | None = None
    explanation: str | None = None
    difficulty_band: str | None = None
    points: int
    required: bool
    order_index: int
    options: list[OptionOut] = []
    matching_pairs: list[MatchingPairOut] = []
    text_config: TextConfigOut | None = None
    created_at: datetime


class QuestionStudentOut(BaseModel):
    """Question schema for students — no is_correct, no correct_match."""
    id: str
    exam_id: str
    type: str
    content: str
    instruction: str | None = None
    explanation: str | None = None
    difficulty_band: str | None = None
    points: int
    required: bool
    order_index: int
    options: list[OptionStudentOut] = []
    matching_pairs: list[MatchingPairStudentOut] = []
    text_config: TextConfigOut | None = None
    created_at: datetime
