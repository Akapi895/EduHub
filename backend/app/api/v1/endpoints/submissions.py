import json

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlalchemy.orm import Session

from app.core.dependencies import get_current_user, require_student, require_teacher
from app.crud import class_crud
from app.crud import exam as exam_crud
from app.crud import notification as noti_crud
from app.crud import submission as submission_crud
from app.db.session import get_db
from app.models.package_attempt import PackageQuestionAttempt
from app.models.user import User
from app.services import exam_service
from app.services.grading_service import grade_answer
from app.utils.responses import ok

router = APIRouter(tags=["Submissions"])


class AnswerItem(BaseModel):
    question_id: str
    text_answer: str | None = None
    selected_option_ids: list[str] = []
    uploaded_image_url: str | None = None


class SubmitRequest(BaseModel):
    answers: list[AnswerItem]


def _serialize_submission(submission):
    return {
        "id": submission.id,
        "exam_id": submission.package_id,
        "student_id": submission.user_id,
        "student_name": submission.user.full_name if submission.user else None,
        "started_at": submission.started_at.isoformat() if submission.started_at else None,
        "submitted_at": submission.submitted_at.isoformat() if submission.submitted_at else None,
        "total_score": submission.score_total,
        "status": submission.status,
    }


def _matching_student_values(question_attempt: PackageQuestionAttempt) -> list[str]:
    right_by_key = {
        item.right_key: item.content
        for item in sorted(question_attempt.question_item.matching_right_items, key=lambda pair: pair.order_index)
    }
    answer_by_left = {
        answer.left_item_id: answer.selected_right_key
        for answer in question_attempt.matching_answers
    }
    values = []
    for left_item in sorted(question_attempt.question_item.matching_left_items, key=lambda pair: pair.order_index):
        selected_key = answer_by_left.get(left_item.id)
        values.append(right_by_key.get(selected_key or "", "") if selected_key else "")
    return values


def _matching_correct_values(question_attempt: PackageQuestionAttempt) -> list[str]:
    right_by_key = {
        item.right_key: item.content
        for item in sorted(question_attempt.question_item.matching_right_items, key=lambda pair: pair.order_index)
    }
    return [
        right_by_key.get(left_item.correct_right_key, "")
        for left_item in sorted(question_attempt.question_item.matching_left_items, key=lambda pair: pair.order_index)
    ]


def _serialize_submission_detail(submission):
    is_completed = submission.status != "in_progress"
    answers = []
    ordered_attempts = sorted(
        submission.question_attempts,
        key=lambda item: (item.display_order if item.display_order is not None else 10**6, item.presented_at),
    )
    for question_attempt in ordered_attempts:
        question_item = question_attempt.question_item
        answer_data = {
            "id": question_attempt.id,
            "question_id": question_item.id,
            "text_answer": None,
            "selected_option_ids": [option.option_id for option in question_attempt.selected_options],
            "score": question_attempt.score_awarded,
        }
        if question_attempt.text_answer:
            answer_data["text_answer"] = question_attempt.text_answer.raw_answer
        elif question_item.type == "matching":
            answer_data["text_answer"] = json.dumps(_matching_student_values(question_attempt))

        if is_completed:
            if question_item.type in ("single_choice", "multi_choice"):
                answer_data["correct_option_ids"] = [option.id for option in question_item.options if option.is_correct]
            elif question_item.type == "matching":
                answer_data["correct_matches"] = _matching_correct_values(question_attempt)
        answers.append(answer_data)
    data = _serialize_submission(submission)
    data["answers"] = answers
    return data


def _assert_teacher_exam_access(exam, teacher: User) -> None:
    if not exam or exam.created_by != teacher.id:
        raise HTTPException(status_code=403, detail="Forbidden")


def _assert_submission_access(submission, current_user: User) -> None:
    if submission.user_id == current_user.id:
        return
    if current_user.role == "teacher" and submission.package and submission.package.created_by == current_user.id:
        return
    raise HTTPException(status_code=403, detail="Forbidden")


@router.post("/exams/{exam_id}/start")
def start_exam(
    exam_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_student),
):
    submission = exam_service.start_exam(db, exam_id=exam_id, student_id=current_user.id)
    return ok(data=_serialize_submission(submission))


@router.post("/exams/{exam_id}/submit")
def submit_exam(
    exam_id: str,
    data: SubmitRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_student),
):
    answers_data = [answer.model_dump() for answer in data.answers]
    submission = exam_service.submit_exam(db, exam_id=exam_id, student_id=current_user.id, answers_data=answers_data)
    exam = exam_crud.get_exam(db, exam_id)
    if exam:
        noti_crud.create(
            db,
            user_id=exam.created_by,
            type="exam_submitted",
            title="Học sinh nộp bài",
            content=f"{current_user.full_name} đã nộp bài thi: {exam.title}",
            link=f"/teacher/exams/{exam.id}",
        )
    return ok(data=_serialize_submission(submission), message="Nộp bài thành công")


@router.get("/exams/{exam_id}/my-submissions")
def my_submissions(
    exam_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_student),
):
    exam = exam_crud.get_exam(db, exam_id)
    if not exam:
        raise HTTPException(status_code=404, detail="Exam not found")
    if not any(class_crud.is_member(db, class_id=assignment.class_id, user_id=current_user.id) for assignment in exam.assignments):
        raise HTTPException(status_code=403, detail="Forbidden")

    submissions = submission_crud.get_all_submissions_for_exam_student(db, exam_id, current_user.id)
    return ok(
        data={
            "submissions": [_serialize_submission(submission) for submission in submissions],
            "max_attempts": exam.exam_config.max_attempts if exam.exam_config else 1,
            "allow_review": exam.exam_config.allow_review if exam.exam_config else True,
            "show_answers_policy": exam.exam_config.show_answers_policy if exam.exam_config else "never",
        }
    )


@router.get("/exams/{exam_id}/submissions")
def list_submissions(
    exam_id: str,
    db: Session = Depends(get_db),
    teacher: User = Depends(require_teacher),
):
    exam = exam_crud.get_exam(db, exam_id)
    if not exam:
        raise HTTPException(status_code=404, detail="Exam not found")
    _assert_teacher_exam_access(exam, teacher)

    submissions = submission_crud.get_submissions_for_exam(db, exam_id)
    return ok(data=[_serialize_submission(submission) for submission in submissions])


@router.get("/submissions/my-all")
def my_all_submissions(
    db: Session = Depends(get_db),
    current_user: User = Depends(require_student),
):
    submissions = submission_crud.get_all_submissions_for_student(db, current_user.id)
    result = []
    for submission in submissions:
        if not submission.package or submission.package.package_type != "exam":
            continue
        data = _serialize_submission(submission)
        assignment = next((item for item in submission.package.assignments if item.is_active), None)
        data["exam_title"] = submission.package.title if submission.package else None
        data["class_name"] = assignment.class_.name if assignment and assignment.class_ else None
        data["class_id"] = assignment.class_id if assignment else None
        data["allow_review"] = submission.package.exam_config.allow_review if submission.package and submission.package.exam_config else False
        data["duration_minutes"] = submission.package.exam_config.duration_minutes if submission.package and submission.package.exam_config else None
        result.append(data)
    return ok(data=result)


@router.get("/submissions/{submission_id}")
def get_submission(
    submission_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    submission = submission_crud.get_submission(db, submission_id)
    if not submission:
        raise HTTPException(status_code=404, detail="Submission not found")
    _assert_submission_access(submission, current_user)
    return ok(data=_serialize_submission(submission))


@router.get("/submissions/{submission_id}/detail")
def get_submission_detail(
    submission_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    submission = submission_crud.get_submission(db, submission_id)
    if not submission:
        raise HTTPException(status_code=404, detail="Submission not found")
    _assert_submission_access(submission, current_user)
    return ok(data=_serialize_submission_detail(submission))


class GradeAnswerRequest(BaseModel):
    score: float


@router.put("/answers/{answer_id}/grade")
def grade_single_answer(
    answer_id: str,
    data: GradeAnswerRequest,
    db: Session = Depends(get_db),
    teacher: User = Depends(require_teacher),
):
    question_attempt = (
        db.query(PackageQuestionAttempt)
        .filter(PackageQuestionAttempt.id == answer_id)
        .first()
    )
    if not question_attempt:
        raise HTTPException(status_code=404, detail="Answer not found")
    if not question_attempt.package_attempt or not question_attempt.package_attempt.package or question_attempt.package_attempt.package.created_by != teacher.id:
        raise HTTPException(status_code=403, detail="Forbidden")
    if data.score < 0 or data.score > question_attempt.question_item.points:
        raise HTTPException(status_code=400, detail=f"Diem phai tu 0 den {question_attempt.question_item.points}")

    graded = grade_answer(db, question_attempt=question_attempt, score=data.score, grader_id=teacher.id)
    return ok(
        data={
            "id": graded.id,
            "score": graded.score_awarded,
            "submission_status": graded.package_attempt.status,
            "submission_total_score": graded.package_attempt.score_total,
        },
        message="Đã chấm điểm",
    )
