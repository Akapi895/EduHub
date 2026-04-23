from __future__ import annotations

from copy import deepcopy
from datetime import datetime
from typing import Any

from sqlalchemy.orm import Session

from app.models.interactive_book import (
    InteractiveBook,
    InteractiveBookAttempt,
    InteractiveBookEvent,
)
from app.utils.enums import InteractiveBookAttemptStatus, InteractiveBookStatus


def get_by_material_id(db: Session, material_id: str) -> InteractiveBook | None:
    return db.query(InteractiveBook).filter(InteractiveBook.material_id == material_id).first()


def create(
    db: Session,
    *,
    material_id: str,
    created_by: str,
    draft_manifest: dict[str, Any],
    entry_scene_id: str,
    estimated_duration: int | None = None,
) -> InteractiveBook:
    interactive_book = InteractiveBook(
        material_id=material_id,
        created_by=created_by,
        draft_manifest=draft_manifest,
        entry_scene_id=entry_scene_id,
        estimated_duration=estimated_duration,
        status=InteractiveBookStatus.draft,
    )
    db.add(interactive_book)
    db.commit()
    db.refresh(interactive_book)
    return interactive_book


def update_draft(
    db: Session,
    *,
    interactive_book: InteractiveBook,
    draft_manifest: dict[str, Any] | None = None,
    entry_scene_id: str | None = None,
    estimated_duration: int | None = None,
) -> InteractiveBook:
    if draft_manifest is not None:
        interactive_book.draft_manifest = draft_manifest
    if entry_scene_id is not None:
        interactive_book.entry_scene_id = entry_scene_id
    if estimated_duration is not None:
        interactive_book.estimated_duration = estimated_duration
    db.commit()
    db.refresh(interactive_book)
    return interactive_book


def clone_book(
    db: Session,
    *,
    source: InteractiveBook,
    material_id: str,
    created_by: str,
    commit: bool = True,
) -> InteractiveBook:
    interactive_book = InteractiveBook(
        material_id=material_id,
        created_by=created_by,
        status=source.status,
        draft_manifest=deepcopy(source.draft_manifest),
        published_manifest=deepcopy(source.published_manifest),
        manifest_version=source.manifest_version,
        entry_scene_id=source.entry_scene_id,
        estimated_duration=source.estimated_duration,
        published_at=source.published_at,
    )
    db.add(interactive_book)
    if commit:
        db.commit()
        db.refresh(interactive_book)
    else:
        db.flush()
    return interactive_book


def sync_book_snapshot(
    db: Session,
    *,
    interactive_book: InteractiveBook,
    source: InteractiveBook,
    commit: bool = True,
) -> InteractiveBook:
    interactive_book.status = source.status
    interactive_book.draft_manifest = deepcopy(source.draft_manifest)
    interactive_book.published_manifest = deepcopy(source.published_manifest)
    interactive_book.manifest_version = source.manifest_version
    interactive_book.entry_scene_id = source.entry_scene_id
    interactive_book.estimated_duration = source.estimated_duration
    interactive_book.published_at = source.published_at
    if commit:
        db.commit()
        db.refresh(interactive_book)
    else:
        db.flush()
    return interactive_book


def publish(db: Session, *, interactive_book: InteractiveBook, manifest: dict[str, Any]) -> InteractiveBook:
    interactive_book.published_manifest = manifest
    interactive_book.manifest_version += 1
    interactive_book.status = InteractiveBookStatus.published
    interactive_book.published_at = datetime.now()
    db.commit()
    db.refresh(interactive_book)
    return interactive_book


def get_latest_attempt_for_student(
    db: Session,
    *,
    interactive_book_id: str,
    student_id: str,
) -> InteractiveBookAttempt | None:
    return (
        db.query(InteractiveBookAttempt)
        .filter(
            InteractiveBookAttempt.interactive_book_id == interactive_book_id,
            InteractiveBookAttempt.student_id == student_id,
        )
        .order_by(InteractiveBookAttempt.started_at.desc())
        .first()
    )


def get_active_attempt_for_student(
    db: Session,
    *,
    interactive_book_id: str,
    student_id: str,
) -> InteractiveBookAttempt | None:
    return (
        db.query(InteractiveBookAttempt)
        .filter(
            InteractiveBookAttempt.interactive_book_id == interactive_book_id,
            InteractiveBookAttempt.student_id == student_id,
            InteractiveBookAttempt.status == InteractiveBookAttemptStatus.in_progress,
        )
        .order_by(InteractiveBookAttempt.started_at.desc())
        .first()
    )


def get_attempt(db: Session, attempt_id: str) -> InteractiveBookAttempt | None:
    return db.query(InteractiveBookAttempt).filter(InteractiveBookAttempt.id == attempt_id).first()


def create_attempt(
    db: Session,
    *,
    interactive_book_id: str,
    student_id: str,
    class_id: str | None,
    manifest_version: int,
    manifest_snapshot: dict[str, Any],
    current_scene_id: str | None,
    state_snapshot: dict[str, Any],
    score_summary: dict[str, Any] | None = None,
) -> InteractiveBookAttempt:
    attempt = InteractiveBookAttempt(
        interactive_book_id=interactive_book_id,
        student_id=student_id,
        class_id=class_id,
        manifest_version=manifest_version,
        manifest_snapshot=manifest_snapshot,
        current_scene_id=current_scene_id,
        state_snapshot=state_snapshot,
        score_summary=score_summary,
        completion_percent=0.0,
        status=InteractiveBookAttemptStatus.in_progress,
    )
    db.add(attempt)
    db.commit()
    db.refresh(attempt)
    return attempt


def save_checkpoint(
    db: Session,
    *,
    attempt: InteractiveBookAttempt,
    current_scene_id: str,
    state_snapshot: dict[str, Any],
    completion_percent: float,
    score_summary: dict[str, Any] | None,
) -> InteractiveBookAttempt:
    attempt.current_scene_id = current_scene_id
    attempt.state_snapshot = state_snapshot
    attempt.completion_percent = completion_percent
    attempt.score_summary = score_summary
    attempt.last_seen_at = datetime.now()
    db.commit()
    db.refresh(attempt)
    return attempt


def complete_attempt(
    db: Session,
    *,
    attempt: InteractiveBookAttempt,
    current_scene_id: str | None,
    state_snapshot: dict[str, Any],
    completion_percent: float,
    score_summary: dict[str, Any] | None,
) -> InteractiveBookAttempt:
    attempt.current_scene_id = current_scene_id
    attempt.state_snapshot = state_snapshot
    attempt.completion_percent = completion_percent
    attempt.score_summary = score_summary
    attempt.last_seen_at = datetime.now()
    attempt.completed_at = datetime.now()
    attempt.status = InteractiveBookAttemptStatus.completed
    db.commit()
    db.refresh(attempt)
    return attempt


def create_events(
    db: Session,
    *,
    attempt_id: str,
    events: list[dict[str, Any]],
) -> list[InteractiveBookEvent]:
    created: list[InteractiveBookEvent] = []
    for event in events:
        row = InteractiveBookEvent(
            attempt_id=attempt_id,
            scene_id=event.get("scene_id"),
            event_type=event["event_type"],
            payload=event.get("payload"),
        )
        db.add(row)
        created.append(row)
    db.commit()
    for row in created:
        db.refresh(row)
    return created
