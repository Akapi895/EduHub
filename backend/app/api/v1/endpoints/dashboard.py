from datetime import datetime, timezone

from fastapi import APIRouter, Depends
from sqlalchemy import func
from sqlalchemy.orm import Session

from app.db.session import get_db
from app.crud import class_crud, exam as exam_crud, submission as submission_crud
from app.core.dependencies import get_current_user
from app.models.user import User
from app.models.exam import Exam
from app.models.submission import Submission, Answer
from app.models.class_model import Class, ClassStudent, ClassMaterial
from app.utils.enums import ExamStatus, SubmissionStatus
from app.utils.responses import ok

router = APIRouter(tags=["Dashboard"])


def _compute_status(exam: Exam) -> str:
    now = datetime.now(timezone.utc).replace(tzinfo=None)
    if exam.start_time and now < exam.start_time:
        return ExamStatus.upcoming
    if exam.end_time and now > exam.end_time:
        return ExamStatus.closed
    return ExamStatus.open


@router.get("/dashboard/teacher")
def teacher_dashboard(db: Session = Depends(get_db), teacher: User = Depends(get_current_user)):
    classes = class_crud.get_classes_for_user(db, teacher.id, "teacher")
    total_classes = len(classes)
    total_students = sum(len(c.students) for c in classes)
    class_ids = [c.id for c in classes]

    # Batch-load all exams for teacher's classes
    all_exams: list[Exam] = []
    if class_ids:
        all_exams = db.query(Exam).filter(Exam.class_id.in_(class_ids)).all()
        for e in all_exams:
            e.status = _compute_status(e)

    exam_ids = [e.id for e in all_exams]

    # Upcoming exams — full details for display
    upcoming_exams = sorted(
        [e for e in all_exams if e.status == ExamStatus.upcoming],
        key=lambda e: e.start_time or datetime.max,
    )[:5]

    # Ungraded submissions: submitted but total_score is null
    ungraded_count = 0
    recent_submissions_data: list[dict] = []
    if exam_ids:
        ungraded_q = (
            db.query(Submission)
            .filter(
                Submission.exam_id.in_(exam_ids),
                Submission.status == SubmissionStatus.submitted,
                Submission.total_score.is_(None),
            )
            .order_by(Submission.submitted_at.desc())
        )
        ungraded_count = ungraded_q.count()
        recent_subs = ungraded_q.limit(5).all()
        for s in recent_subs:
            recent_submissions_data.append({
                "id": s.id,
                "student_name": s.student.full_name if s.student else None,
                "exam_id": s.exam_id,
                "exam_title": s.exam.title if s.exam else None,
                "class_name": s.exam.class_.name if s.exam and s.exam.class_ else None,
                "submitted_at": s.submitted_at.isoformat() if s.submitted_at else None,
                "total_score": s.total_score,
            })

    # Batch counts for classes
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
            db.query(Exam.class_id, func.count(Exam.id))
            .filter(Exam.class_id.in_(class_ids))
            .group_by(Exam.class_id)
            .all()
        )

    return ok(data={
        "total_classes": total_classes,
        "total_students": total_students,
        "total_exams": len(all_exams),
        "ungraded_count": ungraded_count,
        "recent_submissions": recent_submissions_data,
        "upcoming_exams": [
            {
                "id": e.id,
                "title": e.title,
                "class_name": e.class_.name if e.class_ else None,
                "start_time": e.start_time.isoformat() if e.start_time else None,
                "question_count": len(e.questions),
            }
            for e in upcoming_exams
        ],
        "classes": [
            {
                "id": c.id,
                "name": c.name,
                "description": c.description,
                "thumbnail_url": c.thumbnail_url,
                "student_count": len(c.students),
                "material_count": material_counts.get(c.id, 0),
                "exam_count": exam_counts.get(c.id, 0),
            }
            for c in classes
        ],
    })


@router.get("/dashboard/student")
def student_dashboard(db: Session = Depends(get_db), student: User = Depends(get_current_user)):
    classes = class_crud.get_classes_for_user(db, student.id, "student")
    total_classes = len(classes)
    class_ids = [c.id for c in classes]

    # Batch-load all exams from enrolled classes
    all_exams: list[Exam] = []
    if class_ids:
        all_exams = db.query(Exam).filter(Exam.class_id.in_(class_ids)).all()
        for e in all_exams:
            e.status = _compute_status(e)

    # All submissions for this student
    all_submissions = (
        db.query(Submission)
        .filter(Submission.student_id == student.id)
        .order_by(Submission.submitted_at.desc())
        .all()
    )

    # Build exam→submissions lookup
    exam_subs: dict[str, list[Submission]] = {}
    for s in all_submissions:
        exam_subs.setdefault(s.exam_id, []).append(s)

    # Compute per-exam student status
    completed_exam_ids: set[str] = set()
    scores: list[float] = []
    for exam_id, subs in exam_subs.items():
        completed = [s for s in subs if s.status != SubmissionStatus.in_progress]
        if completed:
            completed_exam_ids.add(exam_id)
            best = max((s.total_score for s in completed if s.total_score is not None), default=None)
            if best is not None:
                scores.append(best)

    completed_count = len(completed_exam_ids)
    average_score = round(sum(scores) / len(scores), 1) if scores else None

    # Todo exams: open/upcoming AND not yet completed
    todo_exams_list = [
        e for e in all_exams
        if e.status in (ExamStatus.open, ExamStatus.upcoming) and e.id not in completed_exam_ids
    ]
    # Sort: open first, then upcoming; within each group by start_time
    status_order = {ExamStatus.open: 0, ExamStatus.upcoming: 1}
    todo_exams_list.sort(key=lambda e: (status_order.get(e.status, 2), e.start_time or datetime.max))
    todo_exams_data = []
    for e in todo_exams_list[:6]:
        subs = exam_subs.get(e.id, [])
        in_progress = any(s.status == SubmissionStatus.in_progress for s in subs)
        todo_exams_data.append({
            "id": e.id,
            "class_id": e.class_id,
            "title": e.title,
            "description": e.description,
            "thumbnail_url": e.thumbnail_url,
            "class_name": e.class_.name if e.class_ else None,
            "status": e.status,
            "start_time": e.start_time.isoformat() if e.start_time else None,
            "end_time": e.end_time.isoformat() if e.end_time else None,
            "question_count": len(e.questions),
            "student_status": "in_progress" if in_progress else "not_started",
            "best_score": None,
        })

    # Recent results: completed submissions (newest first), max 5
    completed_subs = [s for s in all_submissions if s.status != SubmissionStatus.in_progress][:5]
    recent_results = [
        {
            "submission_id": s.id,
            "exam_id": s.exam_id,
            "exam_title": s.exam.title if s.exam else None,
            "class_name": s.exam.class_.name if s.exam and s.exam.class_ else None,
            "total_score": s.total_score,
            "status": s.status,
            "submitted_at": s.submitted_at.isoformat() if s.submitted_at else None,
            "allow_review": s.exam.allow_review if s.exam else False,
        }
        for s in completed_subs
    ]

    # Batch counts for class cards
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
            db.query(Exam.class_id, func.count(Exam.id))
            .filter(Exam.class_id.in_(class_ids))
            .group_by(Exam.class_id)
            .all()
        )
        student_counts = dict(
            db.query(ClassStudent.class_id, func.count(ClassStudent.id))
            .filter(ClassStudent.class_id.in_(class_ids))
            .group_by(ClassStudent.class_id)
            .all()
        )

    return ok(data={
        "total_classes": total_classes,
        "completed_exams": completed_count,
        "average_score": average_score,
        "todo_exam_count": len(todo_exams_list),
        "todo_exams": todo_exams_data,
        "recent_results": recent_results,
        "classes": [
            {
                "id": c.id,
                "name": c.name,
                "description": c.description,
                "thumbnail_url": c.thumbnail_url,
                "teacher_name": c.teacher.full_name if c.teacher else None,
                "student_count": student_counts.get(c.id, 0),
                "material_count": material_counts.get(c.id, 0),
                "exam_count": exam_counts_map.get(c.id, 0),
            }
            for c in classes
        ],
        # Backward compat
        "total_exams": len(all_exams),
        "upcoming_exams": len([e for e in all_exams if e.status == ExamStatus.upcoming]),
        "pending_submissions": len([s for s in all_submissions if s.status == SubmissionStatus.in_progress]),
    })
