from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.db.session import get_db
from app.schemas.exam import ExamCreate, ExamUpdate, ExamOut
from app.schemas.question import QuestionCreate, QuestionUpdate, QuestionOut
from app.crud import exam as exam_crud
from app.crud import class_crud
from app.core.dependencies import get_current_user, require_teacher
from app.models.user import User
from app.models.question import Question
from app.utils.responses import ok

router = APIRouter(tags=["Exams"])


@router.get("/classes/{class_id}/exams")
def list_exams(
    class_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    exams = exam_crud.get_exams_for_class(db, class_id)
    result = []
    for e in exams:
        d = ExamOut.model_validate(e).model_dump()
        d["question_count"] = len(e.questions)
        result.append(d)
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
    if not exam or exam.creator.id != teacher.id:
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


# Questions -----------

@router.get("/exams/{exam_id}/questions")
def list_questions(
    exam_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    questions = exam_crud.get_questions(db, exam_id)
    return ok(data=[QuestionOut.model_validate(q).model_dump() for q in questions])


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
    exam_crud.delete_question(db, question=question)
    return ok(message="Da xoa cau hoi")
