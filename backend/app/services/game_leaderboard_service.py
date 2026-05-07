from __future__ import annotations

from datetime import datetime
from math import inf
from typing import Any

from sqlalchemy.orm import Session, selectinload

from app.models.package_attempt import GameLeaderboardEntry, PackageAttempt
from app.models.user import User
from app.utils.enums import PackageAttemptStatus


def _duration_value(value: int | None) -> float:
    return float(value) if value is not None else inf


def _score_value(value: float | None) -> float:
    return float(value) if value is not None else -inf


def _attempt_rank_key(attempt: PackageAttempt) -> tuple:
    return (
        -_score_value(attempt.score_total),
        -_score_value(attempt.score_context),
        -_score_value(attempt.score_question),
        _duration_value(attempt.duration_ms),
        attempt.completed_at or datetime.max,
        attempt.attempt_index,
    )


def _entry_rank_key(entry: GameLeaderboardEntry) -> tuple:
    best_completed_at = entry.best_attempt.completed_at if entry.best_attempt else None
    return (
        -_score_value(entry.best_score_total),
        -_score_value(entry.best_score_context),
        -_score_value(entry.best_score_question),
        _duration_value(entry.best_duration_ms),
        best_completed_at or datetime.max,
        entry.attempts_count,
    )


def _is_better_attempt(attempt: PackageAttempt, entry: GameLeaderboardEntry) -> bool:
    if not entry.best_attempt_id:
        return True
    best_attempt = entry.best_attempt
    if not best_attempt:
        return True
    return _attempt_rank_key(attempt) < _attempt_rank_key(best_attempt)


def _completed_eligible_attempt_count(db: Session, *, package_id: str, user_id: str) -> int:
    return (
        db.query(PackageAttempt)
        .filter(
            PackageAttempt.package_id == package_id,
            PackageAttempt.user_id == user_id,
            PackageAttempt.status == PackageAttemptStatus.completed,
            PackageAttempt.leaderboard_eligible.is_(True),
        )
        .count()
    )


def update_leaderboard_for_attempt(db: Session, *, attempt: PackageAttempt) -> None:
    if attempt.status != PackageAttemptStatus.completed or not attempt.leaderboard_eligible:
        return

    scopes: list[tuple[str, str]] = [("global", "")]
    if attempt.class_id:
        scopes.append(("class", attempt.class_id))

    for scope_type, scope_id in scopes:
        entry = (
            db.query(GameLeaderboardEntry)
            .options(selectinload(GameLeaderboardEntry.best_attempt))
            .filter(
                GameLeaderboardEntry.package_id == attempt.package_id,
                GameLeaderboardEntry.user_id == attempt.user_id,
                GameLeaderboardEntry.scope_type == scope_type,
                GameLeaderboardEntry.scope_id == scope_id,
            )
            .first()
        )
        if not entry:
            entry = GameLeaderboardEntry(
                package_id=attempt.package_id,
                user_id=attempt.user_id,
                scope_type=scope_type,
                scope_id=scope_id,
            )
            db.add(entry)
            db.flush()

        if _is_better_attempt(attempt, entry):
            entry.best_attempt_id = attempt.id
            entry.best_score_total = attempt.score_total
            entry.best_score_context = attempt.score_context
            entry.best_score_question = attempt.score_question
            entry.best_duration_ms = attempt.duration_ms

        entry.last_attempt_id = attempt.id
        entry.last_played_at = attempt.completed_at
        entry.attempts_count = _completed_eligible_attempt_count(db, package_id=attempt.package_id, user_id=attempt.user_id)


def _serialize_entry(entry: GameLeaderboardEntry, *, rank: int, current_user_id: str | None) -> dict[str, Any]:
    return {
        "rank": rank,
        "user_id": entry.user_id,
        "student_name": entry.user.full_name if entry.user else None,
        "avatar_url": entry.user.avatar_url if entry.user else None,
        "best_attempt_id": entry.best_attempt_id,
        "best_score_total": entry.best_score_total,
        "best_score_context": entry.best_score_context,
        "best_score_question": entry.best_score_question,
        "best_duration_ms": entry.best_duration_ms,
        "attempts_count": entry.attempts_count,
        "last_played_at": entry.last_played_at,
        "is_current_user": bool(current_user_id and entry.user_id == current_user_id),
    }


def get_leaderboard(
    db: Session,
    *,
    package_id: str,
    current_user_id: str | None,
    scope_type: str = "global",
    scope_id: str | None = None,
    limit: int = 50,
) -> dict[str, Any]:
    normalized_scope_id = scope_id or ""
    entries = (
        db.query(GameLeaderboardEntry)
        .options(
            selectinload(GameLeaderboardEntry.user),
            selectinload(GameLeaderboardEntry.best_attempt),
        )
        .filter(
            GameLeaderboardEntry.package_id == package_id,
            GameLeaderboardEntry.scope_type == scope_type,
            GameLeaderboardEntry.scope_id == normalized_scope_id,
        )
        .all()
    )
    ranked_entries = sorted(entries, key=_entry_rank_key)
    serialized = [
        _serialize_entry(entry, rank=index + 1, current_user_id=current_user_id)
        for index, entry in enumerate(ranked_entries)
    ]
    current_user_entry = next((entry for entry in serialized if entry["is_current_user"]), None)
    return {
        "package_id": package_id,
        "scope_type": scope_type,
        "scope_id": normalized_scope_id,
        "entries": serialized[: max(1, min(limit, 100))],
        "current_user_entry": current_user_entry,
        "total_entries": len(serialized),
        "ranking_policy": {
            "primary_metric": "score_total",
            "tie_breakers": [
                "score_context",
                "score_question",
                "total_question_time_ms",  # Lower is better - faster answer time wins
                "duration_ms",
                "completed_at",
                "attempts_count"
            ],
            "aggregation": "best_attempt",
            "note": "Ranking: highest score wins; ties broken by fastest total question answer time",
        },
    }
