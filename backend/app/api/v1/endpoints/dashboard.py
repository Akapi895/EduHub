from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.db.session import get_db
from app.crud import class_crud, exam as exam_crud, submission as submission_crud
from app.core.dependencies import get_current_user
from app.models.user import User
from app.models.submission import Submission
from app.utils.responses import ok

router = APIRouter(tags=["Dashboard"])


@router.get("/dashboard/teacher")
def teacher_dashboard(db: Session = Depends(get_db), teacher: User = Depends(get_current_user)):
    classes = class_crud.get_classes_for_user(db, teacher.id, "teacher")
    total_classes = len(classes)
    total_students = sum(len(c.students) for c in classes)

    # Exams across all classes
    all_exams = []
    for c in classes:
        all_exams.extend(exam_crud.get_exams_for_class(db, c.id))

    upcoming_exams = [e for e in all_exams if e.status == "upcoming"]

    return ok(data={
        "total_classes": total_classes,
        "total_students": total_students,
        "total_exams": len(all_exams),
        "upcoming_exams": len(upcoming_exams),
        "classes": [{"id": c.id, "name": c.name, "student_count": len(c.students)} for c in classes],
    })


@router.get("/dashboard/student")
def student_dashboard(db: Session = Depends(get_db), student: User = Depends(get_current_user)):
    classes = class_crud.get_classes_for_user(db, student.id, "student")
    total_classes = len(classes)

    all_exams = []
    for c in classes:
        all_exams.extend(exam_crud.get_exams_for_class(db, c.id))

    upcoming_exams = [e for e in all_exams if e.status == "upcoming"]
    submissions = db.query(Submission).filter_by(student_id=student.id).all()
    pending = [s for s in submissions if s.status == "in_progress"]

    return ok(data={
        "total_classes": total_classes,
        "total_exams": len(all_exams),
        "upcoming_exams": len(upcoming_exams),
        "pending_submissions": len(pending),
        "classes": [{"id": c.id, "name": c.name} for c in classes],
    })
