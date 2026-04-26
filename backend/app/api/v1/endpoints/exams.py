from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.core.dependencies import get_current_user, require_teacher
from app.crud import class_crud
from app.crud import exam as exam_crud
from app.crud import notification as noti_crud
from app.crud import submission as submission_crud
from app.db.session import get_db
from app.models.class_model import ClassStudent
from app.models.package_attempt import PackageAttempt
from app.models.user import User
from app.schemas.exam import ExamCreate, ExamUpdate
from app.schemas.question import QuestionCreate, QuestionUpdate
from app.utils.responses import ok

router = APIRouter(tags=["Exams"])


def _student_exam_status(subs: list[PackageAttempt]) -> tuple[str, float | None]:
    completed = [submission for submission in subs if submission.status != "in_progress"]
    in_progress = any(submission.status == "in_progress" for submission in subs)
    if completed:
        best = max((submission.score_total for submission in completed if submission.score_total is not None), default=None)
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


def _assert_exam_access(db: Session, exam, current_user: User) -> None:
    if current_user.role == "teacher":
        if exam.created_by == current_user.id:
            return
        if any(assignment.class_ and assignment.class_.teacher_id == current_user.id for assignment in exam.assignments):
            return
        raise HTTPException(status_code=403, detail="Forbidden")

    if any(class_crud.is_member(db, class_id=assignment.class_id, user_id=current_user.id) for assignment in exam.assignments):
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

    exams_map = {}
    for class_id in class_ids:
        for exam in exam_crud.get_exams_for_class(db, class_id):
            exams_map[exam.id] = exam

    result = []
    for exam in exams_map.values():
        data = exam_crud.serialize_exam(exam)
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
        data = exam_crud.serialize_exam(exam, class_id=class_id)
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
            title="Bài thi mới",
            content=f"Lớp {class_.name} vừa có bài thi mới: {exam.title}",
            link=f"/student/exam/{exam.id}",
        )
    return ok(data=exam_crud.serialize_exam(exam, class_id=class_id), status_code=201)


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
    return ok(data=exam_crud.serialize_exam(exam))


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
    return ok(data=exam_crud.serialize_exam(updated))


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
    return ok(message="Đã xóa đề thi")


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
        in_progress = submission_crud.get_submission_for_exam_student(db, exam_id, current_user.id)
        if in_progress:
            question_attempts = submission_crud.get_presented_questions_for_submission(db, in_progress.id)
            data = [
                exam_crud.serialize_question(item.question_item, exam_id=exam_id, include_correct=False)
                for item in question_attempts
            ]
            return ok(data=data)

        questions = exam_crud.get_questions(db, exam_id)
        return ok(data=[exam_crud.serialize_question(question, exam_id=exam_id, include_correct=False) for question in questions])

    questions = exam_crud.get_questions(db, exam_id)
    return ok(data=[exam_crud.serialize_question(question, exam_id=exam_id, include_correct=True) for question in questions])


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
    return ok(data=exam_crud.serialize_question(question, exam_id=exam_id, include_correct=True), status_code=201)


@router.put("/questions/{question_id}")
def update_question(
    question_id: str,
    data: QuestionUpdate,
    db: Session = Depends(get_db),
    teacher: User = Depends(require_teacher),
):
    question = exam_crud.get_question(db, question_id)
    if not question:
        raise HTTPException(status_code=404, detail="Question not found")
    if not question.question_bank or not question.question_bank.package or question.question_bank.package.created_by != teacher.id:
        raise HTTPException(status_code=403, detail="Forbidden")

    updated = exam_crud.update_question(db, question=question, data=data)
    return ok(data=exam_crud.serialize_question(updated, exam_id=updated.question_bank.package_id, include_correct=True))


@router.delete("/questions/{question_id}")
def delete_question(
    question_id: str,
    db: Session = Depends(get_db),
    teacher: User = Depends(require_teacher),
):
    question = exam_crud.get_question(db, question_id)
    if not question:
        raise HTTPException(status_code=404, detail="Question not found")
    if not question.question_bank or not question.question_bank.package or question.question_bank.package.created_by != teacher.id:
        raise HTTPException(status_code=403, detail="Forbidden")

    exam_crud.delete_question(db, question=question)
    return ok(message="Đã xóa câu hỏi")
