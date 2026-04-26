from datetime import datetime

from fastapi import APIRouter, Depends
from sqlalchemy import func
from sqlalchemy.orm import Session, selectinload

from app.db.session import get_db
from app.crud import class_crud
from app.crud.exam import _compute_status
from app.core.dependencies import get_current_user
from app.models.class_model import ClassMaterial, ClassStudent
from app.models.content_package import ContentPackage, ContentPackageAssignment
from app.models.package_attempt import PackageAttempt
from app.models.user import User
from app.utils.enums import ExamStatus
from app.utils.responses import ok

router = APIRouter(tags=["Dashboard"])


def _load_exam_packages_for_classes(db: Session, class_ids: list[str]) -> list[ContentPackage]:
    if not class_ids:
        return []
    return (
        db.query(ContentPackage)
        .options(
            selectinload(ContentPackage.assignments).selectinload(ContentPackageAssignment.class_),
            selectinload(ContentPackage.exam_config),
            selectinload(ContentPackage.question_bank),
        )
        .join(ContentPackageAssignment, ContentPackageAssignment.package_id == ContentPackage.id)
        .filter(
            ContentPackage.package_type == "exam",
            ContentPackageAssignment.class_id.in_(class_ids),
            ContentPackageAssignment.is_active.is_(True),
        )
        .all()
    )


def _assignment_for_class(package: ContentPackage, class_id: str | None = None) -> ContentPackageAssignment | None:
    active = [assignment for assignment in package.assignments if assignment.is_active]
    if class_id:
        for assignment in active:
            if assignment.class_id == class_id:
                return assignment
    return active[0] if active else None


@router.get("/dashboard/teacher")
def teacher_dashboard(db: Session = Depends(get_db), teacher: User = Depends(get_current_user)):
    classes = class_crud.get_classes_for_user(db, teacher.id, "teacher")
    total_classes = len(classes)
    total_students = sum(len(c.students) for c in classes)
    class_ids = [c.id for c in classes]

    all_exams = _load_exam_packages_for_classes(db, class_ids)
    for exam in all_exams:
        exam.runtime_status = _compute_status(exam)  # type: ignore[attr-defined]

    exam_ids = [exam.id for exam in all_exams]
    upcoming_exams = sorted(
        [exam for exam in all_exams if getattr(exam, "runtime_status", None) == ExamStatus.upcoming],
        key=lambda exam: exam.exam_config.start_time if exam.exam_config and exam.exam_config.start_time else datetime.max,
    )[:5]

    ungraded_count = 0
    recent_submissions_data: list[dict] = []
    if exam_ids:
        ungraded_q = (
            db.query(PackageAttempt)
            .options(selectinload(PackageAttempt.package).selectinload(ContentPackage.assignments).selectinload(ContentPackageAssignment.class_), selectinload(PackageAttempt.user))
            .filter(
                PackageAttempt.package_id.in_(exam_ids),
                PackageAttempt.status == "submitted",
            )
            .order_by(PackageAttempt.submitted_at.desc())
        )
        ungraded_count = ungraded_q.count()
        for submission in ungraded_q.limit(5).all():
            assignment = _assignment_for_class(submission.package)
            recent_submissions_data.append(
                {
                    "id": submission.id,
                    "student_name": submission.user.full_name if submission.user else None,
                    "exam_id": submission.package_id,
                    "exam_title": submission.package.title if submission.package else None,
                    "class_name": assignment.class_.name if assignment and assignment.class_ else None,
                    "submitted_at": submission.submitted_at.isoformat() if submission.submitted_at else None,
                    "total_score": submission.score_total,
                }
            )

    material_counts: dict[str, int] = {}
    exam_counts: dict[str, int] = {}
    if class_ids:
        material_counts = dict(
            db.query(ClassMaterial.class_id, func.count(ClassMaterial.id))
            .filter(ClassMaterial.class_id.in_(class_ids))
            .group_by(ClassMaterial.class_id)
            .all()
        )
        exam_counts = dict(
            db.query(ContentPackageAssignment.class_id, func.count(ContentPackageAssignment.id))
            .join(ContentPackage, ContentPackage.id == ContentPackageAssignment.package_id)
            .filter(
                ContentPackageAssignment.class_id.in_(class_ids),
                ContentPackage.package_type == "exam",
            )
            .group_by(ContentPackageAssignment.class_id)
            .all()
        )

    return ok(
        data={
            "total_classes": total_classes,
            "total_students": total_students,
            "total_exams": len(all_exams),
            "ungraded_count": ungraded_count,
            "recent_submissions": recent_submissions_data,
            "upcoming_exams": [
                {
                    "id": exam.id,
                    "title": exam.title,
                    "class_name": _assignment_for_class(exam).class_.name if _assignment_for_class(exam) and _assignment_for_class(exam).class_ else None,
                    "start_time": exam.exam_config.start_time.isoformat() if exam.exam_config and exam.exam_config.start_time else None,
                    "question_count": len(exam.question_bank.items) if exam.question_bank else 0,
                }
                for exam in upcoming_exams
            ],
            "classes": [
                {
                    "id": class_.id,
                    "name": class_.name,
                    "description": class_.description,
                    "thumbnail_url": class_.thumbnail_url,
                    "student_count": len(class_.students),
                    "material_count": material_counts.get(class_.id, 0),
                    "exam_count": exam_counts.get(class_.id, 0),
                }
                for class_ in classes
            ],
        }
    )


@router.get("/dashboard/student")
def student_dashboard(db: Session = Depends(get_db), student: User = Depends(get_current_user)):
    classes = class_crud.get_classes_for_user(db, student.id, "student")
    total_classes = len(classes)
    class_ids = [c.id for c in classes]

    all_exams = _load_exam_packages_for_classes(db, class_ids)
    for exam in all_exams:
        exam.runtime_status = _compute_status(exam)  # type: ignore[attr-defined]

    exam_ids = [exam.id for exam in all_exams]
    all_submissions = (
        db.query(PackageAttempt)
        .options(selectinload(PackageAttempt.package).selectinload(ContentPackage.assignments).selectinload(ContentPackageAssignment.class_))
        .filter(
            PackageAttempt.user_id == student.id,
            PackageAttempt.package_id.in_(exam_ids) if exam_ids else False,
        )
        .order_by(PackageAttempt.submitted_at.desc(), PackageAttempt.started_at.desc())
        .all()
        if exam_ids
        else []
    )

    exam_subs: dict[str, list[PackageAttempt]] = {}
    for submission in all_submissions:
        exam_subs.setdefault(submission.package_id, []).append(submission)

    completed_exam_ids: set[str] = set()
    scores: list[float] = []
    for exam_id, submissions in exam_subs.items():
        completed = [submission for submission in submissions if submission.status != "in_progress"]
        if completed:
            completed_exam_ids.add(exam_id)
            best = max((submission.score_total for submission in completed if submission.score_total is not None), default=None)
            if best is not None:
                scores.append(best)

    completed_count = len(completed_exam_ids)
    average_score = round(sum(scores) / len(scores), 1) if scores else None

    todo_exams_list = [
        exam
        for exam in all_exams
        if getattr(exam, "runtime_status", None) in (ExamStatus.open, ExamStatus.upcoming) and exam.id not in completed_exam_ids
    ]
    status_order = {ExamStatus.open: 0, ExamStatus.upcoming: 1}
    todo_exams_list.sort(
        key=lambda exam: (
            status_order.get(getattr(exam, "runtime_status", ""), 2),
            exam.exam_config.start_time if exam.exam_config and exam.exam_config.start_time else datetime.max,
        )
    )

    todo_exams_data = []
    for exam in todo_exams_list[:6]:
        submissions = exam_subs.get(exam.id, [])
        in_progress = any(submission.status == "in_progress" for submission in submissions)
        assignment = _assignment_for_class(exam)
        todo_exams_data.append(
            {
                "id": exam.id,
                "class_id": assignment.class_id if assignment else None,
                "title": exam.title,
                "description": exam.description,
                "thumbnail_url": exam.thumbnail_url,
                "class_name": assignment.class_.name if assignment and assignment.class_ else None,
                "status": getattr(exam, "runtime_status", ExamStatus.open),
                "start_time": exam.exam_config.start_time.isoformat() if exam.exam_config and exam.exam_config.start_time else None,
                "end_time": exam.exam_config.end_time.isoformat() if exam.exam_config and exam.exam_config.end_time else None,
                "question_count": len(exam.question_bank.items) if exam.question_bank else 0,
                "student_status": "in_progress" if in_progress else "not_started",
                "best_score": None,
            }
        )

    completed_subs = [submission for submission in all_submissions if submission.status != "in_progress"][:5]
    recent_results = []
    for submission in completed_subs:
        assignment = _assignment_for_class(submission.package)
        recent_results.append(
            {
                "submission_id": submission.id,
                "exam_id": submission.package_id,
                "exam_title": submission.package.title if submission.package else None,
                "class_name": assignment.class_.name if assignment and assignment.class_ else None,
                "total_score": submission.score_total,
                "status": submission.status,
                "submitted_at": submission.submitted_at.isoformat() if submission.submitted_at else None,
                "allow_review": submission.package.exam_config.allow_review if submission.package and submission.package.exam_config else False,
            }
        )

    material_counts: dict[str, int] = {}
    exam_counts_map: dict[str, int] = {}
    student_counts: dict[str, int] = {}
    if class_ids:
        material_counts = dict(
            db.query(ClassMaterial.class_id, func.count(ClassMaterial.id))
            .filter(ClassMaterial.class_id.in_(class_ids))
            .group_by(ClassMaterial.class_id)
            .all()
        )
        exam_counts_map = dict(
            db.query(ContentPackageAssignment.class_id, func.count(ContentPackageAssignment.id))
            .join(ContentPackage, ContentPackage.id == ContentPackageAssignment.package_id)
            .filter(
                ContentPackageAssignment.class_id.in_(class_ids),
                ContentPackage.package_type == "exam",
            )
            .group_by(ContentPackageAssignment.class_id)
            .all()
        )
        student_counts = dict(
            db.query(ClassStudent.class_id, func.count(ClassStudent.id))
            .filter(ClassStudent.class_id.in_(class_ids))
            .group_by(ClassStudent.class_id)
            .all()
        )

    return ok(
        data={
            "total_classes": total_classes,
            "completed_exams": completed_count,
            "average_score": average_score,
            "todo_exam_count": len(todo_exams_list),
            "todo_exams": todo_exams_data,
            "recent_results": recent_results,
            "classes": [
                {
                    "id": class_.id,
                    "name": class_.name,
                    "description": class_.description,
                    "thumbnail_url": class_.thumbnail_url,
                    "teacher_name": class_.teacher.full_name if class_.teacher else None,
                    "student_count": student_counts.get(class_.id, 0),
                    "material_count": material_counts.get(class_.id, 0),
                    "exam_count": exam_counts_map.get(class_.id, 0),
                }
                for class_ in classes
            ],
            "total_exams": len(all_exams),
            "upcoming_exams": len([exam for exam in all_exams if getattr(exam, "runtime_status", None) == ExamStatus.upcoming]),
            "pending_submissions": len([submission for submission in all_submissions if submission.status == "in_progress"]),
        }
    )
