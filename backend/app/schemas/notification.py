from datetime import datetime
from pydantic import BaseModel


class NotificationOut(BaseModel):
    id: str
    type: str
    title: str
    content: str
    link: str | None = None
    is_read: bool = False
    created_at: datetime

    model_config = {"from_attributes": True}
