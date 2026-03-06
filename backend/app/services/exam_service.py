from datetime import datetime, timezone, timedelta
from sqlalchemy.orm import Session
from fastapi import HTTPException, status as http_status
from app.crud import exam as exam_crud
from app.crud import submission as submission_crud
from app.services.grading_service import auto_grade
from app.utils.enums import ExamStatus


def start_exam(db: Session, *, exam_id: str, student_id: str):
    exam = exam_crud.get_exam(db, exam_id)
    if not exam:
        raise HTTPException(status_code=404, detail="Exam not found")
    if exam.status == ExamStatus.upcoming:
        raise HTTPException(status_code=400, detail="Exam has not started yet")
    if exam.status == ExamStatus.closed:
        raise HTTPException(status_code=400, detail="Exam is closed")

    # Check for active in-progress submission
    existing = submission_crud.get_submission_for_exam_student(db, exam_id, student_id)
    if existing:
        return existing  # resume

    # Check max attempts
    all_subs = submission_crud.get_all_submissions_for_exam_student(db, exam_id, student_id)
    if len(all_subs) >= exam.max_attempts:
        raise HTTPException(status_code=400, detail="Bạn đã hết lượt làm bài")

    return submission_crud.start_submission(db, exam_id=exam_id, student_id=student_id)


def _get_deadline(exam, submission) -> datetime | None:
    """Calculate the effective deadline = min(started_at + duration, end_time)."""
    candidates = []
    if exam.end_time:
        candidates.append(exam.end_time)
    if exam.duration_minutes and submission.started_at:
        candidates.append(submission.started_at + timedelta(minutes=exam.duration_minutes))
    return min(candidates) if candidates else None


def submit_exam(db: Session, *, exam_id: str, student_id: str, answers_data: list[dict]):
    submission = submission_crud.get_submission_for_exam_student(db, exam_id, student_id)
    if not submission:
        raise HTTPException(status_code=404, detail="Submission not found. Please start the exam first.")

    # Enforce time limit
    exam = exam_crud.get_exam(db, exam_id)
    if exam:
        deadline = _get_deadline(exam, submission)
        if deadline:
            now = datetime.now()
            # Allow 30-second grace period for network latency
            if now > deadline + timedelta(seconds=30):
                raise HTTPException(status_code=400, detail="Đã hết thời gian làm bài")

    submission = submission_crud.submit_exam(db, submission=submission, answers_data=answers_data)
    # Auto-grade immediately
    db.expire(submission)
    db.refresh(submission)
    submission = auto_grade(db, submission)
    return submission
