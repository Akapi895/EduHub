from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.core.dependencies import get_current_user, require_teacher
from app.crud import class_crud
from app.crud import exam as exam_crud
from app.crud import notification as noti_crud
from app.crud import submission as submission_crud
from app.db.session import get_db
from app.models.class_model import ClassStudent
from app.models.exam import Exam as ExamModel
from app.models.question import Question
from app.models.submission import Submission
from app.models.user import User
from app.schemas.exam import ExamCreate, ExamOut, ExamUpdate
from app.schemas.question import QuestionCreate, QuestionOut, QuestionStudentOut, QuestionUpdate
from app.utils.responses import ok

router = APIRouter(tags=["Exams"])


def _student_exam_status(subs: list[Submission]) -> tuple[str, float | None]:
    completed = [submission for submission in subs if submission.status != "in_progress"]
    in_progress = any(submission.status == "in_progress" for submission in subs)
    if completed:
        best = max((submission.total_score for submission in completed if submission.total_score is not None), default=None)
        return "completed", best
    if in_progress:
        return "in_progress", None
    return "not_started", None


def _assert_class_access(db: Session, class_id: str, current_user: User):
    class_ = class_crud.get_class(db, class_id)
    if not class_:
        raise HTTPException(status_code=404, detail="Class not found")

    if current_user.role == "teacher":
        if class_.teacher_id != current_user.id:
            raise HTTPException(status_code=403, detail="Forbidden")
        return class_

    if class_crud.is_member(db, class_id=class_id, user_id=current_user.id):
        return class_

    raise HTTPException(status_code=403, detail="Forbidden")


def _assert_exam_access(db: Session, exam: ExamModel, current_user: User) -> None:
    if current_user.role == "teacher":
        if exam.created_by == current_user.id or (exam.class_ and exam.class_.teacher_id == current_user.id):
            return
        raise HTTPException(status_code=403, detail="Forbidden")

    if class_crud.is_member(db, class_id=exam.class_id, user_id=current_user.id):
        return

    raise HTTPException(status_code=403, detail="Forbidden")


@router.get("/exams/my-all")
def list_my_all_exams(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    if current_user.role != "student":
        raise HTTPException(status_code=403, detail="Only students can access this endpoint")

    memberships = db.query(ClassStudent).filter(ClassStudent.student_id == current_user.id).all()
    class_ids = [membership.class_id for membership in memberships]
    if not class_ids:
        return ok(data=[])

    exams = db.query(ExamModel).filter(ExamModel.class_id.in_(class_ids)).all()
    result = []
    for exam in exams:
        data = ExamOut.model_validate(exam).model_dump()
        data["question_count"] = len(exam.questions)
        data["class_name"] = exam.class_.name if exam.class_ else None
        submissions = submission_crud.get_all_submissions_for_exam_student(db, exam.id, current_user.id)
        data["student_status"], data["best_score"] = _student_exam_status(submissions)
        result.append(data)
    return ok(data=result)


@router.get("/classes/{class_id}/exams")
def list_exams(
    class_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    _assert_class_access(db, class_id, current_user)
    exams = exam_crud.get_exams_for_class(db, class_id)
    result = []
    for exam in exams:
        data = ExamOut.model_validate(exam).model_dump()
        data["question_count"] = len(exam.questions)
        if current_user.role == "student":
            submissions = submission_crud.get_all_submissions_for_exam_student(db, exam.id, current_user.id)
            data["student_status"], data["best_score"] = _student_exam_status(submissions)
        result.append(data)
    return ok(data=result)


@router.post("/classes/{class_id}/exams", status_code=201)
def create_exam(
    class_id: str,
    data: ExamCreate,
    db: Session = Depends(get_db),
    teacher: User = Depends(require_teacher),
):
    class_ = class_crud.get_class(db, class_id)
    if not class_ or class_.teacher_id != teacher.id:
        raise HTTPException(status_code=404, detail="Class not found")

    exam = exam_crud.create_exam(db, class_id=class_id, created_by=teacher.id, data=data)
    student_ids = [member.student_id for member in db.query(ClassStudent).filter(ClassStudent.class_id == class_id).all()]
    if student_ids:
        noti_crud.create_bulk(
            db,
            user_ids=student_ids,
            type="new_exam",
            title="Bai thi moi",
            content=f"Lop {class_.name} vua co bai thi moi: {exam.title}",
            link=f"/student/exam/{exam.id}",
        )
    return ok(data=ExamOut.model_validate(exam).model_dump(), status_code=201)


@router.get("/exams/{exam_id}")
def get_exam(
    exam_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    exam = exam_crud.get_exam(db, exam_id)
    if not exam:
        raise HTTPException(status_code=404, detail="Exam not found")

    _assert_exam_access(db, exam, current_user)

    data = ExamOut.model_validate(exam).model_dump()
    data["question_count"] = len(exam.questions)
    return ok(data=data)


@router.put("/exams/{exam_id}")
def update_exam(
    exam_id: str,
    data: ExamUpdate,
    db: Session = Depends(get_db),
    teacher: User = Depends(require_teacher),
):
    exam = exam_crud.get_exam(db, exam_id)
    if not exam or exam.created_by != teacher.id:
        raise HTTPException(status_code=404, detail="Exam not found")

    updated = exam_crud.update_exam(db, exam=exam, data=data)
    return ok(data=ExamOut.model_validate(updated).model_dump())


@router.delete("/exams/{exam_id}")
def delete_exam(
    exam_id: str,
    db: Session = Depends(get_db),
    teacher: User = Depends(require_teacher),
):
    exam = exam_crud.get_exam(db, exam_id)
    if not exam or exam.created_by != teacher.id:
        raise HTTPException(status_code=404, detail="Exam not found")

    exam_crud.delete_exam(db, exam=exam)
    return ok(message="Da xoa de thi")


@router.get("/exams/{exam_id}/questions")
def list_questions(
    exam_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    exam = exam_crud.get_exam(db, exam_id)
    if not exam:
        raise HTTPException(status_code=404, detail="Exam not found")

    _assert_exam_access(db, exam, current_user)

    if current_user.role == "student":
        submissions = submission_crud.get_all_submissions_for_exam_student(db, exam_id, current_user.id)
        if not submissions:
            raise HTTPException(status_code=403, detail="Ban can bat dau bai thi truoc")
        questions = exam_crud.get_questions(db, exam_id)
        return ok(data=[QuestionStudentOut.model_validate(question).model_dump() for question in questions])

    questions = exam_crud.get_questions(db, exam_id)
    return ok(data=[QuestionOut.model_validate(question).model_dump() for question in questions])


@router.post("/exams/{exam_id}/questions", status_code=201)
def create_question(
    exam_id: str,
    data: QuestionCreate,
    db: Session = Depends(get_db),
    teacher: User = Depends(require_teacher),
):
    exam = exam_crud.get_exam(db, exam_id)
    if not exam or exam.created_by != teacher.id:
        raise HTTPException(status_code=404, detail="Exam not found")

    question = exam_crud.create_question(db, exam_id=exam_id, data=data)
    return ok(data=QuestionOut.model_validate(question).model_dump(), status_code=201)


@router.put("/questions/{question_id}")
def update_question(
    question_id: str,
    data: QuestionUpdate,
    db: Session = Depends(get_db),
    teacher: User = Depends(require_teacher),
):
    question = db.query(Question).filter(Question.id == question_id).first()
    if not question:
        raise HTTPException(status_code=404, detail="Question not found")
    if not question.exam or question.exam.created_by != teacher.id:
        raise HTTPException(status_code=403, detail="Forbidden")

    updated = exam_crud.update_question(db, question=question, data=data)
    return ok(data=QuestionOut.model_validate(updated).model_dump())


@router.delete("/questions/{question_id}")
def delete_question(
    question_id: str,
    db: Session = Depends(get_db),
    teacher: User = Depends(require_teacher),
):
    question = db.query(Question).filter(Question.id == question_id).first()
    if not question:
        raise HTTPException(status_code=404, detail="Question not found")
    if not question.exam or question.exam.created_by != teacher.id:
        raise HTTPException(status_code=403, detail="Forbidden")

    exam_crud.delete_question(db, question=question)
    return ok(message="Da xoa cau hoi")
