from pydantic import BaseModel
from fastapi import APIRouter, Depends

from app.core.dependencies import get_current_user
from app.models.user import User
from app.utils.responses import ok

router = APIRouter(prefix="/chatbot", tags=["Chatbot"])


class ChatbotRequest(BaseModel):
    question: str


@router.post("/ask")
def ask_chatbot(data: ChatbotRequest, current_user: User = Depends(get_current_user)):
    """
    Placeholder chatbot endpoint.
    In production, integrate with an AI/LLM API here.
    """
    answer = (
        f"Xin chao {current_user.full_name}! "
        "Day la phan hoi tu chatbot (placeholder). "
        "Hay tich hop AI API de co cau tra loi chinh xac."
    )
    return ok(data={"answer": answer}, message="Tra loi thanh cong")
