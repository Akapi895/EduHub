from pydantic import BaseModel
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.db.session import get_db
from app.crud import submission as submission_crud
from app.crud import exam as exam_crud
from app.services import exam_service
from app.services.grading_service import grade_answer
from app.core.dependencies import get_current_user, require_teacher
from app.models.user import User
from app.models.submission import Answer as AnswerModel
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
        "student_name": s.student.full_name if s.student else None,
        "started_at": s.started_at.isoformat() if s.started_at else None,
        "submitted_at": s.submitted_at.isoformat() if s.submitted_at else None,
        "total_score": s.total_score,
        "status": s.status,
    }


def _serialize_submission_detail(s):
    """Full submission with answers for review, including correct answer data."""
    is_completed = s.status != "in_progress"
    answers = []
    for a in s.answers:
        answer_data = {
            "id": a.id,
            "question_id": a.question_id,
            "text_answer": a.text_answer,
            "selected_option_ids": [ao.option_id for ao in a.selected_options],
            "score": a.score,
        }
        # Include correct answer info for completed submissions
        if is_completed and a.question:
            q = a.question
            if q.type in ("single_choice", "multi_choice"):
                answer_data["correct_option_ids"] = [o.id for o in q.options if o.is_correct]
            elif q.type == "matching":
                answer_data["correct_matches"] = [
                    p.right_text for p in q.matching_pairs
                ]
        answers.append(answer_data)
    data = _serialize_submission(s)
    data["answers"] = answers
    return data


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


@router.get("/exams/{exam_id}/my-submissions")
def my_submissions(
    exam_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Get all submissions for the current student on this exam."""
    subs = submission_crud.get_all_submissions_for_exam_student(db, exam_id, current_user.id)
    exam = exam_crud.get_exam(db, exam_id)
    return ok(data={
        "submissions": [_serialize_submission(s) for s in subs],
        "max_attempts": exam.max_attempts if exam else 1,
        "allow_review": exam.allow_review if exam else False,
        "show_answers_policy": exam.show_answers_policy if exam else "never",
    })


@router.get("/exams/{exam_id}/submissions")
def list_submissions(
    exam_id: str,
    db: Session = Depends(get_db),
    teacher: User = Depends(require_teacher),
):
    subs = submission_crud.get_submissions_for_exam(db, exam_id)
    return ok(data=[_serialize_submission(s) for s in subs])


@router.get("/submissions/my-all")
def my_all_submissions(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """All submissions for the current student across all exams."""
    subs = submission_crud.get_all_submissions_for_student(db, current_user.id)
    result = []
    for s in subs:
        d = _serialize_submission(s)
        d["exam_title"] = s.exam.title if s.exam else None
        d["class_name"] = s.exam.class_.name if s.exam and s.exam.class_ else None
        d["class_id"] = s.exam.class_id if s.exam else None
        d["allow_review"] = s.exam.allow_review if s.exam else False
        d["duration_minutes"] = s.exam.duration_minutes if s.exam else None
        result.append(d)
    return ok(data=result)


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


@router.get("/submissions/{submission_id}/detail")
def get_submission_detail(
    submission_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Get submission with all answers for review."""
    sub = submission_crud.get_submission(db, submission_id)
    if not sub:
        raise HTTPException(status_code=404, detail="Submission not found")
    # Only the student themselves or a teacher can view
    if sub.student_id != current_user.id and current_user.role != "teacher":
        raise HTTPException(status_code=403, detail="Forbidden")
    return ok(data=_serialize_submission_detail(sub))


class GradeAnswerRequest(BaseModel):
    score: float


@router.put("/answers/{answer_id}/grade")
def grade_single_answer(
    answer_id: str,
    data: GradeAnswerRequest,
    db: Session = Depends(get_db),
    teacher: User = Depends(require_teacher),
):
    """Teacher grades a single answer (for text/essay questions)."""
    answer = db.query(AnswerModel).filter(AnswerModel.id == answer_id).first()
    if not answer:
        raise HTTPException(status_code=404, detail="Answer not found")
    if data.score < 0 or data.score > answer.question.points:
        raise HTTPException(status_code=400, detail=f"Điểm phải từ 0 đến {answer.question.points}")
    graded = grade_answer(db, answer=answer, score=data.score, grader_id=teacher.id)
    return ok(data={
        "id": graded.id,
        "score": graded.score,
        "submission_status": graded.submission.status,
        "submission_total_score": graded.submission.total_score,
    }, message="Đã chấm điểm")
