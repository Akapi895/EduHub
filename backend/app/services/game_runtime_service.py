from __future__ import annotations

import json
import random
from typing import Any

from fastapi import HTTPException
from sqlalchemy import func
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session, selectinload

from app.crud import class_crud
from app.crud import game as game_crud
from app.crud import game_card as card_pair_crud
from app.models.class_model import ClassStudent
from app.models.content_package import ContentPackage, ContentPackageAssignment, GamePackageConfig
from app.models.game_module import GameModule, GameRuntimeEvent
from app.models.package_attempt import (
    PackageAttempt,
    PackageQuestionAttempt,
    QuestionAttemptMatchingAnswer,
    QuestionAttemptSelectedOption,
    QuestionAttemptTextAnswer,
    QuestionAttemptUploadedAsset,
)
from app.models.question_bank import QuestionBank, QuestionBankItem, QuestionItemTextConfig
from app.models.user import User
from app.schemas.game import (
    GameCompleteRequest,
    GameRuntimeAnswerRequest,
    GameRuntimeEventRequest,
    GameRuntimeTriggerRequest,
)
from app.services import game_access_service, game_leaderboard_service
from app.services.game_seed_service import GOLD_MINER_MODULE_ID, ensure_default_game_modules
from app.services.grading_service import grade_question_attempt, recalculate_attempt_scores
from app.utils.datetime_utils import now_local_naive
from app.utils.enums import ContentPackageType, PackageAttemptStatus, QuestionAttemptStatus, QuestionSourceContext, QuestionType


_RUNTIME_STATE_SENTINEL = object()


def _attempt_query(db: Session):
    return (
        db.query(PackageAttempt)
        .options(
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
            selectinload(PackageAttempt.question_attempts).selectinload(PackageQuestionAttempt.uploaded_assets),
            selectinload(PackageAttempt.runtime_events),
            selectinload(PackageAttempt.user),
        )
        .join(ContentPackage, PackageAttempt.package_id == ContentPackage.id)
        .filter(ContentPackage.package_type == ContentPackageType.game)
    )


def get_game_attempt(db: Session, attempt_id: str) -> PackageAttempt | None:
    return _attempt_query(db).filter(PackageAttempt.id == attempt_id).first()


def _serialize_runtime_event(event: GameRuntimeEvent) -> dict:
    return {
        "id": event.id,
        "event_type": event.event_type,
        "event_payload": event.event_payload,
        "created_at": event.created_at,
    }


def _runtime_state_dict(attempt: PackageAttempt) -> dict[str, Any]:
    return dict(attempt.runtime_state) if isinstance(attempt.runtime_state, dict) else {}


def _attempt_question_plan(attempt: PackageAttempt) -> dict[str, Any] | None:
    question_plan = _runtime_state_dict(attempt).get("question_plan")
    return question_plan if isinstance(question_plan, dict) else None


def _attempt_game_state(attempt: PackageAttempt) -> dict[str, Any]:
    runtime_state = _runtime_state_dict(attempt)
    game_state = runtime_state.get("game")
    if isinstance(game_state, dict):
        return dict(game_state)

    legacy_state = {
        key: value
        for key, value in runtime_state.items()
        if key != "question_plan"
    }
    return legacy_state if legacy_state else {}


def _set_attempt_runtime_state(
    attempt: PackageAttempt,
    *,
    question_plan: dict[str, Any] | None = None,
    game_state: dict[str, Any] | object = _RUNTIME_STATE_SENTINEL,
) -> None:
    runtime_state = _runtime_state_dict(attempt)
    if question_plan is not None:
        runtime_state["question_plan"] = question_plan
    if game_state is not _RUNTIME_STATE_SENTINEL:
        runtime_state["game"] = game_state if isinstance(game_state, dict) else {}
    attempt.runtime_state = runtime_state


def _public_question_plan(question_plan: dict[str, Any] | None) -> dict[str, Any] | None:
    if not isinstance(question_plan, dict):
        return None
    return {
        key: value
        for key, value in question_plan.items()
        if key not in {"question_ids_by_level", "question_ids_by_difficulty"}
    }


def _is_gold_miner_package(package: ContentPackage | None) -> bool:
    if not package or not package.game_config or not package.game_config.game_module:
        return False
    return package.game_config.game_module.slug == GOLD_MINER_MODULE_ID


MEMORY_CARD_MODULE_SLUG = "memory-card"


def _is_memory_card_package(package: ContentPackage | None) -> bool:
    if not package or not package.game_config or not package.game_config.game_module:
        return False
    return package.game_config.game_module.slug == MEMORY_CARD_MODULE_SLUG


def _card_pairs_for_runtime(db: Session, package_id: str) -> list[dict]:
    """Return serialised card pairs for injection into runtime_config."""
    pairs = card_pair_crud.get_card_pairs(db, package_id)
    return [
        {
            "id": p.id,
            "left_label": p.left_label,
            "left_image_url": p.left_image_url,
            "right_label": p.right_label,
            "right_image_url": p.right_image_url,
            "order_index": p.order_index,
        }
        for p in pairs
    ]


ANSWERED_QUESTION_STATUSES = {
    QuestionAttemptStatus.answered,
    QuestionAttemptStatus.graded,
    QuestionAttemptStatus.resolved,
    QuestionAttemptStatus.pending_manual,
}


def _active_questions_by_difficulty(package: ContentPackage) -> dict[str, list[QuestionBankItem]]:
    result = {band: [] for band in game_crud.GAME_DIFFICULTY_BAND_ORDER}
    for item in (package.question_bank.items if package.question_bank else []):
        if item.is_active and item.difficulty_band in result:
            result[item.difficulty_band].append(item)

    for band, items in result.items():
        result[band] = sorted(
            items,
            key=lambda item: (
                item.order_index if item.order_index is not None else 10**9,
                item.created_at,
                item.id,
            ),
        )
    return result


def _build_difficulty_progression_question_plan(package: ContentPackage, *, seed: str) -> dict[str, Any]:
    question_plan = game_crud.build_game_question_plan_preview(package)
    questions_by_difficulty = _active_questions_by_difficulty(package)

    distribution_mode = question_plan.get("distribution_mode")
    rng = random.Random(seed)
    question_ids_by_level: list[list[str]] = []
    question_ids_by_difficulty: dict[str, list[str]] = {}
    for band in game_crud.GAME_DIFFICULTY_BAND_ORDER:
        level_questions = list(questions_by_difficulty.get(band, []))
        if distribution_mode == "random":
            rng.shuffle(level_questions)
        question_ids_by_level.append([item.id for item in level_questions])
        question_ids_by_difficulty[band] = [item.id for item in level_questions]

    question_plan["question_ids_by_level"] = question_ids_by_level
    question_plan["question_ids_by_difficulty"] = question_ids_by_difficulty
    question_plan["difficulty_bands"] = list(game_crud.GAME_DIFFICULTY_BAND_ORDER)
    return question_plan


def _ensure_difficulty_progression_question_plan(attempt: PackageAttempt) -> dict[str, Any] | None:
    if not _is_gold_miner_package(attempt.package):
        return None

    existing = _attempt_question_plan(attempt)
    if (
        existing
        and isinstance(existing.get("question_ids_by_level"), list)
        and isinstance(existing.get("difficulty_bands"), list)
    ):
        return existing

    if not attempt.package:
        return None

    question_plan = _build_difficulty_progression_question_plan(attempt.package, seed=attempt.id)
    _set_attempt_runtime_state(
        attempt,
        question_plan=question_plan,
        game_state=_attempt_game_state(attempt),
    )
    return question_plan


def _ensure_gold_miner_question_plan(attempt: PackageAttempt) -> dict[str, Any] | None:
    return _ensure_difficulty_progression_question_plan(attempt)


def _runtime_config_for_package(
    package: ContentPackage,
    *,
    question_plan: dict[str, Any] | None = None,
    progress: dict[str, Any] | None = None,
    db: Session | None = None,
) -> dict[str, Any] | None:
    if not package.game_config:
        return None

    runtime_config = dict(package.game_config.runtime_config or {})
    session_config = runtime_config.get("session") if isinstance(runtime_config.get("session"), dict) else {}
    runtime_config["session"] = dict(session_config)

    # ── Memory Card: embed card pairs directly in runtime_config ──────────────
    if _is_memory_card_package(package) and db is not None:
        runtime_config["card_pairs"] = _card_pairs_for_runtime(db, package.id)
        if progress:
            runtime_config["question_progress"] = progress
        return runtime_config

    # ── Other games: question-plan distribution ────────────────────────────────
    effective_plan = question_plan
    if effective_plan is None:
        effective_plan = game_crud.build_game_question_plan_preview(package)

    public_plan = _public_question_plan(effective_plan)
    if public_plan:
        runtime_config["question_plan"] = public_plan
        runtime_config["session"].update({
            "max_levels": public_plan.get("level_count", 1),
            "item_count_per_level": public_plan.get("item_count_per_level"),
            "time_limit_seconds": public_plan.get("time_limit_seconds"),
            "target_scores_by_level": public_plan.get("target_scores_by_level", []),
        })

        distribution_config = (
            runtime_config.get("question_distribution")
            if isinstance(runtime_config.get("question_distribution"), dict)
            else {}
        )
        runtime_config["question_distribution"] = {
            **distribution_config,
            "mode": public_plan.get("distribution_mode", distribution_config.get("mode", "progressive")),
            "questions_per_level": max(public_plan.get("questions_per_level", [0]), default=0),
            "level_count": public_plan.get("level_count", 1),
        }

    if progress:
        runtime_config["question_progress"] = progress

    return runtime_config


def _find_question_by_id(package: ContentPackage | None, *, question_id: str) -> QuestionBankItem | None:
    if not package or not package.question_bank:
        return None
    return next(
        (item for item in package.question_bank.items if item.id == question_id and item.is_active),
        None,
    )


def _answered_question_ids(attempt: PackageAttempt) -> set[str]:
    return {
        item.question_item_id
        for item in attempt.question_attempts
        if item.question_item_id
        and (item.status in ANSWERED_QUESTION_STATUSES or item.answered_at is not None)
    }


def _presented_question_ids(attempt: PackageAttempt) -> set[str]:
    return {
        item.question_item_id
        for item in attempt.question_attempts
        if item.question_item_id
    }


def _progress_for_attempt(attempt: PackageAttempt) -> dict[str, Any]:
    question_plan = _ensure_difficulty_progression_question_plan(attempt) if _is_gold_miner_package(attempt.package) else _attempt_question_plan(attempt)
    difficulty_bands = (
        question_plan.get("difficulty_bands")
        if isinstance(question_plan, dict) and isinstance(question_plan.get("difficulty_bands"), list)
        else list(game_crud.GAME_DIFFICULTY_BAND_ORDER)
    )
    question_ids_by_difficulty = (
        question_plan.get("question_ids_by_difficulty")
        if isinstance(question_plan, dict) and isinstance(question_plan.get("question_ids_by_difficulty"), dict)
        else {}
    )

    if not question_ids_by_difficulty and attempt.package:
        questions_by_difficulty = _active_questions_by_difficulty(attempt.package)
        question_ids_by_difficulty = {
            band: [item.id for item in questions_by_difficulty.get(band, [])]
            for band in difficulty_bands
        }

    answered_ids = _answered_question_ids(attempt)
    by_difficulty: dict[str, dict[str, Any]] = {}
    total_questions = 0
    total_answered = 0
    current_level = 1
    current_difficulty_band: str | None = None

    for index, band in enumerate(difficulty_bands):
        question_ids = [
            str(question_id)
            for question_id in (question_ids_by_difficulty.get(band, []) if isinstance(question_ids_by_difficulty, dict) else [])
        ]
        answered = [question_id for question_id in question_ids if question_id in answered_ids]
        remaining = [question_id for question_id in question_ids if question_id not in answered_ids]
        total_questions += len(question_ids)
        total_answered += len(answered)
        by_difficulty[band] = {
            "total": len(question_ids),
            "answered": len(answered),
            "remaining": len(remaining),
            "remaining_question_ids": remaining,
            "completed": len(remaining) == 0,
        }
        if current_difficulty_band is None and remaining:
            current_level = index + 1
            current_difficulty_band = band

    all_questions_complete = total_questions == 0 or total_answered >= total_questions
    if all_questions_complete:
        current_level = len(difficulty_bands)
        current_difficulty_band = None

    return {
        "total_questions": total_questions,
        "questions_answered": total_answered,
        "questions_remaining": max(total_questions - total_answered, 0),
        "difficulty_bands": difficulty_bands,
        "by_difficulty": by_difficulty,
        "current_level": current_level,
        "current_difficulty_band": current_difficulty_band,
        "current_level_complete": current_difficulty_band is None or by_difficulty[current_difficulty_band]["remaining"] == 0,
        "all_questions_complete": all_questions_complete,
    }


def _attempt_has_required_gold_miner_answers(attempt: PackageAttempt) -> bool:
    if not _is_gold_miner_package(attempt.package):
        return True

    progress = _progress_for_attempt(attempt)
    return bool(progress.get("all_questions_complete"))


def _is_successful_completion(summary_payload: dict[str, Any] | None) -> bool:
    if not isinstance(summary_payload, dict):
        return False
    outcome = summary_payload.get("outcome")
    status = summary_payload.get("status")
    return outcome in {"success", "completed", "win"} or status == "completed"


def _attempt_totals(attempt: PackageAttempt) -> dict:
    question_attempts = list(attempt.question_attempts)
    active_question_attempt = _active_question_attempt(attempt)
    progress = _progress_for_attempt(attempt)
    questions_total = progress.get("total_questions")
    questions_answered = sum(
        1 for item in question_attempts if item.status in ANSWERED_QUESTION_STATUSES or item.answered_at is not None
    )
    correct_answers = sum(1 for item in question_attempts if item.is_correct is True)
    return {
        "questions_total": questions_total,
        "questions_presented": len(question_attempts),
        "questions_answered": progress.get("questions_answered", questions_answered),
        "questions_remaining": progress.get("questions_remaining"),
        "questions_pending_manual": sum(1 for item in question_attempts if item.status == QuestionAttemptStatus.pending_manual),
        "questions_correct": correct_answers,
        "correct_answers": correct_answers,
        "correct_count": correct_answers,
        "score_question": round(float(attempt.score_question or 0.0), 2),
        "score_context": round(float(attempt.score_context or 0.0), 2),
        "score_total": round(float(attempt.score_total or 0.0), 2),
        "active_question_attempt_id": active_question_attempt.id if active_question_attempt else None,
        "current_level": progress.get("current_level"),
        "current_difficulty_band": progress.get("current_difficulty_band"),
        "remaining_by_difficulty": {
            band: item["remaining"]
            for band, item in progress.get("by_difficulty", {}).items()
        },
        "answered_by_difficulty": {
            band: item["answered"]
            for band, item in progress.get("by_difficulty", {}).items()
        },
        "progress": progress,
    }


def _serialize_question_attempt(question_attempt: PackageQuestionAttempt, *, include_question: bool = False) -> dict:
    payload = {
        "id": question_attempt.id,
        "question_item_id": question_attempt.question_item_id,
        "source_context": question_attempt.source_context,
        "source_payload": question_attempt.source_payload,
        "display_order": question_attempt.display_order,
        "difficulty_band_snapshot": question_attempt.difficulty_band_snapshot,
        "presented_at": question_attempt.presented_at,
        "answered_at": question_attempt.answered_at,
        "graded_at": question_attempt.graded_at,
        "resolved_at": question_attempt.resolved_at,
        "pause_started_at": question_attempt.pause_started_at,
        "pause_ended_at": question_attempt.pause_ended_at,
        "status": question_attempt.status,
        "is_correct": question_attempt.is_correct,
        "score_awarded": question_attempt.score_awarded,
        "feedback_message": question_attempt.feedback_message,
        "selected_option_ids": [item.option_id for item in question_attempt.selected_options],
        "matching_answers": [
            {
                "left_item_id": item.left_item_id,
                "selected_right_key": item.selected_right_key,
                "is_correct": item.is_correct,
            }
            for item in question_attempt.matching_answers
        ],
        "text_answer": question_attempt.text_answer.raw_answer if question_attempt.text_answer else None,
        "uploaded_assets": [
            {
                "id": asset.id,
                "asset_url": asset.asset_url,
                "asset_type": asset.asset_type,
            }
            for asset in question_attempt.uploaded_assets
        ],
    }
    if include_question:
        payload["question"] = game_crud.serialize_game_question(
            question_attempt.question_item,
            package_id=question_attempt.package_attempt.package_id,
            include_correct=False,
        )
    return payload


def serialize_attempt_detail(attempt: PackageAttempt) -> dict:
    return {
        "id": attempt.id,
        "package_id": attempt.package_id,
        "class_id": attempt.class_id,
        "user_id": attempt.user_id,
        "student": {
            "id": attempt.user.id,
            "full_name": attempt.user.full_name,
            "email": attempt.user.email,
        }
        if attempt.user
        else None,
        "status": attempt.status,
        "play_context": attempt.play_context,
        "access_rule_id": attempt.access_rule_id,
        "attempt_index": attempt.attempt_index,
        "started_at": attempt.started_at,
        "submitted_at": attempt.submitted_at,
        "completed_at": attempt.completed_at,
        "duration_ms": attempt.duration_ms,
        "leaderboard_eligible": attempt.leaderboard_eligible,
        "score_question": attempt.score_question,
        "score_context": attempt.score_context,
        "score_total": attempt.score_total,
        "summary_payload": attempt.summary_payload,
        "runtime_state": attempt.runtime_state,
        "attempt_totals": _attempt_totals(attempt),
        "package": game_crud.serialize_game_package(attempt.package, class_id=attempt.class_id) if attempt.package else None,
        "question_attempts": [
            _serialize_question_attempt(item, include_question=True)
            for item in sorted(
                attempt.question_attempts,
                key=lambda row: (row.display_order if row.display_order is not None else 10**9, row.presented_at),
            )
        ],
        "runtime_events": [
            _serialize_runtime_event(event)
            for event in sorted(attempt.runtime_events, key=lambda row: row.created_at)
        ],
    }


def _active_question_attempt(attempt: PackageAttempt) -> PackageQuestionAttempt | None:
    candidates = [
        item
        for item in attempt.question_attempts
        if item.pause_started_at is not None
        and item.pause_ended_at is None
        and item.status in {QuestionAttemptStatus.presented, QuestionAttemptStatus.answered, QuestionAttemptStatus.pending_manual}
    ]
    if not candidates:
        return None
    return sorted(
        candidates,
        key=lambda row: (row.display_order if row.display_order is not None else 10**9, row.presented_at),
    )[-1]


def _teacher_can_access_attempt(attempt: PackageAttempt, teacher_id: str) -> bool:
    if attempt.package and attempt.package.created_by == teacher_id:
        return True
    if attempt.class_id and attempt.package:
        assignment = next((item for item in attempt.package.assignments if item.class_id == attempt.class_id), None)
        if assignment and assignment.class_ and assignment.class_.teacher_id == teacher_id:
            return True
    return False


def get_attempt_detail_for_user(db: Session, *, attempt_id: str, current_user: User) -> dict:
    ensure_default_game_modules(db)
    attempt = get_game_attempt(db, attempt_id)
    if not attempt:
        raise HTTPException(status_code=404, detail="Game attempt not found")

    if current_user.role == "student" and attempt.user_id != current_user.id:
        raise HTTPException(status_code=403, detail="Forbidden")
    if current_user.role == "teacher" and not _teacher_can_access_attempt(attempt, current_user.id):
        raise HTTPException(status_code=403, detail="Forbidden")
    if current_user.role not in {"teacher", "student"}:
        raise HTTPException(status_code=403, detail="Forbidden")

    return serialize_attempt_detail(attempt)


def _student_package_access(db: Session, *, package_id: str, student: User) -> tuple[ContentPackage, game_access_service.GameAccessContext]:
    package = game_crud.get_game_package(db, package_id)
    if not package:
        raise HTTPException(status_code=404, detail="Game package not found")
    if package.status == "archived":
        raise HTTPException(status_code=403, detail="Game package is archived")

    access = game_access_service.resolve_student_game_access(db, package=package, student=student)
    if not access.allowed:
        raise HTTPException(status_code=403, detail=access.reason or "Forbidden")
    return package, access


def list_my_game_packages(db: Session, *, student: User) -> list[dict]:
    ensure_default_game_modules(db)
    accessible_packages = game_access_service.list_accessible_game_packages(db, student=student)
    if not accessible_packages:
        return []

    packages = [package for package, _ in accessible_packages]
    access_by_package = {package.id: access for package, access in accessible_packages}
    attempts = (
        _attempt_query(db)
        .filter(PackageAttempt.user_id == student.id, PackageAttempt.package_id.in_([package.id for package in packages]))
        .all()
    )
    attempts_by_package: dict[str, list[PackageAttempt]] = {}
    for attempt in attempts:
        attempts_by_package.setdefault(attempt.package_id, []).append(attempt)

    payload = []
    for package in packages:
        access = access_by_package.get(package.id)
        package_attempts = attempts_by_package.get(package.id, [])
        active_attempt = next((item for item in package_attempts if item.status == PackageAttemptStatus.in_progress), None)
        completed_attempts = [item for item in package_attempts if item.status != PackageAttemptStatus.in_progress]
        data = game_crud.serialize_game_package(package, class_id=access.class_id if access else None)
        data["student_status"] = (
            "in_progress"
            if active_attempt
            else ("completed" if completed_attempts else "not_started")
        )
        data["best_score"] = max((item.score_total for item in completed_attempts if item.score_total is not None), default=None)
        data["active_attempt_id"] = active_attempt.id if active_attempt else None
        data["access_context"] = access.play_context if access else None
        data["can_play"] = True
        payload.append(data)
    return payload


def _game_packages_for_student_query(db: Session, class_ids: list[str]):
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
        .join(ContentPackageAssignment, ContentPackageAssignment.package_id == ContentPackage.id)
        .filter(
            ContentPackage.package_type == ContentPackageType.game,
            ContentPackageAssignment.class_id.in_(class_ids),
            ContentPackageAssignment.is_active.is_(True),
        )
        .distinct()
        .order_by(ContentPackage.created_at.desc())
    )


def _find_in_progress_attempt(db: Session, *, package_id: str, student_id: str) -> PackageAttempt | None:
    return (
        _attempt_query(db)
        .filter(
            PackageAttempt.package_id == package_id,
            PackageAttempt.user_id == student_id,
            PackageAttempt.status == PackageAttemptStatus.in_progress,
        )
        .first()
    )


def _start_response(db: Session, attempt: PackageAttempt, *, resume: bool) -> dict:
    module = attempt.package.game_config.game_module if attempt.package and attempt.package.game_config else None
    active_question = _active_question_attempt(attempt)
    attempt_totals = _attempt_totals(attempt)
    runtime_config = _runtime_config_for_package(
        attempt.package,
        question_plan=_attempt_question_plan(attempt),
        progress=attempt_totals.get("progress"),
        db=db,
    ) if attempt.package else None
    return {
        "attempt_id": attempt.id,
        "package_id": attempt.package_id,
        "module": game_crud.serialize_game_module(module),
        "manifest_url": module.manifest_url if module else None,
        "entry": ((module.capability_config or {}).get("entry") if module else None),
        "runtime_config": runtime_config,
        "status": attempt.status,
        "play_context": attempt.play_context,
        "class_id": attempt.class_id,
        "resume": resume,
        "attempt_totals": attempt_totals,
        "active_question_attempt": _serialize_question_attempt(active_question) if active_question else None,
        "active_question": (
            game_crud.serialize_game_question(active_question.question_item, package_id=attempt.package_id, include_correct=False)
            if active_question
            else None
        ),
    }


def get_play_data(db: Session, *, package_id: str, student: User) -> dict:
    ensure_default_game_modules(db)
    package, access = _student_package_access(db, package_id=package_id, student=student)
    attempt = _find_in_progress_attempt(db, package_id=package_id, student_id=student.id)
    if attempt:
        question_plan = _ensure_gold_miner_question_plan(attempt)
        if question_plan is not None:
            db.commit()
    module = package.game_config.game_module if package.game_config else None
    active_question = _active_question_attempt(attempt) if attempt else None

    return {
        "package": game_crud.serialize_game_package(package, class_id=access.class_id),
        "module": game_crud.serialize_game_module(module),
        "manifest_url": module.manifest_url if module else None,
        "entry": ((module.capability_config or {}).get("entry") if module else None),
        "runtime_config": (
            _runtime_config_for_package(
                package,
                question_plan=_attempt_question_plan(attempt),
                progress=_attempt_totals(attempt).get("progress"),
                db=db,
            )
            if attempt
            else _runtime_config_for_package(package, db=db)
        ),
        "access": {
            "allowed": True,
            "class_id": access.class_id,
            "play_context": access.play_context,
            "access_rule_id": access.access_rule_id,
        },
        "attempt": serialize_attempt_detail(attempt) if attempt else None,
        "active_question_attempt": _serialize_question_attempt(active_question) if active_question else None,
        "active_question": (
            game_crud.serialize_game_question(active_question.question_item, package_id=package.id, include_correct=False)
            if active_question
            else None
        ),
    }


def start_or_resume_attempt(db: Session, *, package_id: str, student: User) -> dict:
    ensure_default_game_modules(db)
    package, access = _student_package_access(db, package_id=package_id, student=student)

    existing = _find_in_progress_attempt(db, package_id=package_id, student_id=student.id)
    if existing:
        question_plan = _ensure_gold_miner_question_plan(existing)
        if question_plan is not None:
            db.commit()
        return _start_response(db, existing, resume=True)

    max_attempt_index = (
        db.query(PackageAttempt)
        .with_entities(func.max(PackageAttempt.attempt_index))
        .filter(PackageAttempt.package_id == package_id, PackageAttempt.user_id == student.id)
        .scalar()
    )
    attempt_index = int(max_attempt_index or 0) + 1
    attempt = PackageAttempt(
        package_id=package_id,
        user_id=student.id,
        class_id=access.class_id,
        play_context=access.play_context or "game_hub",
        access_rule_id=access.access_rule_id,
        attempt_index=attempt_index,
        status=PackageAttemptStatus.in_progress,
        started_at=now_local_naive(),
    )
    db.add(attempt)
    try:
        db.flush()
    except IntegrityError:
        db.rollback()
        existing_after_race = _find_in_progress_attempt(db, package_id=package_id, student_id=student.id)
        if existing_after_race:
            question_plan = _ensure_gold_miner_question_plan(existing_after_race)
            if question_plan is not None:
                db.commit()
            return _start_response(db, existing_after_race, resume=True)
        raise HTTPException(status_code=409, detail="Game attempt was started concurrently. Please retry.")

    _ensure_gold_miner_question_plan(attempt)
    db.add(
        GameRuntimeEvent(
            package_attempt_id=attempt.id,
            event_type="attempt_started",
            event_payload={
                "package_id": package_id,
                "class_id": access.class_id,
                "play_context": access.play_context,
                "access_rule_id": access.access_rule_id,
            },
        )
    )
    db.commit()

    created = get_game_attempt(db, attempt.id)
    if not created:
        raise HTTPException(status_code=500, detail="Failed to start game attempt")
    return _start_response(db, created, resume=False)


def _assert_attempt_for_runtime(db: Session, *, package_id: str, attempt_id: str, student_id: str) -> PackageAttempt:
    attempt = get_game_attempt(db, attempt_id)
    if not attempt or attempt.package_id != package_id:
        raise HTTPException(status_code=404, detail="Game attempt not found")
    if attempt.user_id != student_id:
        raise HTTPException(status_code=403, detail="Forbidden")
    if attempt.status != PackageAttemptStatus.in_progress:
        raise HTTPException(status_code=400, detail="Game attempt is not in progress")
    return attempt


def _select_question_for_difficulty(attempt: PackageAttempt, *, difficulty_band: str, selector_strategy: str) -> QuestionBankItem | None:
    package = attempt.package
    if not package or not package.question_bank:
        return None

    presented_question_ids = {item.question_item_id for item in attempt.question_attempts}
    eligible = [
        item
        for item in package.question_bank.items
        if item.is_active and item.difficulty_band == difficulty_band and item.id not in presented_question_ids
    ]
    eligible = sorted(
        eligible,
        key=lambda item: (
            item.order_index if item.order_index is not None else 10**9,
            item.created_at,
            item.id,
        ),
    )
    if not eligible:
        return None
    if selector_strategy == "random_no_repeat":
        return random.choice(eligible)
    return eligible[0]


def _find_question_attempt_by_item_instance(attempt: PackageAttempt, *, item_instance_id: str) -> PackageQuestionAttempt | None:
    for question_attempt in attempt.question_attempts:
        payload = question_attempt.source_payload if isinstance(question_attempt.source_payload, dict) else {}
        if payload.get("item_instance_id") == item_instance_id:
            return question_attempt
    return None


def _find_question_attempt_by_question_id(attempt: PackageAttempt, *, question_id: str) -> PackageQuestionAttempt | None:
    return next((item for item in attempt.question_attempts if item.question_item_id == question_id), None)


def _log_runtime_event(db: Session, *, attempt_id: str, event_type: str, event_payload: dict[str, Any] | None) -> None:
    db.add(
        GameRuntimeEvent(
            package_attempt_id=attempt_id,
            event_type=event_type,
            event_payload=event_payload,
        )
    )


def _should_ask_progression_question(
    *,
    capture_index: int,
    item_count_per_level: int,
    capture_slots: list[int],
    remaining_questions: int,
) -> tuple[bool, str]:
    if remaining_questions <= 0:
        return False, "level_question_quota_completed"

    remaining_captures_including_current = max(item_count_per_level - capture_index + 1, 0)
    if remaining_captures_including_current > 0 and remaining_questions >= remaining_captures_including_current:
        return True, "forced_tail_question"

    if capture_index in capture_slots:
        return True, "scheduled_checkpoint"

    return False, "adaptive_skip"


def _create_runtime_question_attempt(
    db: Session,
    *,
    attempt: PackageAttempt,
    question: QuestionBankItem,
    data: GameRuntimeTriggerRequest,
    item_instance_id: str | None,
    source_payload: dict[str, Any],
) -> PackageQuestionAttempt:
    question_attempt = PackageQuestionAttempt(
        package_attempt_id=attempt.id,
        question_item_id=question.id,
        source_context=QuestionSourceContext.game_trigger,
        source_payload={
            "trigger_type": data.trigger_type,
            "trigger_key": data.trigger_key,
            "trigger_value": data.trigger_value,
            "event_payload": data.event_payload,
            "item_instance_id": item_instance_id,
            **source_payload,
        },
        display_order=len(attempt.question_attempts),
        difficulty_band_snapshot=question.difficulty_band,
        presented_at=now_local_naive(),
        pause_started_at=now_local_naive(),
        status=QuestionAttemptStatus.presented,
    )
    db.add(question_attempt)
    db.flush()
    return question_attempt


def _handle_difficulty_progression_trigger(
    db: Session,
    *,
    attempt: PackageAttempt,
    package_id: str,
    data: GameRuntimeTriggerRequest,
    item_instance_id: str | None,
) -> dict:
    question_plan = _ensure_difficulty_progression_question_plan(attempt)
    if not question_plan:
        return {
            "action": "resume",
            "reason": "missing_question_plan",
            "attempt_totals": _attempt_totals(attempt),
        }

    event_payload = data.event_payload if isinstance(data.event_payload, dict) else {}
    try:
        level_number = int(event_payload.get("level", 0))
        capture_index = int(event_payload.get("capture_index_in_level", 0))
    except (TypeError, ValueError):
        level_number = 0
        capture_index = 0

    if capture_index <= 0:
        _log_runtime_event(
            db,
            attempt_id=attempt.id,
            event_type="trigger_invalid_payload",
            event_payload=data.model_dump(),
        )
        db.commit()
        return {
            "action": "resume",
            "reason": "invalid_trigger_payload",
            "attempt_totals": _attempt_totals(attempt),
        }

    progress = _progress_for_attempt(attempt)
    if progress.get("all_questions_complete"):
        return {
            "action": "resume",
            "reason": "all_questions_completed",
            "attempt_totals": _attempt_totals(attempt),
        }

    current_level = int(progress.get("current_level") or 1)
    current_difficulty = progress.get("current_difficulty_band")
    if not isinstance(current_difficulty, str):
        return {
            "action": "resume",
            "reason": "level_question_quota_completed",
            "attempt_totals": _attempt_totals(attempt),
        }

    if level_number > 0 and level_number != current_level:
        return {
            "action": "resume",
            "reason": "level_locked" if level_number > current_level else "stale_level",
            "attempt_totals": _attempt_totals(attempt),
        }

    capture_slots_by_level = question_plan.get("capture_slots_by_level") if isinstance(question_plan.get("capture_slots_by_level"), list) else []
    question_ids_by_difficulty = (
        question_plan.get("question_ids_by_difficulty")
        if isinstance(question_plan.get("question_ids_by_difficulty"), dict)
        else {}
    )
    item_count_per_level = int(question_plan.get("item_count_per_level") or 0)
    if item_count_per_level <= 0 or capture_index > item_count_per_level:
        return {
            "action": "resume",
            "reason": "invalid_trigger_payload",
            "attempt_totals": _attempt_totals(attempt),
        }

    level_index = current_level - 1
    capture_slots = (
        capture_slots_by_level[level_index]
        if level_index < len(capture_slots_by_level) and isinstance(capture_slots_by_level[level_index], list)
        else []
    )
    planned_question_ids = (
        question_ids_by_difficulty.get(current_difficulty, [])
        if isinstance(question_ids_by_difficulty, dict)
        else []
    )
    presented_question_ids = _presented_question_ids(attempt)
    remaining_question_ids = [
        question_id
        for question_id in planned_question_ids
        if question_id not in presented_question_ids
    ]
    remaining_in_level = progress["by_difficulty"][current_difficulty]["remaining"]

    should_ask, trigger_strategy = _should_ask_progression_question(
        capture_index=capture_index,
        item_count_per_level=item_count_per_level,
        capture_slots=capture_slots,
        remaining_questions=int(remaining_in_level),
    )
    if not should_ask:
        return {
            "action": "resume",
            "reason": trigger_strategy,
            "attempt_totals": _attempt_totals(attempt),
        }

    if not remaining_question_ids:
        return {
            "action": "resume",
            "reason": "level_question_quota_completed",
            "attempt_totals": _attempt_totals(attempt),
        }

    selector_strategy = attempt.package.game_config.selector_strategy if attempt.package and attempt.package.game_config else "random_no_repeat"
    question_id = random.choice(remaining_question_ids) if selector_strategy == "random_no_repeat" else remaining_question_ids[0]
    question = _find_question_by_id(attempt.package, question_id=question_id)
    if not question:
        _log_runtime_event(
            db,
            attempt_id=attempt.id,
            event_type="trigger_missing_planned_question",
            event_payload={
                **data.model_dump(),
                "question_item_id": question_id,
                "level": current_level,
                "difficulty_band": current_difficulty,
                "capture_index_in_level": capture_index,
            },
        )
        db.commit()
        return {
            "action": "resume",
            "reason": "question_missing",
            "attempt_totals": _attempt_totals(attempt),
        }

    question_attempt = _create_runtime_question_attempt(
        db,
        attempt=attempt,
        question=question,
        data=data,
        item_instance_id=item_instance_id,
        source_payload={
            "level": current_level,
            "difficulty_band": current_difficulty,
            "capture_index_in_level": capture_index,
            "distribution_mode": question_plan.get("distribution_mode"),
            "trigger_strategy": trigger_strategy,
        },
    )
    _log_runtime_event(
        db,
        attempt_id=attempt.id,
        event_type="question_triggered",
        event_payload={
            **data.model_dump(),
            "question_attempt_id": question_attempt.id,
            "question_item_id": question.id,
            "level": current_level,
            "difficulty_band": current_difficulty,
            "capture_index_in_level": capture_index,
            "trigger_strategy": trigger_strategy,
        },
    )
    db.commit()

    refreshed_attempt = get_game_attempt(db, attempt.id)
    if not refreshed_attempt:
        raise HTTPException(status_code=500, detail="Failed to prepare question")
    refreshed_question_attempt = next(item for item in refreshed_attempt.question_attempts if item.id == question_attempt.id)
    return {
        "action": "ask_question",
        "question_attempt": _serialize_question_attempt(refreshed_question_attempt),
        "question": game_crud.serialize_game_question(question, package_id=package_id, include_correct=False),
        "attempt_totals": _attempt_totals(refreshed_attempt),
    }


def handle_trigger(db: Session, *, package_id: str, student: User, data: GameRuntimeTriggerRequest) -> dict:
    ensure_default_game_modules(db)
    attempt = _assert_attempt_for_runtime(db, package_id=package_id, attempt_id=data.attempt_id, student_id=student.id)

    active_question_attempt = _active_question_attempt(attempt)
    if active_question_attempt:
        return {
            "action": "ask_question",
            "question_attempt": _serialize_question_attempt(active_question_attempt),
            "question": game_crud.serialize_game_question(
                active_question_attempt.question_item,
                package_id=package_id,
                include_correct=False,
            ),
            "attempt_totals": _attempt_totals(attempt),
        }

    event_payload = data.event_payload if isinstance(data.event_payload, dict) else {}
    item_instance_id = event_payload.get("item_instance_id")
    if isinstance(item_instance_id, str) and item_instance_id:
        existing_item_attempt = _find_question_attempt_by_item_instance(attempt, item_instance_id=item_instance_id)
        if existing_item_attempt:
            return {
                "action": "resume",
                "reason": "trigger_already_handled",
                "attempt_totals": _attempt_totals(attempt),
            }

    if _is_gold_miner_package(attempt.package):
        return _handle_difficulty_progression_trigger(
            db,
            attempt=attempt,
            package_id=package_id,
            data=data,
            item_instance_id=item_instance_id if isinstance(item_instance_id, str) else None,
        )

    module = attempt.package.game_config.game_module if attempt.package and attempt.package.game_config else None
    mapping = next(
        (
            item
            for item in (module.trigger_mappings if module else [])
            if item.is_active
            and item.trigger_type == data.trigger_type
            and item.trigger_key == data.trigger_key
            and item.trigger_value == data.trigger_value
        ),
        None,
    )
    if not mapping:
        _log_runtime_event(
            db,
            attempt_id=attempt.id,
            event_type="trigger_unmapped",
            event_payload=data.model_dump(),
        )
        db.commit()
        return {
            "action": "resume",
            "reason": "unmapped_trigger",
            "attempt_totals": _attempt_totals(attempt),
        }

    selector_strategy = mapping.selector_strategy or (
        attempt.package.game_config.selector_strategy if attempt.package and attempt.package.game_config else "random_no_repeat"
    )
    question = _select_question_for_difficulty(
        attempt,
        difficulty_band=mapping.difficulty_band,
        selector_strategy=selector_strategy,
    )
    if not question:
        _log_runtime_event(
            db,
            attempt_id=attempt.id,
            event_type="trigger_no_question",
            event_payload={
                **data.model_dump(),
                "difficulty_band": mapping.difficulty_band,
            },
        )
        db.commit()
        return {
            "action": "resume",
            "reason": "no_question_available",
            "attempt_totals": _attempt_totals(attempt),
        }

    question_attempt = PackageQuestionAttempt(
        package_attempt_id=attempt.id,
        question_item_id=question.id,
        source_context=QuestionSourceContext.game_trigger,
        source_payload={
            "trigger_type": data.trigger_type,
            "trigger_key": data.trigger_key,
            "trigger_value": data.trigger_value,
            "event_payload": data.event_payload,
            "item_instance_id": item_instance_id if isinstance(item_instance_id, str) else None,
        },
        display_order=len(attempt.question_attempts),
        difficulty_band_snapshot=question.difficulty_band,
        presented_at=now_local_naive(),
        pause_started_at=now_local_naive(),
        status=QuestionAttemptStatus.presented,
    )
    db.add(question_attempt)
    db.flush()
    _log_runtime_event(
        db,
        attempt_id=attempt.id,
        event_type="question_triggered",
        event_payload={
            **data.model_dump(),
            "difficulty_band": mapping.difficulty_band,
            "question_attempt_id": question_attempt.id,
            "question_item_id": question.id,
        },
    )
    db.commit()

    refreshed_attempt = get_game_attempt(db, attempt.id)
    if not refreshed_attempt:
        raise HTTPException(status_code=500, detail="Failed to prepare question")
    refreshed_question_attempt = next(item for item in refreshed_attempt.question_attempts if item.id == question_attempt.id)
    return {
        "action": "ask_question",
        "question_attempt": _serialize_question_attempt(refreshed_question_attempt),
        "question": game_crud.serialize_game_question(question, package_id=package_id, include_correct=False),
        "attempt_totals": _attempt_totals(refreshed_attempt),
    }


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


def _replace_answer_payload(db: Session, *, question_attempt: PackageQuestionAttempt, data: GameRuntimeAnswerRequest) -> None:
    question_item = question_attempt.question_item
    _clear_question_attempt_children(db, question_attempt)

    if question_item.type in (QuestionType.single_choice, QuestionType.multi_choice):
        valid_option_ids = {option.id for option in question_item.options}
        if data.selected_option_ids and not set(data.selected_option_ids).issubset(valid_option_ids):
            raise HTTPException(status_code=400, detail="Selected option is invalid")
        if question_item.type == QuestionType.single_choice and len(data.selected_option_ids) > 1:
            raise HTTPException(status_code=400, detail="Single choice questions accept only one answer")
        for option_id in data.selected_option_ids:
            question_attempt.selected_options.append(
                QuestionAttemptSelectedOption(
                    option_id=option_id,
                )
            )
        return

    if question_item.type == QuestionType.matching:
        payload = data.matching_answers
        if not payload and data.text_answer:
            try:
                decoded = json.loads(data.text_answer)
            except (TypeError, json.JSONDecodeError):
                decoded = []
            payload = decoded if isinstance(decoded, list) else []

        left_item_ids = {item.id for item in question_item.matching_left_items}
        right_keys = {item.right_key for item in question_item.matching_right_items}
        for item in payload:
            left_item_id = item["left_item_id"] if isinstance(item, dict) else item.left_item_id
            selected_right_key = item.get("selected_right_key") if isinstance(item, dict) else item.selected_right_key
            if left_item_id not in left_item_ids:
                raise HTTPException(status_code=400, detail="Matching answer is invalid")
            if selected_right_key and selected_right_key not in right_keys:
                raise HTTPException(status_code=400, detail="Matching answer is invalid")
            question_attempt.matching_answers.append(
                QuestionAttemptMatchingAnswer(
                    left_item_id=left_item_id,
                    selected_right_key=selected_right_key,
                )
            )
        return

    if question_item.type == QuestionType.text:
        question_attempt.text_answer = QuestionAttemptTextAnswer(
            raw_answer=data.text_answer or "",
            normalized_answer=None,
            grading_mode_snapshot=(question_item.text_config.grading_mode if question_item.text_config else None),
        )
        return

    if question_item.type == QuestionType.image_upload:
        if not data.uploaded_image_url:
            raise HTTPException(status_code=400, detail="uploaded_image_url is required")
        question_attempt.uploaded_assets.append(
            QuestionAttemptUploadedAsset(
                asset_url=data.uploaded_image_url,
                asset_type="image",
            )
        )
        return

    raise HTTPException(status_code=400, detail="Unsupported question type")


def submit_runtime_answer(db: Session, *, package_id: str, student: User, data: GameRuntimeAnswerRequest) -> dict:
    ensure_default_game_modules(db)
    attempt = _assert_attempt_for_runtime(db, package_id=package_id, attempt_id=data.attempt_id, student_id=student.id)
    question_attempt = next((item for item in attempt.question_attempts if item.id == data.question_attempt_id), None)
    if not question_attempt:
        raise HTTPException(status_code=404, detail="Question attempt not found")

    if question_attempt.pause_ended_at is not None and question_attempt.status in {
        QuestionAttemptStatus.graded,
        QuestionAttemptStatus.resolved,
        QuestionAttemptStatus.pending_manual,
    }:
        return {
            "question_attempt_id": question_attempt.id,
            "status": question_attempt.status,
            "is_correct": question_attempt.is_correct,
            "score_awarded": question_attempt.score_awarded,
            "feedback_message": question_attempt.feedback_message,
            "attempt_totals": _attempt_totals(attempt),
            "resume_payload": {
                "question_result": _serialize_question_attempt(question_attempt),
                "attempt_totals": _attempt_totals(attempt),
            },
        }

    answered_at = now_local_naive()
    _replace_answer_payload(db, question_attempt=question_attempt, data=data)
    db.flush()
    question_attempt.answered_at = answered_at
    question_attempt.status = QuestionAttemptStatus.answered
    question_attempt.pause_ended_at = answered_at

    grade_question_attempt(question_attempt)
    recalculate_attempt_scores(attempt, finalize_status=False)
    attempt.status = PackageAttemptStatus.in_progress

    _log_runtime_event(
        db,
        attempt_id=attempt.id,
        event_type="question_answered",
        event_payload={
            "question_attempt_id": question_attempt.id,
            "question_item_id": question_attempt.question_item_id,
            "status": question_attempt.status,
            "is_correct": question_attempt.is_correct,
            "score_awarded": question_attempt.score_awarded,
        },
    )
    db.commit()

    refreshed_attempt = get_game_attempt(db, attempt.id)
    if not refreshed_attempt:
        raise HTTPException(status_code=500, detail="Failed to save answer")
    refreshed_question_attempt = next(item for item in refreshed_attempt.question_attempts if item.id == question_attempt.id)
    totals = _attempt_totals(refreshed_attempt)
    return {
        "question_attempt_id": refreshed_question_attempt.id,
        "status": refreshed_question_attempt.status,
        "is_correct": refreshed_question_attempt.is_correct,
        "score_awarded": refreshed_question_attempt.score_awarded,
        "feedback_message": refreshed_question_attempt.feedback_message,
        "attempt_totals": totals,
        "resume_payload": {
            "question_result": _serialize_question_attempt(refreshed_question_attempt),
            "attempt_totals": totals,
        },
    }


def log_runtime_event(db: Session, *, package_id: str, student: User, data: GameRuntimeEventRequest) -> dict:
    ensure_default_game_modules(db)
    attempt = _assert_attempt_for_runtime(db, package_id=package_id, attempt_id=data.attempt_id, student_id=student.id)

    event_payload = data.event_payload or {}
    question_attempt_id = event_payload.get("question_attempt_id") if isinstance(event_payload, dict) else None
    if question_attempt_id:
        question_attempt = next((item for item in attempt.question_attempts if item.id == question_attempt_id), None)
        if question_attempt:
            if data.event_type == "pause" and question_attempt.pause_started_at is None:
                question_attempt.pause_started_at = now_local_naive()
            if data.event_type == "resume" and question_attempt.pause_ended_at is None:
                question_attempt.pause_ended_at = now_local_naive()

    runtime_state = event_payload.get("runtime_state") if isinstance(event_payload, dict) else None
    if runtime_state is not None:
        _set_attempt_runtime_state(
            attempt,
            question_plan=_attempt_question_plan(attempt),
            game_state=runtime_state if isinstance(runtime_state, dict) else {},
        )

    _log_runtime_event(db, attempt_id=attempt.id, event_type=data.event_type, event_payload=event_payload)
    db.commit()
    return {
        "attempt_id": attempt.id,
        "event_type": data.event_type,
        "attempt_totals": _attempt_totals(attempt),
    }


def _extract_context_score(summary_payload: dict[str, Any], current_score: float | None) -> float | None:
    for key in ("score_context", "context_score", "gameplay_score", "score"):
        value = summary_payload.get(key)
        if isinstance(value, (int, float)):
            return round(float(value), 2)
    return current_score


def _extract_duration_ms(summary_payload: dict[str, Any], *, started_at, completed_at) -> int | None:
    # Priority 1: total_question_time_ms (time spent on questions - tie-breaker for ranking)
    for key in ("total_question_time_ms", "question_time_ms", "question_duration_ms"):
        value = summary_payload.get(key)
        if isinstance(value, (int, float)) and value >= 0:
            return int(value)
    
    # Priority 2: duration_ms
    for key in ("duration_ms", "elapsed_ms", "time_ms"):
        value = summary_payload.get(key)
        if isinstance(value, (int, float)) and value >= 0:
            return int(value)
    for key in ("duration_seconds", "elapsed_seconds", "time_seconds"):
        value = summary_payload.get(key)
        if isinstance(value, (int, float)) and value >= 0:
            return int(value * 1000)
    if started_at and completed_at:
        return max(int((completed_at - started_at).total_seconds() * 1000), 0)
    return None


def complete_attempt(db: Session, *, package_id: str, student: User, data: GameCompleteRequest) -> dict:
    ensure_default_game_modules(db)
    attempt = get_game_attempt(db, data.attempt_id)
    if not attempt or attempt.package_id != package_id:
        raise HTTPException(status_code=404, detail="Game attempt not found")
    if attempt.user_id != student.id:
        raise HTTPException(status_code=403, detail="Forbidden")
    if _is_successful_completion(data.summary_payload) and not _attempt_has_required_gold_miner_answers(attempt):
        raise HTTPException(
            status_code=400,
            detail="Bạn cần hoàn thành toàn bộ câu hỏi đã được phân bổ trước khi kết thúc trò chơi.",
        )

    completed_at = now_local_naive()
    attempt.summary_payload = data.summary_payload
    if data.runtime_state is not None:
        _set_attempt_runtime_state(
            attempt,
            question_plan=_attempt_question_plan(attempt),
            game_state=data.runtime_state if isinstance(data.runtime_state, dict) else {},
        )
    attempt.score_context = _extract_context_score(data.summary_payload, attempt.score_context)
    recalculate_attempt_scores(attempt, finalize_status=False)
    attempt.completed_at = completed_at
    attempt.submitted_at = attempt.submitted_at or completed_at
    attempt.duration_ms = _extract_duration_ms(data.summary_payload, started_at=attempt.started_at, completed_at=completed_at)
    attempt.status = PackageAttemptStatus.completed
    game_leaderboard_service.update_leaderboard_for_attempt(db, attempt=attempt)

    _log_runtime_event(
        db,
        attempt_id=attempt.id,
        event_type="complete",
        event_payload={
            "summary_payload": data.summary_payload,
            "runtime_state": data.runtime_state,
        },
    )
    db.commit()

    refreshed_attempt = get_game_attempt(db, attempt.id)
    if not refreshed_attempt:
        raise HTTPException(status_code=500, detail="Failed to complete attempt")
    return serialize_attempt_detail(refreshed_attempt)
