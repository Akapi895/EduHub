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


class QuestionCreate(BaseModel):
    type: QuestionType = QuestionType.single_choice
    content: str
    instruction: str | None = None
    points: int = 1
    required: bool = True
    order_index: int = 0
    options: list[OptionCreate] = []
    matching_pairs: list[MatchingPairCreate] = []


class QuestionUpdate(BaseModel):
    type: str | None = None
    content: str | None = None
    instruction: str | None = None
    points: int | None = None
    required: bool | None = None
    order_index: int | None = None
    options: list[OptionCreate] | None = None


class QuestionOut(BaseModel):
    id: str
    exam_id: str
    type: str
    content: str
    instruction: str | None = None
    points: int
    required: bool
    order_index: int
    options: list[OptionOut] = []
    matching_pairs: list[MatchingPairOut] = []
    created_at: datetime

    model_config = {"from_attributes": True}
