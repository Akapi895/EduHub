from __future__ import annotations

from datetime import timedelta

from fastapi import HTTPException
from sqlalchemy.orm import Session

from app.crud import class_crud
from app.crud import exam as exam_crud
from app.crud import submission as submission_crud
from app.services.grading_service import auto_grade
from app.utils.datetime_utils import now_local_naive
from app.utils.enums import ExamStatus, PackageAttemptStatus


def _assigned_class_ids(exam) -> list[str]:
    return [assignment.class_id for assignment in exam.assignments if assignment.is_active]


def start_exam(db: Session, *, exam_id: str, student_id: str):
    exam = exam_crud.get_exam(db, exam_id)
    if not exam:
        raise HTTPException(status_code=404, detail="Exam not found")

    assigned_class_ids = _assigned_class_ids(exam)
    class_id = next((cid for cid in assigned_class_ids if class_crud.is_member(db, class_id=cid, user_id=student_id)), None)
    if not class_id:
        raise HTTPException(status_code=403, detail="Ban khong co quyen truy cap bai thi nay")

    status = exam_crud._compute_status(exam)
    if status == ExamStatus.upcoming:
        raise HTTPException(status_code=400, detail="Exam has not started yet")
    if status == ExamStatus.closed:
        raise HTTPException(status_code=400, detail="Exam is closed")

    existing = submission_crud.get_submission_for_exam_student(db, exam_id, student_id)
    if existing:
        return existing

    all_submissions = submission_crud.get_all_submissions_for_exam_student(db, exam_id, student_id)
    max_attempts = exam.exam_config.max_attempts if exam.exam_config else 1
    if len(all_submissions) >= max_attempts:
        raise HTTPException(status_code=400, detail="Ban da het luot lam bai")

    question_items = exam_crud.get_questions(db, exam_id)
    return submission_crud.start_submission(
        db,
        exam_id=exam_id,
        student_id=student_id,
        class_id=class_id,
        question_items=question_items,
        shuffle_questions=bool(exam.exam_config.shuffle_questions if exam.exam_config else False),
    )


def _get_deadline(exam, submission) -> datetime | None:
    candidates = []
    config = exam.exam_config
    if config and config.end_time:
        candidates.append(config.end_time)
    if config and config.duration_minutes and submission.started_at:
        candidates.append(submission.started_at + timedelta(minutes=config.duration_minutes))
    return min(candidates) if candidates else None


def submit_exam(db: Session, *, exam_id: str, student_id: str, answers_data: list[dict]):
    submission = submission_crud.get_submission_for_exam_student(db, exam_id, student_id)
    if not submission:
        raise HTTPException(status_code=404, detail="Submission not found. Please start the exam first.")
    if submission.status != PackageAttemptStatus.in_progress:
        raise HTTPException(status_code=400, detail="Bai thi da duoc nop")

    exam = exam_crud.get_exam(db, exam_id)
    if not exam:
        raise HTTPException(status_code=404, detail="Exam not found")

    deadline = _get_deadline(exam, submission)
    if deadline:
        now = now_local_naive()
        if now > deadline + timedelta(seconds=30):
            raise HTTPException(status_code=400, detail="Da het thoi gian lam bai")

    attempt_lookup = {attempt.question_item_id: attempt for attempt in submission.question_attempts}
    seen_question_ids: set[str] = set()
    for answer in answers_data:
        question_id = answer.get("question_id")
        question_attempt = attempt_lookup.get(question_id)
        if not question_attempt:
            raise HTTPException(status_code=400, detail="Du lieu cau tra loi khong hop le")
        if question_id in seen_question_ids:
            raise HTTPException(status_code=400, detail="Moi cau hoi chi duoc nop mot lan")
        seen_question_ids.add(question_id)

        selected_option_ids = answer.get("selected_option_ids") or []
        valid_option_ids = {option.id for option in question_attempt.question_item.options}
        if selected_option_ids and not set(selected_option_ids).issubset(valid_option_ids):
            raise HTTPException(status_code=400, detail="Lua chon cau tra loi khong hop le")
        if question_attempt.question_item.type == "single_choice" and len(selected_option_ids) > 1:
            raise HTTPException(status_code=400, detail="Cau hoi mot dap an chi duoc chon toi da mot lua chon")

    submission = submission_crud.submit_exam(db, submission=submission, answers_data=answers_data)
    submission = auto_grade(db, submission)
    return submission
