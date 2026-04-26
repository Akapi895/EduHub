from __future__ import annotations

import random
from typing import Any

from sqlalchemy.orm import Session, selectinload

from app.crud import exam as exam_crud
from app.models.content_package import (
    ContentPackage,
    ContentPackageAssignment,
    GamePackageConfig,
)
from app.models.game_module import GameModule, GameModuleTriggerMapping
from app.models.package_attempt import (
    PackageAttempt,
    PackageQuestionAttempt,
    QuestionAttemptMatchingAnswer,
    QuestionAttemptSelectedOption,
    QuestionAttemptTextAnswer,
    QuestionAttemptUploadedAsset,
)
from app.models.question_bank import QuestionBank, QuestionBankItem, QuestionItemTextConfig
from app.schemas.game_package import GamePackageCreate, GamePackageUpdate
from app.schemas.question import QuestionCreate, QuestionUpdate
from app.utils.datetime_utils import now_local_naive
from app.utils.enums import (
    ContentPackageStatus,
    ContentPackageType,
    DifficultyBand,
    GameModuleStatus,
    PackageAttemptStatus,
    QuestionSourceContext,
    QuestionType,
    TextGradingMode,
)


def _game_package_query(db: Session):
    return (
        db.query(ContentPackage)
        .options(
            selectinload(ContentPackage.assignments).selectinload(ContentPackageAssignment.class_),
            selectinload(ContentPackage.game_config)
            .selectinload(GamePackageConfig.game_module)
            .selectinload(GameModule.trigger_mappings),
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
        .filter(ContentPackage.package_type == ContentPackageType.game)
    )


def _game_module_query(db: Session):
    return db.query(GameModule).options(selectinload(GameModule.trigger_mappings))


def _attempt_query(db: Session):
    return db.query(PackageAttempt).options(
        selectinload(PackageAttempt.package)
        .selectinload(ContentPackage.assignments)
        .selectinload(ContentPackageAssignment.class_),
        selectinload(PackageAttempt.package)
        .selectinload(ContentPackage.game_config)
        .selectinload(GamePackageConfig.game_module)
        .selectinload(GameModule.trigger_mappings),
        selectinload(PackageAttempt.question_attempts)
        .selectinload(PackageQuestionAttempt.question_item)
        .selectinload(QuestionBankItem.options),
        selectinload(PackageAttempt.question_attempts)
        .selectinload(PackageQuestionAttempt.question_item)
        .selectinload(QuestionBankItem.matching_left_items),
        selectinload(PackageAttempt.question_attempts)
        .selectinload(PackageQuestionAttempt.question_item)
        .selectinload(QuestionBankItem.matching_right_items),
        selectinload(PackageAttempt.question_attempts)
        .selectinload(PackageQuestionAttempt.question_item)
        .selectinload(QuestionBankItem.text_config)
        .selectinload(QuestionItemTextConfig.accepted_answers),
        selectinload(PackageAttempt.question_attempts)
        .selectinload(PackageQuestionAttempt.question_item)
        .selectinload(QuestionBankItem.text_config)
        .selectinload(QuestionItemTextConfig.keywords),
        selectinload(PackageAttempt.question_attempts).selectinload(PackageQuestionAttempt.selected_options),
        selectinload(PackageAttempt.question_attempts).selectinload(PackageQuestionAttempt.matching_answers),
        selectinload(PackageAttempt.question_attempts).selectinload(PackageQuestionAttempt.text_answer),
        selectinload(PackageAttempt.runtime_events),
    )


def ensure_default_game_modules(db: Session) -> None:
    module = _game_module_query(db).filter(GameModule.slug == "gold-miner").first()
    if module:
        return

    module = GameModule(
        slug="gold-miner",
        title="Thợ mỏ vàng",
        description="Gold Miner game module chạy trong iframe sandbox.",
        runtime_kind="iframe",
        manifest_url="/game-modules/gold-miner/manifest.json",
        status=GameModuleStatus.active,
        capability_config={
            "bridge": True,
            "question_modal": True,
            "timer_pause": True,
        },
    )
    db.add(module)
    db.flush()

    mappings = [
        ("rock", DifficultyBand.recognition),
        ("small_gold", DifficultyBand.comprehension),
        ("big_gold", DifficultyBand.application_basic),
        ("diamond", DifficultyBand.application_advanced),
    ]
    for trigger_value, difficulty_band in mappings:
        db.add(
            GameModuleTriggerMapping(
                game_module_id=module.id,
                trigger_type="item_captured",
                trigger_key="item_type",
                trigger_value=trigger_value,
                difficulty_band=difficulty_band,
                selector_strategy="random_no_repeat",
                is_active=True,
            )
        )
    db.commit()


def serialize_game_module(module: GameModule) -> dict[str, Any]:
    return {
        "id": module.id,
        "slug": module.slug,
        "title": module.title,
        "description": module.description,
        "runtime_kind": module.runtime_kind,
        "manifest_url": module.manifest_url,
        "status": module.status,
        "capability_config": module.capability_config or {},
        "trigger_mappings": [
            {
                "id": mapping.id,
                "trigger_type": mapping.trigger_type,
                "trigger_key": mapping.trigger_key,
                "trigger_value": mapping.trigger_value,
                "difficulty_band": mapping.difficulty_band,
                "selector_strategy": mapping.selector_strategy,
            }
            for mapping in module.trigger_mappings
            if mapping.is_active
        ],
    }


def _question_items(package: ContentPackage) -> list[QuestionBankItem]:
    if not package.question_bank:
        return []
    return sorted(
        [item for item in package.question_bank.items if item.is_active],
        key=lambda item: item.order_index,
    )


def serialize_game_package(package: ContentPackage, *, class_id: str | None = None) -> dict[str, Any]:
    assignment = None
    active_assignments = [item for item in package.assignments if item.is_active]
    if class_id:
        assignment = next((item for item in active_assignments if item.class_id == class_id), None)
    if not assignment and active_assignments:
        assignment = active_assignments[0]

    questions = _question_items(package)
    difficulty_counts: dict[str, int] = {
        DifficultyBand.recognition: 0,
        DifficultyBand.comprehension: 0,
        DifficultyBand.application_basic: 0,
        DifficultyBand.application_advanced: 0,
    }
    for question in questions:
        if question.difficulty_band in difficulty_counts:
            difficulty_counts[question.difficulty_band] += 1

    module = package.game_config.game_module if package.game_config and package.game_config.game_module else None
    return {
        "id": package.id,
        "class_id": assignment.class_id if assignment else None,
        "class_name": assignment.class_.name if assignment and assignment.class_ else None,
        "title": package.title,
        "description": package.description,
        "thumbnail_url": package.thumbnail_url,
        "status": package.status,
        "created_by": package.created_by,
        "created_at": package.created_at,
        "question_count": len(questions),
        "difficulty_counts": difficulty_counts,
        "game_module_id": module.id if module else None,
        "game_module_slug": module.slug if module else None,
        "game_module_title": module.title if module else None,
        "manifest_url": module.manifest_url if module else None,
        "runtime_config": package.game_config.runtime_config if package.game_config else {},
    }


def get_game_modules(db: Session) -> list[GameModule]:
    ensure_default_game_modules(db)
    return _game_module_query(db).filter(GameModule.status != GameModuleStatus.archived).order_by(GameModule.title.asc()).all()


def get_game_module(db: Session, module_id: str) -> GameModule | None:
    ensure_default_game_modules(db)
    return _game_module_query(db).filter(GameModule.id == module_id).first()


def get_game_package(db: Session, package_id: str) -> ContentPackage | None:
    return _game_package_query(db).filter(ContentPackage.id == package_id).first()


def get_game_packages_for_class(db: Session, class_id: str) -> list[ContentPackage]:
    return (
        _game_package_query(db)
        .join(ContentPackageAssignment, ContentPackageAssignment.package_id == ContentPackage.id)
        .filter(ContentPackageAssignment.class_id == class_id, ContentPackageAssignment.is_active.is_(True))
        .order_by(ContentPackage.created_at.desc())
        .all()
    )


def get_game_packages_for_student(db: Session, class_ids: list[str]) -> list[ContentPackage]:
    if not class_ids:
        return []
    return (
        _game_package_query(db)
        .join(ContentPackageAssignment, ContentPackageAssignment.package_id == ContentPackage.id)
        .filter(ContentPackageAssignment.class_id.in_(class_ids), ContentPackageAssignment.is_active.is_(True))
        .order_by(ContentPackage.created_at.desc())
        .all()
    )


def create_game_package(db: Session, *, class_id: str, created_by: str, data: GamePackageCreate) -> ContentPackage:
    ensure_default_game_modules(db)
    package = ContentPackage(
        package_type=ContentPackageType.game,
        title=data.title,
        description=data.description,
        thumbnail_url=data.thumbnail_url,
        status=ContentPackageStatus.published,
        created_by=created_by,
        published_at=now_local_naive(),
    )
    db.add(package)
    db.flush()

    db.add(
        ContentPackageAssignment(
            package_id=package.id,
            class_id=class_id,
            assigned_by=created_by,
            is_active=True,
        )
    )
    db.add(
        GamePackageConfig(
            package_id=package.id,
            game_module_id=data.game_module_id,
            selector_strategy="random_no_repeat",
            runtime_config=data.runtime_config or {},
            scoring_config={},
        )
    )
    db.add(QuestionBank(package_id=package.id, created_by=created_by))
    db.commit()
    return get_game_package(db, package.id)  # type: ignore[return-value]


def update_game_package(db: Session, *, package: ContentPackage, data: GamePackageUpdate) -> ContentPackage:
    update_data = data.model_dump(exclude_unset=True)
    for field in ("title", "description", "thumbnail_url", "status"):
        if field in update_data:
            setattr(package, field, update_data[field])
    if "runtime_config" in update_data:
        if not package.game_config:
            raise ValueError("Game package config not found")
        package.game_config.runtime_config = update_data["runtime_config"] or {}
    db.commit()
    return get_game_package(db, package.id)  # type: ignore[return-value]


def delete_game_package(db: Session, *, package: ContentPackage) -> None:
    db.delete(package)
    db.commit()


def get_game_questions(db: Session, package_id: str) -> list[QuestionBankItem]:
    package = get_game_package(db, package_id)
    return _question_items(package) if package else []


def get_game_question(db: Session, question_id: str) -> QuestionBankItem | None:
    question = exam_crud.get_question(db, question_id)
    if not question or not question.question_bank or not question.question_bank.package:
        return None
    if question.question_bank.package.package_type != ContentPackageType.game:
        return None
    return question


def _validate_game_question_payload(payload: QuestionCreate | QuestionUpdate, *, current_question: QuestionBankItem | None = None) -> None:
    question_type = payload.type or (current_question.type if current_question else None)
    difficulty_band = payload.difficulty_band if payload.difficulty_band is not None else (current_question.difficulty_band if current_question else None)
    if not difficulty_band:
        raise ValueError("Game question must include difficulty_band")
    if difficulty_band not in {
        DifficultyBand.recognition,
        DifficultyBand.comprehension,
        DifficultyBand.application_basic,
        DifficultyBand.application_advanced,
    }:
        raise ValueError("Invalid difficulty_band")
    if question_type == QuestionType.image_upload:
        raise ValueError("image_upload is not supported for game runtime")

    text_config = payload.text_config
    if question_type == QuestionType.text:
        effective_text_config = text_config or (current_question.text_config if current_question else None)
        grading_mode = None
        if effective_text_config:
            grading_mode = (
                effective_text_config.grading_mode
                if hasattr(effective_text_config, "grading_mode")
                else None
            )
        if not effective_text_config or grading_mode == TextGradingMode.manual:
            raise ValueError("Game text questions require auto grading")


def create_game_question(db: Session, *, package_id: str, data: QuestionCreate) -> QuestionBankItem:
    _validate_game_question_payload(data)
    return exam_crud.create_question(db, exam_id=package_id, data=data)


def update_game_question(db: Session, *, question: QuestionBankItem, data: QuestionUpdate) -> QuestionBankItem:
    _validate_game_question_payload(data, current_question=question)
    return exam_crud.update_question(db, question=question, data=data)


def delete_game_question(db: Session, *, question: QuestionBankItem) -> None:
    exam_crud.delete_question(db, question=question)


def get_attempt(db: Session, attempt_id: str) -> PackageAttempt | None:
    return _attempt_query(db).filter(PackageAttempt.id == attempt_id).first()


def get_in_progress_attempt(db: Session, *, package_id: str, user_id: str) -> PackageAttempt | None:
    return (
        _attempt_query(db)
        .filter(
            PackageAttempt.package_id == package_id,
            PackageAttempt.user_id == user_id,
            PackageAttempt.status == PackageAttemptStatus.in_progress,
        )
        .order_by(PackageAttempt.started_at.desc())
        .first()
    )


def start_attempt(db: Session, *, package_id: str, user_id: str, class_id: str | None) -> PackageAttempt:
    existing = get_in_progress_attempt(db, package_id=package_id, user_id=user_id)
    if existing:
        return existing

    attempt_index = (
        db.query(PackageAttempt)
        .filter(PackageAttempt.package_id == package_id, PackageAttempt.user_id == user_id)
        .count()
        + 1
    )
    attempt = PackageAttempt(
        package_id=package_id,
        user_id=user_id,
        class_id=class_id,
        attempt_index=attempt_index,
        status=PackageAttemptStatus.in_progress,
        started_at=now_local_naive(),
        runtime_state={},
        summary_payload={},
    )
    db.add(attempt)
    db.commit()
    return get_attempt(db, attempt.id)  # type: ignore[return-value]


def find_trigger_mapping(package: ContentPackage, *, trigger_type: str, trigger_key: str, trigger_value: str) -> GameModuleTriggerMapping | None:
    module = package.game_config.game_module if package.game_config and package.game_config.game_module else None
    if not module:
        return None
    return next(
        (
            mapping for mapping in module.trigger_mappings
            if mapping.is_active
            and mapping.trigger_type == trigger_type
            and mapping.trigger_key == trigger_key
            and mapping.trigger_value == trigger_value
        ),
        None,
    )


def select_question_for_trigger(attempt: PackageAttempt, *, difficulty_band: str) -> QuestionBankItem | None:
    package = attempt.package
    if not package:
        return None
    used_question_ids = {question_attempt.question_item_id for question_attempt in attempt.question_attempts}
    candidates = [
        question for question in _question_items(package)
        if question.difficulty_band == difficulty_band and question.id not in used_question_ids
    ]
    if not candidates:
        return None
    random.shuffle(candidates)
    return candidates[0]


def create_runtime_question_attempt(
    db: Session,
    *,
    attempt: PackageAttempt,
    question: QuestionBankItem,
    source_payload: dict[str, Any],
) -> PackageQuestionAttempt:
    question_attempt_id = None
    question_attempt = PackageQuestionAttempt(
        package_attempt_id=attempt.id,
        question_item_id=question.id,
        source_context=QuestionSourceContext.game_trigger,
        source_payload=source_payload,
        display_order=len(attempt.question_attempts),
        difficulty_band_snapshot=question.difficulty_band,
        presented_at=now_local_naive(),
        pause_started_at=now_local_naive(),
    )
    db.add(question_attempt)
    db.flush()
    question_attempt_id = question_attempt.id
    db.commit()
    refreshed_attempt = get_attempt(db, attempt.id)
    return next(item for item in refreshed_attempt.question_attempts if item.id == question_attempt_id)  # type: ignore[union-attr]


def clear_runtime_answer_children(db: Session, question_attempt: PackageQuestionAttempt) -> None:
    for item in list(question_attempt.selected_options):
        db.delete(item)
    for item in list(question_attempt.matching_answers):
        db.delete(item)
    if question_attempt.text_answer:
        db.delete(question_attempt.text_answer)
    for item in list(question_attempt.uploaded_assets):
        db.delete(item)
    db.flush()


def attach_runtime_answer(
    db: Session,
    *,
    question_attempt: PackageQuestionAttempt,
    text_answer: str | None,
    selected_option_ids: list[str],
    uploaded_image_url: str | None,
) -> PackageQuestionAttempt:
    clear_runtime_answer_children(db, question_attempt)
    question_attempt.answered_at = now_local_naive()
    question = question_attempt.question_item

    if question.type in (QuestionType.single_choice, QuestionType.multi_choice):
        for option_id in selected_option_ids:
            db.add(QuestionAttemptSelectedOption(question_attempt_id=question_attempt.id, option_id=option_id))
    elif question.type == QuestionType.matching:
        import json

        selected_values: list[str] = []
        try:
            selected_values = json.loads(text_answer or "[]")
        except Exception:
            selected_values = []
        left_items = sorted(question.matching_left_items, key=lambda item: item.order_index)
        right_items = {item.content: item.right_key for item in sorted(question.matching_right_items, key=lambda item: item.order_index)}
        for idx, left_item in enumerate(left_items):
            selected_value = selected_values[idx] if idx < len(selected_values) else ""
            db.add(
                QuestionAttemptMatchingAnswer(
                    question_attempt_id=question_attempt.id,
                    left_item_id=left_item.id,
                    selected_right_key=right_items.get(selected_value) if selected_value else None,
                )
            )
    elif question.type == QuestionType.text:
        db.add(
            QuestionAttemptTextAnswer(
                question_attempt_id=question_attempt.id,
                raw_answer=text_answer or "",
                normalized_answer=None,
                grading_mode_snapshot=(question.text_config.grading_mode if question.text_config else None),
            )
        )
    elif question.type == QuestionType.image_upload and uploaded_image_url:
        db.add(
            QuestionAttemptUploadedAsset(
                question_attempt_id=question_attempt.id,
                asset_url=uploaded_image_url,
                asset_type="image",
            )
        )
    db.flush()
    return question_attempt
