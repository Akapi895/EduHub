from datetime import datetime
from pydantic import BaseModel
from app.utils.enums import MaterialType


class MaterialCreate(BaseModel):
    title: str
    description: str | None = None
    thumbnail_url: str | None = None
    file_url: str | None = None
    material_type: MaterialType = MaterialType.document
    subject: str | None = None
    grade: str | None = None
    is_system: bool = False


class MaterialUpdate(BaseModel):
    title: str | None = None
    description: str | None = None
    thumbnail_url: str | None = None
    file_url: str | None = None
    material_type: MaterialType | None = None
    subject: str | None = None
    grade: str | None = None


class MaterialOut(BaseModel):
    id: str
    title: str
    description: str | None = None
    thumbnail_url: str | None = None
    file_url: str | None = None
    material_type: str
    subject: str | None = None
    grade: str | None = None
    is_system: bool
    created_by: str
    created_at: datetime

    model_config = {"from_attributes": True}
