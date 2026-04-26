from __future__ import annotations

import json
import random

from sqlalchemy.orm import Session, selectinload

from app.models.content_package import ContentPackage, ContentPackageAssignment
from app.models.package_attempt import (
    PackageAttempt,
    PackageQuestionAttempt,
    QuestionAttemptMatchingAnswer,
    QuestionAttemptSelectedOption,
    QuestionAttemptTextAnswer,
    QuestionAttemptUploadedAsset,
)
from app.models.question_bank import (
    QuestionBankItem,
)
from app.utils.datetime_utils import now_local_naive
from app.utils.enums import PackageAttemptStatus, QuestionSourceContext, QuestionType


def _attempt_query(db: Session):
    return db.query(PackageAttempt).options(
        selectinload(PackageAttempt.package)
        .selectinload(ContentPackage.assignments)
        .selectinload(ContentPackageAssignment.class_),
        selectinload(PackageAttempt.package).selectinload(ContentPackage.exam_config),
        selectinload(PackageAttempt.question_attempts)
        .selectinload(PackageQuestionAttempt.question_item)
        .selectinload(QuestionBankItem.options),
        selectinload(PackageAttempt.question_attempts)
        .selectinload(PackageQuestionAttempt.question_item)
        .selectinload(QuestionBankItem.matching_left_items),
        selectinload(PackageAttempt.question_attempts)
        .selectinload(PackageQuestionAttempt.question_item)
        .selectinload(QuestionBankItem.matching_right_items),
        selectinload(PackageAttempt.question_attempts).selectinload(PackageQuestionAttempt.selected_options),
        selectinload(PackageAttempt.question_attempts).selectinload(PackageQuestionAttempt.matching_answers),
        selectinload(PackageAttempt.question_attempts).selectinload(PackageQuestionAttempt.text_answer),
        selectinload(PackageAttempt.user),
    )


def get_submission(db: Session, submission_id: str) -> PackageAttempt | None:
    return _attempt_query(db).filter(PackageAttempt.id == submission_id).first()


def get_submission_for_exam_student(db: Session, exam_id: str, student_id: str) -> PackageAttempt | None:
    return (
        _attempt_query(db)
        .filter(
            PackageAttempt.package_id == exam_id,
            PackageAttempt.user_id == student_id,
            PackageAttempt.status == PackageAttemptStatus.in_progress,
        )
        .first()
    )


def get_all_submissions_for_exam_student(db: Session, exam_id: str, student_id: str) -> list[PackageAttempt]:
    return (
        _attempt_query(db)
        .filter(PackageAttempt.package_id == exam_id, PackageAttempt.user_id == student_id)
        .order_by(PackageAttempt.started_at.desc())
        .all()
    )


def get_submissions_for_exam(db: Session, exam_id: str) -> list[PackageAttempt]:
    return (
        _attempt_query(db)
        .filter(PackageAttempt.package_id == exam_id)
        .order_by(PackageAttempt.submitted_at.desc(), PackageAttempt.started_at.desc())
        .all()
    )


def get_all_submissions_for_student(db: Session, student_id: str) -> list[PackageAttempt]:
    return (
        _attempt_query(db)
        .filter(PackageAttempt.user_id == student_id)
        .order_by(PackageAttempt.started_at.desc())
        .all()
    )


def start_submission(
    db: Session,
    *,
    exam_id: str,
    student_id: str,
    class_id: str | None,
    question_items: list[QuestionBankItem],
    shuffle_questions: bool,
) -> PackageAttempt:
    attempt_index = (
        db.query(PackageAttempt)
        .filter(PackageAttempt.package_id == exam_id, PackageAttempt.user_id == student_id)
        .count()
        + 1
    )

    submission = PackageAttempt(
        package_id=exam_id,
        user_id=student_id,
        class_id=class_id,
        attempt_index=attempt_index,
        status=PackageAttemptStatus.in_progress,
        started_at=now_local_naive(),
    )
    db.add(submission)
    db.flush()

    ordered_questions = list(question_items)
    if shuffle_questions:
        random.shuffle(ordered_questions)

    presented_at = now_local_naive()
    for idx, question_item in enumerate(ordered_questions):
        db.add(
            PackageQuestionAttempt(
                package_attempt_id=submission.id,
                question_item_id=question_item.id,
                source_context=QuestionSourceContext.exam_sequence,
                display_order=idx,
                difficulty_band_snapshot=question_item.difficulty_band,
                presented_at=presented_at,
            )
        )

    db.commit()
    return get_submission(db, submission.id)  # type: ignore[return-value]


def get_presented_questions_for_submission(db: Session, submission_id: str) -> list[PackageQuestionAttempt]:
    submission = get_submission(db, submission_id)
    if not submission:
        return []
    return sorted(
        submission.question_attempts,
        key=lambda attempt: (attempt.display_order if attempt.display_order is not None else 10**6, attempt.presented_at),
    )


def _clear_question_attempt_children(db: Session, question_attempt: PackageQuestionAttempt) -> None:
    for item in list(question_attempt.selected_options):
        db.delete(item)
    for item in list(question_attempt.matching_answers):
        db.delete(item)
    if question_attempt.text_answer:
        db.delete(question_attempt.text_answer)
    for asset in list(question_attempt.uploaded_assets):
        db.delete(asset)
    db.flush()


def submit_exam(db: Session, *, submission: PackageAttempt, answers_data: list[dict]) -> PackageAttempt:
    attempt_lookup = {attempt.question_item_id: attempt for attempt in submission.question_attempts}

    for answer in answers_data:
        question_attempt = attempt_lookup.get(answer["question_id"])
        if not question_attempt:
            continue

        _clear_question_attempt_children(db, question_attempt)
        question_attempt.answered_at = now_local_naive()
        question_item = question_attempt.question_item

        if question_item.type in (QuestionType.single_choice, QuestionType.multi_choice):
            for option_id in answer.get("selected_option_ids", []):
                db.add(
                    QuestionAttemptSelectedOption(
                        question_attempt_id=question_attempt.id,
                        option_id=option_id,
                    )
                )

        elif question_item.type == QuestionType.matching:
            selected_values: list[str] = []
            try:
                selected_values = json.loads(answer.get("text_answer") or "[]")
            except (TypeError, json.JSONDecodeError):
                selected_values = []

            left_items = sorted(question_item.matching_left_items, key=lambda item: item.order_index)
            right_items = {
                item.content: item.right_key
                for item in sorted(question_item.matching_right_items, key=lambda item: item.order_index)
            }

            for idx, left_item in enumerate(left_items):
                selected_value = selected_values[idx] if idx < len(selected_values) else ""
                db.add(
                    QuestionAttemptMatchingAnswer(
                        question_attempt_id=question_attempt.id,
                        left_item_id=left_item.id,
                        selected_right_key=right_items.get(selected_value) if selected_value else None,
                    )
                )

        elif question_item.type == QuestionType.text:
            raw_answer = answer.get("text_answer") or ""
            db.add(
                QuestionAttemptTextAnswer(
                    question_attempt_id=question_attempt.id,
                    raw_answer=raw_answer,
                    normalized_answer=None,
                    grading_mode_snapshot=(
                        question_item.text_config.grading_mode if question_item.text_config else None
                    ),
                )
            )

        elif question_item.type == QuestionType.image_upload and answer.get("uploaded_image_url"):
            db.add(
                QuestionAttemptUploadedAsset(
                    question_attempt_id=question_attempt.id,
                    asset_url=answer["uploaded_image_url"],
                    asset_type="image",
                )
            )

    submission.submitted_at = now_local_naive()
    submission.status = PackageAttemptStatus.submitted
    db.commit()
    return get_submission(db, submission.id)  # type: ignore[return-value]
