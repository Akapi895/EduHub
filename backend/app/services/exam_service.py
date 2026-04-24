from datetime import datetime, timedelta

from fastapi import HTTPException
from sqlalchemy.orm import Session

from app.crud import class_crud
from app.crud import exam as exam_crud
from app.crud import submission as submission_crud
from app.services.grading_service import auto_grade
from app.utils.enums import ExamStatus


def start_exam(db: Session, *, exam_id: str, student_id: str):
    exam = exam_crud.get_exam(db, exam_id)
    if not exam:
        raise HTTPException(status_code=404, detail="Exam not found")
    if not class_crud.is_member(db, class_id=exam.class_id, user_id=student_id):
        raise HTTPException(status_code=403, detail="Ban khong co quyen truy cap bai thi nay")
    if exam.status == ExamStatus.upcoming:
        raise HTTPException(status_code=400, detail="Exam has not started yet")
    if exam.status == ExamStatus.closed:
        raise HTTPException(status_code=400, detail="Exam is closed")

    existing = submission_crud.get_submission_for_exam_student(db, exam_id, student_id)
    if existing:
        return existing

    all_submissions = submission_crud.get_all_submissions_for_exam_student(db, exam_id, student_id)
    if len(all_submissions) >= exam.max_attempts:
        raise HTTPException(status_code=400, detail="Ban da het luot lam bai")

    return submission_crud.start_submission(db, exam_id=exam_id, student_id=student_id)


def _get_deadline(exam, submission) -> datetime | None:
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

    exam = exam_crud.get_exam(db, exam_id)
    if not exam:
        raise HTTPException(status_code=404, detail="Exam not found")

    deadline = _get_deadline(exam, submission)
    if deadline:
        now = datetime.now()
        if now > deadline + timedelta(seconds=30):
            raise HTTPException(status_code=400, detail="Da het thoi gian lam bai")

    question_lookup = {question.id: question for question in exam.questions}
    seen_question_ids: set[str] = set()
    for answer in answers_data:
        question_id = answer.get("question_id")
        question = question_lookup.get(question_id)
        if not question:
            raise HTTPException(status_code=400, detail="Du lieu cau tra loi khong hop le")
        if question_id in seen_question_ids:
            raise HTTPException(status_code=400, detail="Moi cau hoi chi duoc nop mot lan")
        seen_question_ids.add(question_id)

        selected_option_ids = answer.get("selected_option_ids") or []
        valid_option_ids = {option.id for option in question.options}
        if selected_option_ids:
            if not set(selected_option_ids).issubset(valid_option_ids):
                raise HTTPException(status_code=400, detail="Lua chon cau tra loi khong hop le")
            if question.type == "single_choice" and len(selected_option_ids) > 1:
                raise HTTPException(status_code=400, detail="Cau hoi mot dap an chi duoc chon toi da mot lua chon")

    submission = submission_crud.submit_exam(db, submission=submission, answers_data=answers_data)
    db.expire(submission)
    db.refresh(submission)
    submission = auto_grade(db, submission)
    return submission
