from datetime import datetime, timezone
from sqlalchemy.orm import Session
from app.models.submission import Submission, Answer, AnswerOption
from app.utils.enums import SubmissionStatus


class AnswerPayload:
    question_id: str
    text_answer: str | None
    selected_option_ids: list[str]
    uploaded_image_url: str | None


def get_submission(db: Session, submission_id: str) -> Submission | None:
    return db.query(Submission).filter(Submission.id == submission_id).first()


def get_submission_for_exam_student(db: Session, exam_id: str, student_id: str) -> Submission | None:
    return db.query(Submission).filter(
        Submission.exam_id == exam_id, Submission.student_id == student_id
    ).first()


def get_submissions_for_exam(db: Session, exam_id: str) -> list[Submission]:
    return db.query(Submission).filter(Submission.exam_id == exam_id).all()


def start_submission(db: Session, *, exam_id: str, student_id: str) -> Submission:
    submission = Submission(
        exam_id=exam_id,
        student_id=student_id,
        status=SubmissionStatus.in_progress,
    )
    db.add(submission)
    db.commit()
    db.refresh(submission)
    return submission


def submit_exam(db: Session, *, submission: Submission, answers_data: list[dict]) -> Submission:
    for a in answers_data:
        answer = Answer(
            submission_id=submission.id,
            question_id=a["question_id"],
            text_answer=a.get("text_answer"),
            uploaded_image_url=a.get("uploaded_image_url"),
        )
        db.add(answer)
        db.flush()
        for opt_id in a.get("selected_option_ids", []):
            db.add(AnswerOption(answer_id=answer.id, option_id=opt_id))
    submission.submitted_at = datetime.now(timezone.utc).replace(tzinfo=None)
    submission.status = SubmissionStatus.submitted
    db.commit()
    db.refresh(submission)
    return submission
