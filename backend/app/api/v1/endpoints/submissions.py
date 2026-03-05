from pydantic import BaseModel
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.db.session import get_db
from app.crud import submission as submission_crud
from app.services import exam_service
from app.core.dependencies import get_current_user, require_teacher
from app.models.user import User
from app.utils.responses import ok

router = APIRouter(tags=["Submissions"])


class AnswerItem(BaseModel):
    question_id: str
    text_answer: str | None = None
    selected_option_ids: list[str] = []
    uploaded_image_url: str | None = None


class SubmitRequest(BaseModel):
    answers: list[AnswerItem]


def _serialize_submission(s):
    return {
        "id": s.id,
        "exam_id": s.exam_id,
        "student_id": s.student_id,
        "started_at": s.started_at.isoformat() if s.started_at else None,
        "submitted_at": s.submitted_at.isoformat() if s.submitted_at else None,
        "total_score": s.total_score,
        "status": s.status,
    }


@router.post("/exams/{exam_id}/start")
def start_exam(
    exam_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    submission = exam_service.start_exam(db, exam_id=exam_id, student_id=current_user.id)
    return ok(data=_serialize_submission(submission))


@router.post("/exams/{exam_id}/submit")
def submit_exam(
    exam_id: str,
    data: SubmitRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    answers_data = [a.model_dump() for a in data.answers]
    submission = exam_service.submit_exam(db, exam_id=exam_id, student_id=current_user.id, answers_data=answers_data)
    return ok(data=_serialize_submission(submission), message="Nop bai thanh cong")


@router.get("/exams/{exam_id}/submissions")
def list_submissions(
    exam_id: str,
    db: Session = Depends(get_db),
    teacher: User = Depends(require_teacher),
):
    subs = submission_crud.get_submissions_for_exam(db, exam_id)
    return ok(data=[_serialize_submission(s) for s in subs])


@router.get("/submissions/{submission_id}")
def get_submission(
    submission_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    sub = submission_crud.get_submission(db, submission_id)
    if not sub:
        raise HTTPException(status_code=404, detail="Submission not found")
    return ok(data=_serialize_submission(sub))
