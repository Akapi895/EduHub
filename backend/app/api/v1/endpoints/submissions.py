from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlalchemy.orm import Session

from app.core.dependencies import get_current_user, require_student, require_teacher
from app.crud import class_crud
from app.crud import exam as exam_crud
from app.crud import notification as noti_crud
from app.crud import submission as submission_crud
from app.db.session import get_db
from app.models.submission import Answer as AnswerModel
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
        "exam_id": submission.exam_id,
        "student_id": submission.student_id,
        "student_name": submission.student.full_name if submission.student else None,
        "started_at": submission.started_at.isoformat() if submission.started_at else None,
        "submitted_at": submission.submitted_at.isoformat() if submission.submitted_at else None,
        "total_score": submission.total_score,
        "status": submission.status,
    }


def _serialize_submission_detail(submission):
    is_completed = submission.status != "in_progress"
    answers = []
    for answer in submission.answers:
        answer_data = {
            "id": answer.id,
            "question_id": answer.question_id,
            "text_answer": answer.text_answer,
            "selected_option_ids": [option.option_id for option in answer.selected_options],
            "score": answer.score,
        }
        if is_completed and answer.question:
            question = answer.question
            if question.type in ("single_choice", "multi_choice"):
                answer_data["correct_option_ids"] = [option.id for option in question.options if option.is_correct]
            elif question.type == "matching":
                answer_data["correct_matches"] = [pair.right_text for pair in question.matching_pairs]
        answers.append(answer_data)
    data = _serialize_submission(submission)
    data["answers"] = answers
    return data


def _assert_teacher_exam_access(exam, teacher: User) -> None:
    if not exam or exam.created_by != teacher.id:
        raise HTTPException(status_code=403, detail="Forbidden")


def _assert_submission_access(submission, current_user: User) -> None:
    if submission.student_id == current_user.id:
        return
    if current_user.role == "teacher" and submission.exam and submission.exam.created_by == current_user.id:
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
            title="Hoc sinh nop bai",
            content=f"{current_user.full_name} da nop bai thi: {exam.title}",
            link=f"/teacher/exams/{exam.id}",
        )
    return ok(data=_serialize_submission(submission), message="Nop bai thanh cong")


@router.get("/exams/{exam_id}/my-submissions")
def my_submissions(
    exam_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_student),
):
    exam = exam_crud.get_exam(db, exam_id)
    if not exam:
        raise HTTPException(status_code=404, detail="Exam not found")
    if not class_crud.is_member(db, class_id=exam.class_id, user_id=current_user.id):
        raise HTTPException(status_code=403, detail="Forbidden")

    submissions = submission_crud.get_all_submissions_for_exam_student(db, exam_id, current_user.id)
    return ok(
        data={
            "submissions": [_serialize_submission(submission) for submission in submissions],
            "max_attempts": exam.max_attempts,
            "allow_review": exam.allow_review,
            "show_answers_policy": exam.show_answers_policy,
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
        data = _serialize_submission(submission)
        data["exam_title"] = submission.exam.title if submission.exam else None
        data["class_name"] = submission.exam.class_.name if submission.exam and submission.exam.class_ else None
        data["class_id"] = submission.exam.class_id if submission.exam else None
        data["allow_review"] = submission.exam.allow_review if submission.exam else False
        data["duration_minutes"] = submission.exam.duration_minutes if submission.exam else None
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
    answer = db.query(AnswerModel).filter(AnswerModel.id == answer_id).first()
    if not answer:
        raise HTTPException(status_code=404, detail="Answer not found")
    if not answer.question or not answer.question.exam or answer.question.exam.created_by != teacher.id:
        raise HTTPException(status_code=403, detail="Forbidden")
    if data.score < 0 or data.score > answer.question.points:
        raise HTTPException(status_code=400, detail=f"Diem phai tu 0 den {answer.question.points}")

    graded = grade_answer(db, answer=answer, score=data.score, grader_id=teacher.id)
    return ok(
        data={
            "id": graded.id,
            "score": graded.score,
            "submission_status": graded.submission.status,
            "submission_total_score": graded.submission.total_score,
        },
        message="Da cham diem",
    )
