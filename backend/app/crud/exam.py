from datetime import datetime, timezone
from sqlalchemy.orm import Session
from app.models.exam import Exam
from app.models.question import Question, QuestionOption, MatchingPair
from app.schemas.exam import ExamCreate, ExamUpdate
from app.schemas.question import QuestionCreate, QuestionUpdate
from app.utils.enums import ExamStatus


def _compute_status(exam: Exam) -> str:
    now = datetime.now(timezone.utc).replace(tzinfo=None)
    if exam.start_time and now < exam.start_time:
        return ExamStatus.upcoming
    if exam.end_time and now > exam.end_time:
        return ExamStatus.closed
    return ExamStatus.open


def get_exams_for_class(db: Session, class_id: str) -> list[Exam]:
    exams = db.query(Exam).filter(Exam.class_id == class_id).all()
    for e in exams:
        e.status = _compute_status(e)
    return exams


def get_exam(db: Session, exam_id: str) -> Exam | None:
    return db.query(Exam).filter(Exam.id == exam_id).first()


def create_exam(db: Session, *, class_id: str, created_by: str, data: ExamCreate) -> Exam:
    exam = Exam(**data.model_dump(), class_id=class_id, created_by=created_by)
    exam.status = _compute_status(exam)
    db.add(exam)
    db.commit()
    db.refresh(exam)
    return exam


def update_exam(db: Session, *, exam: Exam, data: ExamUpdate) -> Exam:
    for field, value in data.model_dump(exclude_unset=True).items():
        setattr(exam, field, value)
    exam.status = _compute_status(exam)
    db.commit()
    db.refresh(exam)
    return exam


def delete_exam(db: Session, *, exam: Exam) -> None:
    db.delete(exam)
    db.commit()


# Questions -----------

def get_questions(db: Session, exam_id: str) -> list[Question]:
    return db.query(Question).filter(Question.exam_id == exam_id).order_by(Question.order_index).all()


def create_question(db: Session, *, exam_id: str, data: QuestionCreate) -> Question:
    q = Question(
        exam_id=exam_id,
        type=data.type,
        content=data.content,
        instruction=data.instruction,
        points=data.points,
        required=data.required,
        order_index=data.order_index,
    )
    db.add(q)
    db.flush()  # get q.id before adding children
    for opt in data.options:
        db.add(QuestionOption(question_id=q.id, **opt.model_dump()))
    for pair in data.matching_pairs:
        db.add(MatchingPair(question_id=q.id, **pair.model_dump()))
    db.commit()
    db.refresh(q)
    return q


def update_question(db: Session, *, question: Question, data: QuestionUpdate) -> Question:
    update_data = data.model_dump(exclude_unset=True)
    options_data = update_data.pop("options", None)
    for field, value in update_data.items():
        setattr(question, field, value)
    if options_data is not None:
        # Replace all options
        for opt in question.options:
            db.delete(opt)
        db.flush()
        for opt in options_data:
            db.add(QuestionOption(question_id=question.id, **opt))
    db.commit()
    db.refresh(question)
    return question


def delete_question(db: Session, *, question: Question) -> None:
    db.delete(question)
    db.commit()
