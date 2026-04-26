from __future__ import annotations

import uuid
from datetime import datetime

from sqlalchemy.orm import Session, selectinload

from app.models.content_package import (
    ContentPackage,
    ContentPackageAssignment,
    ExamPackageConfig,
)
from app.models.question_bank import (
    QuestionBank,
    QuestionBankItem,
    QuestionItemMatchingLeftItem,
    QuestionItemMatchingRightItem,
    QuestionItemOption,
    QuestionItemTextAcceptedAnswer,
    QuestionItemTextConfig,
    QuestionItemTextKeyword,
)
from app.schemas.exam import ExamCreate, ExamUpdate
from app.schemas.question import QuestionCreate, QuestionUpdate
from app.utils.datetime_utils import now_local_naive, to_local_naive
from app.utils.enums import (
    ContentPackageStatus,
    ContentPackageType,
    ExamStatus,
    QuestionType,
    TextGradingMode,
    TextInputVariant,
)


def _exam_query(db: Session):
    return (
        db.query(ContentPackage)
        .options(
            selectinload(ContentPackage.assignments).selectinload(ContentPackageAssignment.class_),
            selectinload(ContentPackage.exam_config),
            selectinload(ContentPackage.question_bank)
            .selectinload(QuestionBank.items)
            .selectinload(QuestionBankItem.options),
            selectinload(ContentPackage.question_bank)
            .selectinload(QuestionBank.items)
            .selectinload(QuestionBankItem.matching_left_items),
            selectinload(ContentPackage.question_bank)
            .selectinload(QuestionBank.items)
            .selectinload(QuestionBankItem.matching_right_items),
            selectinload(ContentPackage.question_bank)
            .selectinload(QuestionBank.items)
            .selectinload(QuestionBankItem.text_config)
            .selectinload(QuestionItemTextConfig.accepted_answers),
            selectinload(ContentPackage.question_bank)
            .selectinload(QuestionBank.items)
            .selectinload(QuestionBankItem.text_config)
            .selectinload(QuestionItemTextConfig.keywords),
        )
        .filter(ContentPackage.package_type == ContentPackageType.exam)
    )


def _question_query(db: Session):
    return db.query(QuestionBankItem).options(
        selectinload(QuestionBankItem.question_bank).selectinload(QuestionBank.package),
        selectinload(QuestionBankItem.options),
        selectinload(QuestionBankItem.matching_left_items),
        selectinload(QuestionBankItem.matching_right_items),
        selectinload(QuestionBankItem.text_config).selectinload(QuestionItemTextConfig.accepted_answers),
        selectinload(QuestionBankItem.text_config).selectinload(QuestionItemTextConfig.keywords),
    )


def _compute_status(exam: ContentPackage) -> str:
    if not exam.exam_config:
        return ExamStatus.open

    now = now_local_naive()
    if exam.exam_config.start_time and now < exam.exam_config.start_time:
        return ExamStatus.upcoming
    if exam.exam_config.end_time and now > exam.exam_config.end_time:
        return ExamStatus.closed
    return ExamStatus.open


def _assignment_for_exam(exam: ContentPackage, class_id: str | None = None) -> ContentPackageAssignment | None:
    assignments = [assignment for assignment in exam.assignments if assignment.is_active]
    if class_id:
        for assignment in assignments:
            if assignment.class_id == class_id:
                return assignment
    return assignments[0] if assignments else None


def serialize_exam(exam: ContentPackage, *, class_id: str | None = None) -> dict:
    assignment = _assignment_for_exam(exam, class_id)
    exam_config = exam.exam_config
    items = sorted(
        [item for item in (exam.question_bank.items if exam.question_bank else []) if item.is_active],
        key=lambda item: item.order_index,
    )
    return {
        "id": exam.id,
        "class_id": assignment.class_id if assignment else None,
        "class_name": assignment.class_.name if assignment and assignment.class_ else None,
        "title": exam.title,
        "description": exam.description,
        "thumbnail_url": exam.thumbnail_url,
        "start_time": exam_config.start_time if exam_config else None,
        "end_time": exam_config.end_time if exam_config else None,
        "duration_minutes": exam_config.duration_minutes if exam_config else None,
        "shuffle_questions": exam_config.shuffle_questions if exam_config else False,
        "max_attempts": exam_config.max_attempts if exam_config else 1,
        "allow_review": exam_config.allow_review if exam_config else True,
        "show_answers_policy": exam_config.show_answers_policy if exam_config else "never",
        "status": _compute_status(exam),
        "created_by": exam.created_by,
        "created_at": exam.created_at,
        "question_count": len(items),
    }


def _serialize_text_config(text_config: QuestionItemTextConfig | None) -> dict | None:
    if not text_config:
        return None
    return {
        "input_variant": text_config.input_variant,
        "grading_mode": text_config.grading_mode,
        "min_length": text_config.min_length,
        "max_length": text_config.max_length,
        "case_sensitive": text_config.case_sensitive,
        "accent_sensitive": text_config.accent_sensitive,
        "trim_whitespace": text_config.trim_whitespace,
        "ignore_punctuation": text_config.ignore_punctuation,
    }


def serialize_question(question: QuestionBankItem, *, exam_id: str, include_correct: bool) -> dict:
    right_by_key = {
        item.right_key: item.content
        for item in sorted(question.matching_right_items, key=lambda pair: pair.order_index)
    }
    matching_pairs = []
    for left_item in sorted(question.matching_left_items, key=lambda pair: pair.order_index):
        pair = {
            "id": left_item.id,
            "left_text": left_item.content,
            "right_text": right_by_key.get(left_item.correct_right_key, ""),
        }
        if include_correct:
            pair["correct_match"] = right_by_key.get(left_item.correct_right_key, "")
        matching_pairs.append(pair)

    options = [
        {
            "id": option.id,
            "content": option.content,
            **({"is_correct": option.is_correct} if include_correct else {}),
            "order_index": option.order_index,
        }
        for option in sorted(question.options, key=lambda item: item.order_index)
    ]

    return {
        "id": question.id,
        "exam_id": exam_id,
        "type": question.type,
        "content": question.content,
        "instruction": question.instruction,
        "explanation": question.explanation,
        "difficulty_band": question.difficulty_band,
        "points": question.points,
        "required": question.required,
        "order_index": question.order_index,
        "options": options,
        "matching_pairs": matching_pairs,
        "text_config": _serialize_text_config(question.text_config),
        "created_at": question.created_at,
    }


def get_exams_for_class(db: Session, class_id: str) -> list[ContentPackage]:
    exams = (
        _exam_query(db)
        .join(ContentPackageAssignment, ContentPackageAssignment.package_id == ContentPackage.id)
        .filter(ContentPackageAssignment.class_id == class_id, ContentPackageAssignment.is_active.is_(True))
        .all()
    )
    return exams


def get_exam(db: Session, exam_id: str) -> ContentPackage | None:
    return _exam_query(db).filter(ContentPackage.id == exam_id).first()


def create_exam(db: Session, *, class_id: str, created_by: str, data: ExamCreate) -> ContentPackage:
    now = now_local_naive()
    exam = ContentPackage(
        package_type=ContentPackageType.exam,
        title=data.title,
        description=data.description,
        thumbnail_url=data.thumbnail_url,
        status=ContentPackageStatus.published,
        created_by=created_by,
        published_at=now,
    )
    db.add(exam)
    db.flush()

    db.add(
        ContentPackageAssignment(
            package_id=exam.id,
            class_id=class_id,
            assigned_by=created_by,
            is_active=True,
        )
    )
    db.add(
        ExamPackageConfig(
            package_id=exam.id,
            start_time=to_local_naive(data.start_time),
            end_time=to_local_naive(data.end_time),
            duration_minutes=data.duration_minutes,
            shuffle_questions=data.shuffle_questions,
            max_attempts=data.max_attempts,
            allow_review=data.allow_review,
            show_answers_policy=data.show_answers_policy,
        )
    )
    db.add(QuestionBank(package_id=exam.id, created_by=created_by))
    db.commit()
    return get_exam(db, exam.id)  # type: ignore[return-value]


def update_exam(db: Session, *, exam: ContentPackage, data: ExamUpdate) -> ContentPackage:
    update_data = data.model_dump(exclude_unset=True)
    package_fields = {"title", "description", "thumbnail_url"}
    config_fields = {
        "start_time",
        "end_time",
        "duration_minutes",
        "shuffle_questions",
        "max_attempts",
        "allow_review",
        "show_answers_policy",
    }

    for field in package_fields:
        if field in update_data:
            setattr(exam, field, update_data[field])
    if not exam.exam_config:
        exam.exam_config = ExamPackageConfig(package_id=exam.id)
    for field in config_fields:
        if field in update_data:
            value = update_data[field]
            if field in {"start_time", "end_time"}:
                value = to_local_naive(value)
            setattr(exam.exam_config, field, value)

    db.commit()
    return get_exam(db, exam.id)  # type: ignore[return-value]


def delete_exam(db: Session, *, exam: ContentPackage) -> None:
    db.delete(exam)
    db.commit()


def get_questions(db: Session, exam_id: str) -> list[QuestionBankItem]:
    exam = get_exam(db, exam_id)
    if not exam or not exam.question_bank:
        return []
    return sorted(
        [item for item in exam.question_bank.items if item.is_active],
        key=lambda item: item.order_index,
    )


def get_question(db: Session, question_id: str) -> QuestionBankItem | None:
    return _question_query(db).filter(QuestionBankItem.id == question_id).first()


def _clear_question_children(db: Session, question: QuestionBankItem) -> None:
    for option in list(question.options):
        db.delete(option)
    for pair in list(question.matching_left_items):
        db.delete(pair)
    for pair in list(question.matching_right_items):
        db.delete(pair)
    if question.text_config:
        for answer in list(question.text_config.accepted_answers):
            db.delete(answer)
        for keyword in list(question.text_config.keywords):
            db.delete(keyword)
        db.delete(question.text_config)
    db.flush()


def _apply_question_children(db: Session, *, question: QuestionBankItem, payload: QuestionCreate | QuestionUpdate) -> None:
    if question.type in (QuestionType.single_choice, QuestionType.multi_choice):
        for idx, option in enumerate(payload.options or []):
            db.add(
                QuestionItemOption(
                    question_item_id=question.id,
                    option_key=str(uuid.uuid4()),
                    content=option.content,
                    is_correct=option.is_correct,
                    order_index=idx,
                )
            )

    if question.type == QuestionType.matching:
        for idx, pair in enumerate(payload.matching_pairs or []):
            right_key = str(uuid.uuid4())
            db.add(
                QuestionItemMatchingRightItem(
                    question_item_id=question.id,
                    right_key=right_key,
                    content=pair.right_text,
                    order_index=idx,
                )
            )
            db.add(
                QuestionItemMatchingLeftItem(
                    question_item_id=question.id,
                    left_key=str(uuid.uuid4()),
                    content=pair.left_text,
                    correct_right_key=right_key,
                    order_index=idx,
                )
            )

    if question.type == QuestionType.text:
        text_config_data = payload.text_config
        grading_mode = text_config_data.grading_mode if text_config_data else TextGradingMode.manual
        text_config = QuestionItemTextConfig(
            question_item_id=question.id,
            input_variant=(text_config_data.input_variant if text_config_data else TextInputVariant.paragraph),
            grading_mode=grading_mode,
            min_length=text_config_data.min_length if text_config_data else None,
            max_length=text_config_data.max_length if text_config_data else None,
            case_sensitive=text_config_data.case_sensitive if text_config_data else False,
            accent_sensitive=text_config_data.accent_sensitive if text_config_data else False,
            trim_whitespace=text_config_data.trim_whitespace if text_config_data else True,
            ignore_punctuation=text_config_data.ignore_punctuation if text_config_data else True,
            manual_grading_required=grading_mode == TextGradingMode.manual,
        )
        db.add(text_config)
        db.flush()

        for idx, answer in enumerate((text_config_data.accepted_answers if text_config_data else [])):
            db.add(
                QuestionItemTextAcceptedAnswer(
                    text_config_id=text_config.id,
                    answer_text=answer,
                    normalized_answer=None,
                    score_ratio=1.0,
                    order_index=idx,
                )
            )
        for keyword in (text_config_data.keywords if text_config_data else []):
            db.add(
                QuestionItemTextKeyword(
                    text_config_id=text_config.id,
                    keyword=keyword,
                    weight=1.0,
                    is_required=False,
                    match_mode="contains",
                )
            )


def create_question(db: Session, *, exam_id: str, data: QuestionCreate) -> QuestionBankItem:
    exam = get_exam(db, exam_id)
    if not exam or not exam.question_bank:
        raise ValueError("Exam question bank not found")

    question = QuestionBankItem(
        question_bank_id=exam.question_bank.id,
        type=data.type,
        difficulty_band=data.difficulty_band,
        content=data.content,
        instruction=data.instruction,
        explanation=data.explanation,
        points=data.points,
        required=data.required,
        order_index=data.order_index,
        created_by=exam.created_by,
    )
    db.add(question)
    db.flush()
    _apply_question_children(db, question=question, payload=data)
    db.commit()
    return get_question(db, question.id)  # type: ignore[return-value]


def update_question(db: Session, *, question: QuestionBankItem, data: QuestionUpdate) -> QuestionBankItem:
    update_data = data.model_dump(exclude_unset=True)
    child_fields = {"options", "matching_pairs", "text_config"}
    previous_type = question.type

    for field, value in update_data.items():
        if field in child_fields:
            continue
        setattr(question, field, value)

    should_rebuild_children = any(field in update_data for field in child_fields) or ("type" in update_data and update_data["type"] != previous_type)
    if should_rebuild_children:
        _clear_question_children(db, question)
        _apply_question_children(db, question=question, payload=data)
    db.commit()
    return get_question(db, question.id)  # type: ignore[return-value]


def delete_question(db: Session, *, question: QuestionBankItem) -> None:
    db.delete(question)
    db.commit()
