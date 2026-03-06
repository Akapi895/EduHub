from datetime import datetime
from pydantic import BaseModel, model_validator


class ConversationCreate(BaseModel):
    user_id: str


class MessageCreate(BaseModel):
    content: str | None = None
    file_url: str | None = None

    @model_validator(mode="after")
    def check_not_empty(self):
        if not self.content and not self.file_url:
            raise ValueError("Tin nhắn phải có nội dung hoặc file đính kèm")
        return self


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
