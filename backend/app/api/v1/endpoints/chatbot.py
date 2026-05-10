from datetime import datetime, timedelta, timezone

import httpx
from fastapi import HTTPException, status
from pydantic import BaseModel

from app.core.config import settings
from app.core.dependencies import get_current_user
from app.models.user import User
from app.utils.responses import ok

from fastapi import APIRouter, Depends

router = APIRouter(prefix="/chatbot", tags=["Chatbot"])

# In-memory storage for daily question counts
# Format: {user_id: {"count": int, "date": "YYYY-MM-DD"}}
_question_tracker: dict[str, dict] = {}
DAILY_LIMIT = 2

PLACEHOLDER_RESPONSE = (
    "Xin lỗi bạn! Tính năng trợ lý AI đang được phát triển. "
    "Vui lòng quay lại sau nhé!"
)

SYSTEM_PROMPT = (
    "Bạn là một trợ lý học tập thân thiện dành cho học sinh Việt Nam. "
    "Hãy trả lời ngắn gọn, dễ hiểu, bằng tiếng Việt. "
    "Nếu câu hỏi không liên quan đến học tập, hãy lịch sự chuyển hướng."
)


class ChatbotRequest(BaseModel):
    question: str


def _get_today_key() -> str:
    return datetime.now(timezone.utc).strftime("%Y-%m-%d")


def _check_rate_limit(user_id: str) -> tuple[bool, int]:
    """
    Check if user has remaining questions for today.
    Returns (allowed, remaining_count)
    """
    today = _get_today_key()
    
    if user_id in _question_tracker:
        data = _question_tracker[user_id]
        if data.get("date") == today:
            count = data.get("count", 0)
            if count >= DAILY_LIMIT:
                return False, 0
            return True, DAILY_LIMIT - count
    
    return True, DAILY_LIMIT


def _increment_count(user_id: str) -> None:
    """Increment question count for today."""
    today = _get_today_key()
    
    if user_id not in _question_tracker or _question_tracker[user_id].get("date") != today:
        _question_tracker[user_id] = {"count": 0, "date": today}
    
    _question_tracker[user_id]["count"] += 1


def _call_gemini(question: str) -> str:
    """Call Gemini API to get AI response."""
    api_key = settings.gemini_api_key
    
    if not api_key:
        return PLACEHOLDER_RESPONSE
    
    # Use gemini-flash-latest model with header auth
    url = "https://generativelanguage.googleapis.com/v1beta/models/gemini-flash-latest:generateContent"
    
    headers = {
        "Content-Type": "application/json",
        "X-goog-api-key": api_key,
    }
    
    payload = {
        "contents": [{
            "parts": [{"text": f"{SYSTEM_PROMPT}\n\nCâu hỏi: {question}"}]
        }],
        "generationConfig": {
            "temperature": 0.7,
            "maxOutputTokens": 1024,
        }
    }
    
    try:
        with httpx.Client(timeout=30.0) as client:
            response = client.post(url, json=payload, headers=headers)
            
            # Log response for debugging
            if response.status_code != 200:
                print(f"[GEMINI ERROR] Status {response.status_code}: {response.text[:500]}")
                return PLACEHOLDER_RESPONSE
            
            data = response.json()
            
            # Extract text from Gemini response
            candidates = data.get("candidates", [])
            if not candidates:
                print(f"[GEMINI ERROR] No candidates in response: {data}")
                return PLACEHOLDER_RESPONSE
            
            content = candidates[0].get("content", {})
            parts = content.get("parts", [])
            if not parts:
                print(f"[GEMINI ERROR] No parts in response: {content}")
                return PLACEHOLDER_RESPONSE
            
            text = parts[0].get("text", "").strip()
            if not text:
                print(f"[GEMINI ERROR] Empty text in response")
                return PLACEHOLDER_RESPONSE
            
            return text
            
    except httpx.TimeoutException:
        print("[GEMINI ERROR] Request timeout")
        return PLACEHOLDER_RESPONSE
    except Exception as e:
        print(f"[GEMINI ERROR] Exception: {type(e).__name__}: {e}")
        return PLACEHOLDER_RESPONSE


@router.post("/ask")
def ask_chatbot(data: ChatbotRequest, current_user: User = Depends(get_current_user)):
    """
    Chatbot endpoint with daily question limit (2 questions/day per student).
    Uses Gemini API if configured, otherwise returns placeholder response.
    """
    # Validate input
    question = data.question.strip()
    if not question:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Câu hỏi không được để trống"
        )
    
    if len(question) > 1000:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Câu hỏi quá dài (tối đa 1000 ký tự)"
        )
    
    # Check rate limit
    allowed, remaining = _check_rate_limit(current_user.id)
    
    if not allowed:
        raise HTTPException(
            status_code=status.HTTP_429_TOO_MANY_REQUESTS,
            detail="Bạn đã hết lượt hỏi hôm nay. Hãy quay lại vào ngày mai!"
        )
    
    # Increment count before processing
    _increment_count(current_user.id)
    
    # Get AI response
    answer = _call_gemini(question)
    
    return ok(
        data={
            "answer": answer,
            "remaining_questions": remaining - 1,
            "limit": DAILY_LIMIT,
        },
        message="Trả lời thành công"
    )


@router.get("/status")
def get_chatbot_status(current_user: User = Depends(get_current_user)):
    """Get remaining questions for today."""
    _, remaining = _check_rate_limit(current_user.id)
    
    return ok(
        data={
            "remaining_questions": remaining,
            "limit": DAILY_LIMIT,
            "reset_at": f"{_get_today_key()} 23:59:59",
        },
        message="OK"
    )
