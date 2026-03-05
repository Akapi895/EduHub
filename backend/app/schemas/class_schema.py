from datetime import datetime
from pydantic import BaseModel


class ClassCreate(BaseModel):
    name: str
    description: str | None = None
    thumbnail_url: str | None = None


class ClassUpdate(BaseModel):
    name: str | None = None
    description: str | None = None
    thumbnail_url: str | None = None


class ClassOut(BaseModel):
    id: str
    name: str
    description: str | None = None
    thumbnail_url: str | None = None
    teacher_id: str
    join_code: str
    created_at: datetime

    model_config = {"from_attributes": True}


class JoinClassRequest(BaseModel):
    join_code: str


class ChapterCreate(BaseModel):
    name: str
    order_index: int = 0


class ChapterUpdate(BaseModel):
    name: str | None = None
    order_index: int | None = None


class ChapterOut(BaseModel):
    id: str
    class_id: str
    name: str
    order_index: int
    created_at: datetime

    model_config = {"from_attributes": True}


class AddMaterialToClass(BaseModel):
    material_id: str
    chapter_id: str | None = None
