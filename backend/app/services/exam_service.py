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


def submit_exam(db: Session, *, exam_id: str, student_id: str, answers_data: list[dict]):
    submission = submission_crud.get_submission_for_exam_student(db, exam_id, student_id)
    if not submission:
        raise HTTPException(status_code=404, detail="Submission not found. Please start the exam first.")

    submission = submission_crud.submit_exam(db, submission=submission, answers_data=answers_data)
    # Auto-grade immediately
    db.expire(submission)
    db.refresh(submission)
    submission = auto_grade(db, submission)
    return submission
