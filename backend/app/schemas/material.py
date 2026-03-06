from datetime import datetime
from pydantic import BaseModel
from app.utils.enums import MaterialType


class FolderCreate(BaseModel):
    name: str


class FolderOut(BaseModel):
    id: str
    name: str
    created_by: str
    created_at: datetime
    material_count: int = 0

    model_config = {"from_attributes": True}


class MaterialCreate(BaseModel):
    title: str
    description: str | None = None
    thumbnail_url: str | None = None
    file_url: str | None = None
    material_type: MaterialType = MaterialType.document
    subject: str | None = None
    grade: str | None = None
    is_system: bool = False
    folder_id: str | None = None


class MaterialUpdate(BaseModel):
    title: str | None = None
    description: str | None = None
    thumbnail_url: str | None = None
    file_url: str | None = None
    material_type: MaterialType | None = None
    subject: str | None = None
    grade: str | None = None
    folder_id: str | None = None


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
    folder_id: str | None = None
    created_by: str
    created_at: datetime

    model_config = {"from_attributes": True}
