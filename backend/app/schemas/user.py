from datetime import datetime
from pydantic import BaseModel, EmailStr
from app.utils.enums import UserRole


class UserBase(BaseModel):
    full_name: str
    email: EmailStr
    role: UserRole


class UserPublic(UserBase):
    id: str
    avatar_url: str | None = None
    is_active: bool
    created_at: datetime

    model_config = {"from_attributes": True}


class UserUpdate(BaseModel):
    full_name: str | None = None
    avatar_url: str | None = None
