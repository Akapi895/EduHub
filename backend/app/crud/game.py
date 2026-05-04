from __future__ import annotations

import math
import uuid
from typing import Any

from sqlalchemy.orm import Session, selectinload

from app.models.content_package import (
    ContentPackage,
    ContentPackageAccessRule,
    ContentPackageAssignment,
    ContentPackagePublication,
    GamePackageConfig,
)
from app.models.game_module import GameModule, GameModuleTriggerMapping
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
from app.schemas.game import GamePackageCreate, GamePackagePublicationUpdate, GamePackageUpdate, GameQuestionCreate, GameQuestionUpdate
from app.utils.datetime_utils import now_local_naive
from app.utils.enums import ContentPackageType, QuestionType, TextGradingMode, TextInputVariant

GAME_DIFFICULTY_BAND_ORDER = (
    "recognition",
    "comprehension",
    "application_basic",
    "application_advanced",
)
GAME_DIFFICULTY_BAND_RANK = {
    band: index for index, band in enumerate(GAME_DIFFICULTY_BAND_ORDER)
}
DEFAULT_GOLD_MINER_ITEM_COUNT_PER_LEVEL = 15
DEFAULT_GOLD_MINER_QUESTIONS_PER_LEVEL = 4
DEFAULT_GOLD_MINER_LEVEL_COUNT = 1
DEFAULT_GOLD_MINER_TIME_LIMIT_SECONDS = 60
DEFAULT_GOLD_MINER_TARGET_SCORE_BASE = 1000
DEFAULT_GOLD_MINER_TARGET_SCORE_STEP = 180


def _payload_value(item: Any, field: str, default=None):
    if isinstance(item, dict):
        return item.get(field, default)
    return getattr(item, field, default)


def _serialize_text_config(text_config: QuestionItemTextConfig | None, *, include_rules: bool) -> dict | None:
    if not text_config:
        return None

    payload = {
        "input_variant": text_config.input_variant,
        "grading_mode": text_config.grading_mode,
        "min_length": text_config.min_length,
        "max_length": text_config.max_length,
        "case_sensitive": text_config.case_sensitive,
        "accent_sensitive": text_config.accent_sensitive,
        "trim_whitespace": text_config.trim_whitespace,
        "ignore_punctuation": text_config.ignore_punctuation,
    }
    if include_rules:
        payload["accepted_answers"] = [item.answer_text for item in sorted(text_config.accepted_answers, key=lambda row: row.order_index)]
        payload["keywords"] = [item.keyword for item in text_config.keywords]
    return payload


def _game_query(db: Session):
    return (
        db.query(ContentPackage)
        .options(
            selectinload(ContentPackage.assignments).selectinload(ContentPackageAssignment.class_),
            selectinload(ContentPackage.publications),
            selectinload(ContentPackage.access_rules),
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


def _question_query(db: Session):
    return db.query(QuestionBankItem).options(
        selectinload(QuestionBankItem.question_bank).selectinload(QuestionBank.package),
        selectinload(QuestionBankItem.options),
        selectinload(QuestionBankItem.matching_left_items),
        selectinload(QuestionBankItem.matching_right_items),
        selectinload(QuestionBankItem.text_config).selectinload(QuestionItemTextConfig.accepted_answers),
        selectinload(QuestionBankItem.text_config).selectinload(QuestionItemTextConfig.keywords),
    )


def _module_query(db: Session):
    return db.query(GameModule).options(selectinload(GameModule.trigger_mappings))


def serialize_game_module(module: GameModule | None) -> dict | None:
    if not module:
        return None

    capability_config = module.capability_config or {}
    return {
        "id": module.id,
        "slug": module.slug,
        "title": module.title,
        "description": module.description,
        "runtime_kind": module.runtime_kind,
        "manifest_url": module.manifest_url,
        "entry": capability_config.get("entry"),
        "thumbnail_url": capability_config.get("thumbnail_url"),
        "status": module.status,
        "capability_config": capability_config,
        "trigger_mappings": [
            {
                "trigger_type": mapping.trigger_type,
                "trigger_key": mapping.trigger_key,
                "trigger_value": mapping.trigger_value,
                "difficulty_band": mapping.difficulty_band,
                "selector_strategy": mapping.selector_strategy,
                "is_active": mapping.is_active,
            }
            for mapping in sorted(
                [item for item in module.trigger_mappings if item.is_active],
                key=lambda row: (row.trigger_type, row.trigger_key, row.trigger_value),
            )
        ],
    }


def serialize_game_question(question: QuestionBankItem, *, package_id: str, include_correct: bool) -> dict:
    right_items = sorted(question.matching_right_items, key=lambda item: item.order_index)
    right_by_key = {item.right_key: item.content for item in right_items}
    left_items = sorted(question.matching_left_items, key=lambda item: item.order_index)

    return {
        "id": question.id,
        "package_id": package_id,
        "type": question.type,
        "content": question.content,
        "instruction": question.instruction,
        "explanation": question.explanation,
        "difficulty_band": question.difficulty_band,
        "points": question.points,
        "required": question.required,
        "order_index": question.order_index,
        "options": [
            {
                "id": option.id,
                "option_key": option.option_key,
                "content": option.content,
                "order_index": option.order_index,
                **({"is_correct": option.is_correct} if include_correct else {}),
            }
            for option in sorted(question.options, key=lambda row: row.order_index)
        ],
        "matching_pairs": [
            {
                "id": left_item.id,
                "left_text": left_item.content,
                "right_text": right_by_key.get(left_item.correct_right_key, ""),
                **({"correct_match": right_by_key.get(left_item.correct_right_key, "")} if include_correct else {}),
            }
            for left_item in left_items
        ],
        "matching_left_items": [
            {
                "id": left_item.id,
                "left_key": left_item.left_key,
                "content": left_item.content,
                **({"correct_right_key": left_item.correct_right_key} if include_correct else {}),
            }
            for left_item in left_items
        ],
        "matching_right_items": [
            {
                "id": right_item.id,
                "right_key": right_item.right_key,
                "content": right_item.content,
            }
            for right_item in right_items
        ],
        "text_config": _serialize_text_config(question.text_config, include_rules=include_correct),
        "created_at": question.created_at,
        "updated_at": question.updated_at,
    }


def _active_game_questions(package: ContentPackage) -> list[QuestionBankItem]:
    return sorted(
        [item for item in (package.question_bank.items if package.question_bank else []) if item.is_active],
        key=lambda item: (
            GAME_DIFFICULTY_BAND_RANK.get(item.difficulty_band or "", 10**3),
            item.order_index if item.order_index is not None else 10**9,
            item.created_at,
            item.id,
        ),
    )


def _is_gold_miner_package(package: ContentPackage) -> bool:
    module = package.game_config.game_module if package.game_config and package.game_config.game_module else None
    return bool(module and module.slug == "gold-miner")


def _generic_runtime_preview_settings(package: ContentPackage) -> dict[str, Any]:
    runtime_config = package.game_config.runtime_config if package.game_config and package.game_config.runtime_config else {}
    runtime_config = runtime_config if isinstance(runtime_config, dict) else {}
    session_config = runtime_config.get("session") if isinstance(runtime_config.get("session"), dict) else {}
    memory_card_config = runtime_config.get("memory_card") if isinstance(runtime_config.get("memory_card"), dict) else {}
    distribution_config = (
        runtime_config.get("question_distribution")
        if isinstance(runtime_config.get("question_distribution"), dict)
        else {}
    )
    distribution_mode_raw = distribution_config.get("mode")
    distribution_mode = "random" if str(distribution_mode_raw).lower() == "random" else "ordered"
    item_count_per_level = _int_value(
        memory_card_config.get("board_pair_count", session_config.get("item_count_per_level")),
        8,
        minimum=1,
    )
    time_limit_seconds = _int_value(
        session_config.get("time_limit_seconds", session_config.get("default_time_limit_seconds")),
        DEFAULT_GOLD_MINER_TIME_LIMIT_SECONDS,
        minimum=10,
    )
    return {
        "distribution_mode": distribution_mode,
        "item_count_per_level": item_count_per_level,
        "time_limit_seconds": time_limit_seconds,
    }


def _int_value(value: Any, default: int, *, minimum: int = 0) -> int:
    if isinstance(value, bool):
        return default
    if isinstance(value, (int, float)):
        return max(int(value), minimum)
    if isinstance(value, str):
        try:
            return max(int(value), minimum)
        except ValueError:
            return default
    return default


def get_gold_miner_runtime_settings(package: ContentPackage) -> dict[str, Any]:
    module = package.game_config.game_module if package.game_config and package.game_config.game_module else None
    capability_config = module.capability_config or {} if module else {}
    session_config = capability_config.get("session") if isinstance(capability_config.get("session"), dict) else {}
    distribution_config = (
        capability_config.get("question_distribution")
        if isinstance(capability_config.get("question_distribution"), dict)
        else {}
    )
    runtime_config = package.game_config.runtime_config if package.game_config and package.game_config.runtime_config else {}
    runtime_distribution = runtime_config.get("question_distribution") if isinstance(runtime_config, dict) else {}
    if not isinstance(runtime_distribution, dict):
        runtime_distribution = {}

    mode = runtime_distribution.get("mode") or distribution_config.get("mode") or "progressive"
    normalized_mode = "random" if str(mode).lower() == "random" else "progressive"
    item_count_per_level = _int_value(
        session_config.get("item_count_per_level", session_config.get("item_count")),
        DEFAULT_GOLD_MINER_ITEM_COUNT_PER_LEVEL,
        minimum=1,
    )
    questions_per_level = _int_value(
        runtime_distribution.get("questions_per_level", runtime_distribution.get("questions_per_level_cap")),
        _int_value(
            distribution_config.get("questions_per_level", distribution_config.get("questions_per_level_cap")),
            DEFAULT_GOLD_MINER_QUESTIONS_PER_LEVEL,
            minimum=1,
        ),
        minimum=1,
    )
    questions_per_level = min(questions_per_level, item_count_per_level)
    requested_level_count = _int_value(
        runtime_distribution.get("level_count", runtime_config.get("level_count")),
        _int_value(session_config.get("max_levels"), DEFAULT_GOLD_MINER_LEVEL_COUNT, minimum=1),
        minimum=1,
    )
    time_limit_seconds = _int_value(
        runtime_config.get("time_limit_seconds", session_config.get("default_time_limit_seconds")),
        DEFAULT_GOLD_MINER_TIME_LIMIT_SECONDS,
        minimum=10,
    )
    target_score_base = _int_value(
        runtime_config.get("target_score_base", session_config.get("target_score_base")),
        DEFAULT_GOLD_MINER_TARGET_SCORE_BASE,
        minimum=1,
    )
    target_score_step = _int_value(
        runtime_config.get("target_score_step", session_config.get("target_score_step")),
        DEFAULT_GOLD_MINER_TARGET_SCORE_STEP,
        minimum=0,
    )
    return {
        "mode": normalized_mode,
        "item_count_per_level": item_count_per_level,
        "questions_per_level": questions_per_level,
        "requested_level_count": requested_level_count,
        "time_limit_seconds": time_limit_seconds,
        "target_score_base": target_score_base,
        "target_score_step": target_score_step,
    }


def _build_questions_per_level(total_questions: int, *, per_level_cap: int, requested_level_count: int) -> list[int]:
    if total_questions <= 0:
        return [0] * max(requested_level_count, 1)

    minimum_levels = max(1, math.ceil(total_questions / max(per_level_cap, 1)))
    level_count = max(requested_level_count, minimum_levels)

    while math.ceil(total_questions / level_count) > per_level_cap:
        level_count += 1

    base_count = total_questions // level_count
    remainder = total_questions % level_count
    return [
        base_count + (1 if index < remainder else 0)
        for index in range(level_count)
    ]


def _build_capture_slots(question_count: int, *, item_count_per_level: int) -> list[int]:
    if question_count <= 0:
        return []

    slots: list[int] = []
    for index in range(question_count):
        slot = round(((index + 1) * (item_count_per_level + 1)) / (question_count + 1))
        slot = min(max(slot, 1), item_count_per_level)
        if slots and slot <= slots[-1]:
            slot = min(item_count_per_level, slots[-1] + 1)
        slots.append(slot)

    for index in range(len(slots) - 2, -1, -1):
        max_allowed = item_count_per_level - (len(slots) - 1 - index)
        if slots[index] > max_allowed:
            slots[index] = max_allowed

    return slots


def build_gold_miner_question_plan_preview(package: ContentPackage) -> dict[str, Any]:
    items = _active_game_questions(package)
    total_questions = len(items)
    settings = get_gold_miner_runtime_settings(package)
    questions_by_difficulty = {
        band: [item for item in items if item.difficulty_band == band]
        for band in GAME_DIFFICULTY_BAND_ORDER
    }
    questions_per_level = [
        len(questions_by_difficulty[band])
        for band in GAME_DIFFICULTY_BAND_ORDER
    ]
    capture_slots_by_level = [
        _build_capture_slots(min(count, settings["item_count_per_level"]), item_count_per_level=settings["item_count_per_level"])
        for count in questions_per_level
    ]
    target_scores_by_level: list[int] = []
    running_target = 0
    for index in range(len(questions_per_level)):
        running_target += settings["target_score_base"] + settings["target_score_step"] * index
        target_scores_by_level.append(running_target)

    return {
        "distribution_mode": settings["mode"],
        "total_questions": total_questions,
        "level_count": len(questions_per_level),
        "difficulty_bands": list(GAME_DIFFICULTY_BAND_ORDER),
        "questions_per_level": questions_per_level,
        "capture_slots_by_level": capture_slots_by_level,
        "item_count_per_level": settings["item_count_per_level"],
        "time_limit_seconds": settings["time_limit_seconds"],
        "target_scores_by_level": target_scores_by_level,
    }


def build_generic_question_plan_preview(package: ContentPackage) -> dict[str, Any]:
    items = _active_game_questions(package)
    settings = _generic_runtime_preview_settings(package)
    questions_by_difficulty = {
        band: [item for item in items if item.difficulty_band == band]
        for band in GAME_DIFFICULTY_BAND_ORDER
    }
    questions_per_level = [
        len(questions_by_difficulty[band])
        for band in GAME_DIFFICULTY_BAND_ORDER
    ]
    capture_slots_by_level = [
        _build_capture_slots(min(count, settings["item_count_per_level"]), item_count_per_level=settings["item_count_per_level"])
        for count in questions_per_level
    ]
    return {
        "distribution_mode": settings["distribution_mode"],
        "total_questions": len(items),
        "level_count": len(questions_per_level),
        "difficulty_bands": list(GAME_DIFFICULTY_BAND_ORDER),
        "questions_per_level": questions_per_level,
        "capture_slots_by_level": capture_slots_by_level,
        "item_count_per_level": settings["item_count_per_level"],
        "time_limit_seconds": settings["time_limit_seconds"],
        "target_scores_by_level": [],
    }


def build_game_question_plan_preview(package: ContentPackage) -> dict[str, Any]:
    if _is_gold_miner_package(package):
        return build_gold_miner_question_plan_preview(package)
    return build_generic_question_plan_preview(package)


def build_game_question_stats(package: ContentPackage) -> dict[str, Any]:
    items = _active_game_questions(package)
    by_difficulty: dict[str, int] = {}
    by_type: dict[str, int] = {}
    for item in items:
        if item.difficulty_band:
            by_difficulty[item.difficulty_band] = by_difficulty.get(item.difficulty_band, 0) + 1
        by_type[item.type] = by_type.get(item.type, 0) + 1

    question_plan_preview = build_game_question_plan_preview(package)

    return {
        "total": len(items),
        "required_total": len(items),
        "by_difficulty_band": by_difficulty,
        "by_type": by_type,
        "question_plan_preview": question_plan_preview,
        "is_ready": True,
    }


def serialize_game_package(package: ContentPackage, *, class_id: str | None = None) -> dict:
    assignments = [assignment for assignment in package.assignments if assignment.is_active]
    selected_assignment = next((assignment for assignment in assignments if assignment.class_id == class_id), None)
    if not selected_assignment and assignments:
        selected_assignment = assignments[0]
    question_stats = build_game_question_stats(package)
    hub_publication = next((item for item in package.publications if item.channel == "game_hub"), None)

    return {
        "id": package.id,
        "class_id": selected_assignment.class_id if selected_assignment else None,
        "class_name": selected_assignment.class_.name if selected_assignment and selected_assignment.class_ else None,
        "assigned_classes": [
            {
                "class_id": assignment.class_id,
                "class_name": assignment.class_.name if assignment.class_ else None,
            }
            for assignment in assignments
        ],
        "package_type": package.package_type,
        "title": package.title,
        "description": package.description,
        "subject": package.subject,
        "grade": package.grade,
        "thumbnail_url": package.thumbnail_url,
        "status": package.status,
        "version": package.version,
        "published_at": package.published_at,
        "published_to_hub": bool(hub_publication and hub_publication.status == "published"),
        "hub_publication": {
            "id": hub_publication.id,
            "channel": hub_publication.channel,
            "visibility": hub_publication.visibility,
            "status": hub_publication.status,
            "published_at": hub_publication.published_at,
            "start_at": hub_publication.start_at,
            "end_at": hub_publication.end_at,
            "featured": hub_publication.featured,
            "sort_order": hub_publication.sort_order,
            "metadata_json": hub_publication.metadata_json,
        } if hub_publication else None,
        "created_by": package.created_by,
        "created_at": package.created_at,
        "updated_at": package.updated_at,
        "question_count": question_stats["total"],
        "question_stats": question_stats,
        "question_stats_by_difficulty": question_stats["by_difficulty_band"],
        "game_module": serialize_game_module(package.game_config.game_module if package.game_config else None),
        "game_module_id": package.game_config.game_module_id if package.game_config else None,
        "selector_strategy": package.game_config.selector_strategy if package.game_config else None,
        "runtime_config": package.game_config.runtime_config if package.game_config else None,
        "scoring_config": package.game_config.scoring_config if package.game_config else None,
    }


def list_game_modules(db: Session) -> list[GameModule]:
    return _module_query(db).order_by(GameModule.title.asc()).all()


def get_game_module(db: Session, module_id: str) -> GameModule | None:
    return _module_query(db).filter(GameModule.id == module_id).first()


def get_game_packages_for_class(db: Session, class_id: str) -> list[ContentPackage]:
    return (
        _game_query(db)
        .join(ContentPackageAssignment, ContentPackageAssignment.package_id == ContentPackage.id)
        .filter(ContentPackageAssignment.class_id == class_id, ContentPackageAssignment.is_active.is_(True))
        .order_by(ContentPackage.created_at.desc())
        .all()
    )


def get_game_packages_for_teacher(db: Session, teacher_id: str) -> list[ContentPackage]:
    return (
        _game_query(db)
        .filter(ContentPackage.created_by == teacher_id)
        .order_by(ContentPackage.created_at.desc())
        .all()
    )


def get_game_package(db: Session, package_id: str) -> ContentPackage | None:
    return _game_query(db).filter(ContentPackage.id == package_id).first()


def create_game_package(
    db: Session,
    *,
    created_by: str,
    data: GamePackageCreate,
    class_id: str | None = None,
) -> ContentPackage:
    package = ContentPackage(
        package_type=ContentPackageType.game,
        title=data.title,
        description=data.description,
        subject=data.subject,
        grade=data.grade,
        thumbnail_url=data.thumbnail_url,
        status=data.status,
        created_by=created_by,
        published_at=now_local_naive() if data.status == "published" else None,
    )
    db.add(package)
    db.flush()

    if class_id:
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
            selector_strategy=data.selector_strategy,
            runtime_config=data.runtime_config,
            scoring_config=data.scoring_config,
        )
    )
    db.add(QuestionBank(package_id=package.id, created_by=created_by))
    db.commit()
    return get_game_package(db, package.id)  # type: ignore[return-value]


def publish_game_package_to_hub(
    db: Session,
    *,
    package: ContentPackage,
    teacher_id: str,
    data: GamePackagePublicationUpdate,
) -> ContentPackage:
    publication = next((item for item in package.publications if item.channel == "game_hub"), None)
    if not publication:
        publication = ContentPackagePublication(
            package_id=package.id,
            channel="game_hub",
            visibility=data.visibility,
            status="draft",
        )
        db.add(publication)
        db.flush()

    if data.published:
        publication.status = "published"
        publication.visibility = data.visibility
        publication.published_by = teacher_id
        publication.published_at = publication.published_at or now_local_naive()
        publication.start_at = data.start_at
        publication.end_at = data.end_at
        publication.featured = data.featured
        publication.sort_order = data.sort_order
        publication.metadata_json = data.metadata_json
        if package.status != "published":
            package.status = "published"
            package.version += 1
            package.published_at = now_local_naive()

        access_rule = next(
            (
                item
                for item in package.access_rules
                if item.permission == "play"
                and item.audience_type == "all_students"
                and item.effect == "allow"
                and item.audience_id is None
            ),
            None,
        )
        if not access_rule:
            access_rule = ContentPackageAccessRule(
                package_id=package.id,
                permission="play",
                audience_type="all_students",
                effect="allow",
                created_by=teacher_id,
            )
            db.add(access_rule)
        access_rule.is_active = True
        access_rule.start_at = data.start_at
        access_rule.end_at = data.end_at
    else:
        publication.status = "archived"
        for access_rule in package.access_rules:
            if (
                access_rule.permission == "play"
                and access_rule.audience_type == "all_students"
                and access_rule.effect == "allow"
                and access_rule.audience_id is None
            ):
                access_rule.is_active = False

    db.commit()
    return get_game_package(db, package.id)  # type: ignore[return-value]


def update_game_package(db: Session, *, package: ContentPackage, data: GamePackageUpdate) -> ContentPackage:
    update_data = data.model_dump(exclude_unset=True)
    package_fields = {"title", "description", "subject", "grade", "thumbnail_url", "status"}
    config_fields = {"game_module_id", "selector_strategy", "runtime_config", "scoring_config"}

    previous_status = package.status

    for field in package_fields:
        if field in update_data:
            setattr(package, field, update_data[field])

    if "status" in update_data and update_data["status"] == "published" and previous_status != "published":
        package.version += 1
        package.published_at = now_local_naive()

    if not package.game_config:
        raise ValueError("Game package config not found")

    for field in config_fields:
        if field in update_data:
            setattr(package.game_config, field, update_data[field])

    db.commit()
    return get_game_package(db, package.id)  # type: ignore[return-value]


def delete_game_package(db: Session, *, package: ContentPackage) -> None:
    db.delete(package)
    db.commit()


def get_questions(db: Session, package_id: str) -> list[QuestionBankItem]:
    package = get_game_package(db, package_id)
    if not package or not package.question_bank:
        return []
    return sorted(
        [item for item in package.question_bank.items if item.is_active],
        key=lambda item: (
            GAME_DIFFICULTY_BAND_RANK.get(item.difficulty_band or "", 10**3),
            item.order_index if item.order_index is not None else 10**9,
            item.created_at,
            item.id,
        ),
    )


def get_question(db: Session, question_id: str) -> QuestionBankItem | None:
    return _question_query(db).filter(QuestionBankItem.id == question_id).first()


def _validate_choice_options(options: list[Any], *, single_choice: bool) -> None:
    if len(options) < 2:
        raise ValueError("Choice questions require at least two options")
    correct_count = sum(1 for option in options if bool(_payload_value(option, "is_correct", False)))
    if single_choice and correct_count != 1:
        raise ValueError("Single choice questions require exactly one correct option")
    if not single_choice and correct_count < 1:
        raise ValueError("Multi choice questions require at least one correct option")


def _validate_matching_pairs(pairs: list[Any]) -> None:
    if len(pairs) < 2:
        raise ValueError("Matching questions require at least two pairs")


def _validate_text_config(text_config: Any) -> None:
    if not text_config:
        raise ValueError("Text questions require text_config")
    grading_mode = _payload_value(text_config, "grading_mode", TextGradingMode.manual)
    accepted_answers = _payload_value(text_config, "accepted_answers", []) or []
    keywords = _payload_value(text_config, "keywords", []) or []
    if grading_mode != TextGradingMode.manual and not accepted_answers and not keywords:
        raise ValueError("Auto-graded text questions require accepted answers or keywords")


def _existing_options(question: QuestionBankItem) -> list[dict]:
    return [{"content": option.content, "is_correct": option.is_correct} for option in question.options]


def _existing_matching_pairs(question: QuestionBankItem) -> list[dict]:
    right_by_key = {item.right_key: item.content for item in question.matching_right_items}
    return [
        {
            "left_text": left_item.content,
            "right_text": right_by_key.get(left_item.correct_right_key, ""),
            "correct_match": right_by_key.get(left_item.correct_right_key, ""),
        }
        for left_item in sorted(question.matching_left_items, key=lambda row: row.order_index)
    ]


def _existing_text_config(question: QuestionBankItem) -> dict | None:
    if not question.text_config:
        return None
    return {
        "input_variant": question.text_config.input_variant,
        "grading_mode": question.text_config.grading_mode,
        "min_length": question.text_config.min_length,
        "max_length": question.text_config.max_length,
        "case_sensitive": question.text_config.case_sensitive,
        "accent_sensitive": question.text_config.accent_sensitive,
        "trim_whitespace": question.text_config.trim_whitespace,
        "ignore_punctuation": question.text_config.ignore_punctuation,
        "accepted_answers": [item.answer_text for item in question.text_config.accepted_answers],
        "keywords": [item.keyword for item in question.text_config.keywords],
    }


def validate_game_question_create(data: GameQuestionCreate) -> None:
    if not data.difficulty_band:
        raise ValueError("Game questions require difficulty_band")
    if data.type == QuestionType.single_choice:
        _validate_choice_options(data.options, single_choice=True)
    elif data.type == QuestionType.multi_choice:
        _validate_choice_options(data.options, single_choice=False)
    elif data.type == QuestionType.matching:
        _validate_matching_pairs(data.matching_pairs)
    elif data.type == QuestionType.text:
        _validate_text_config(data.text_config)


def validate_game_question_update(question: QuestionBankItem, data: GameQuestionUpdate) -> None:
    effective_difficulty_band = data.difficulty_band if data.difficulty_band is not None else question.difficulty_band
    if not effective_difficulty_band:
        raise ValueError("Game questions require difficulty_band")

    effective_type = data.type or question.type
    if effective_type == QuestionType.single_choice:
        _validate_choice_options(data.options if data.options is not None else _existing_options(question), single_choice=True)
    elif effective_type == QuestionType.multi_choice:
        _validate_choice_options(data.options if data.options is not None else _existing_options(question), single_choice=False)
    elif effective_type == QuestionType.matching:
        _validate_matching_pairs(data.matching_pairs if data.matching_pairs is not None else _existing_matching_pairs(question))
    elif effective_type == QuestionType.text:
        _validate_text_config(data.text_config if data.text_config is not None else _existing_text_config(question))


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


def _apply_question_children(db: Session, *, question: QuestionBankItem, payload: GameQuestionCreate | GameQuestionUpdate) -> None:
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


def create_question(db: Session, *, package_id: str, data: GameQuestionCreate, created_by: str) -> QuestionBankItem:
    package = get_game_package(db, package_id)
    if not package or not package.question_bank:
        raise ValueError("Game question bank not found")

    validate_game_question_create(data)

    question = QuestionBankItem(
        question_bank_id=package.question_bank.id,
        type=data.type,
        difficulty_band=data.difficulty_band,
        content=data.content,
        instruction=data.instruction,
        explanation=data.explanation,
        points=data.points,
        required=data.required,
        order_index=data.order_index,
        created_by=created_by,
    )
    db.add(question)
    db.flush()
    _apply_question_children(db, question=question, payload=data)
    db.commit()
    return get_question(db, question.id)  # type: ignore[return-value]


def update_question(db: Session, *, question: QuestionBankItem, data: GameQuestionUpdate) -> QuestionBankItem:
    validate_game_question_update(question, data)

    update_data = data.model_dump(exclude_unset=True)
    child_fields = {"options", "matching_pairs", "text_config"}
    previous_type = question.type

    for field, value in update_data.items():
        if field in child_fields:
            continue
        setattr(question, field, value)

    should_rebuild_children = any(field in update_data for field in child_fields) or (
        "type" in update_data and update_data["type"] != previous_type
    )
    if should_rebuild_children:
        _clear_question_children(db, question)
        _apply_question_children(db, question=question, payload=data)
    db.commit()
    return get_question(db, question.id)  # type: ignore[return-value]


def delete_question(db: Session, *, question: QuestionBankItem) -> None:
    db.delete(question)
    db.commit()
