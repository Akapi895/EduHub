from datetime import datetime
from pydantic import BaseModel


class ConversationCreate(BaseModel):
    user_id: str


class MessageCreate(BaseModel):
    content: str | None = None
    file_url: str | None = None


class MessageOut(BaseModel):
    id: str
    conversation_id: str
    sender_id: str
    content: str | None = None
    file_url: str | None = None
    is_read: bool
    created_at: datetime

    model_config = {"from_attributes": True}


class ConversationOut(BaseModel):
    id: str
    created_at: datetime
    member_ids: list[str] = []

    model_config = {"from_attributes": True}
