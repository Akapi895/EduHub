from __future__ import annotations

from typing import Any

from fastapi import HTTPException
from sqlalchemy.orm import Session

from app.crud import class_crud, interactive_book as interactive_book_crud, material as material_crud
from app.models.class_model import ClassMaterial
from app.models.interactive_book import (
    InteractiveBook,
    InteractiveBookAttempt,
    InteractiveBookMedia,
    InteractiveBookQuiz,
    InteractiveBookQuizOption,
    InteractiveBookScene,
    InteractiveBookSceneElement,
    InteractiveBookTransition,
    InteractiveBookVideoInteraction,
    InteractiveBookVideoOption,
)
from app.models.material import Material
from app.models.user import User
from app.schemas.interactive_book import (
    InteractiveBookCheckpointRequest,
    InteractiveBookCompleteRequest,
    InteractiveBookCreateRequest,
    InteractiveBookDraftUpdateRequest,
    InteractiveBookManifest,
)
from app.utils.enums import (
    InteractiveBookAttemptStatus,
    InteractiveBookStatus,
    MaterialType,
)


def _default_state_snapshot(entry_scene_id: str) -> dict[str, Any]:
    return {
        "visited_scenes": [entry_scene_id],
        "branch_history": [],
        "interaction_results": [],
        "media_progress": {},
        "derived_score": {
            "attempted": 0,
            "correct": 0,
            "score": 0,
        },
    }


def _can_teacher_access_material(material: Material, teacher_id: str) -> bool:
    return material.is_system or material.created_by == teacher_id


def _serialize_material(material: Material) -> dict[str, Any]:
    data = {
        "id": material.id,
        "title": material.title,
        "description": material.description,
        "thumbnail_url": material.thumbnail_url,
        "file_url": material.file_url,
        "material_type": material.material_type,
        "subject": material.subject,
        "grade": material.grade,
        "is_system": material.is_system,
        "folder_id": material.folder_id,
        "created_by": material.created_by,
        "shared_by": material.shared_by,
        "source_id": material.source_id,
        "created_at": material.created_at.isoformat() if material.created_at else None,
    }
    if material.interactive_book:
        data["interactive_status"] = material.interactive_book.status
        data["manifest_version"] = material.interactive_book.manifest_version
        data["entry_scene_id"] = material.interactive_book.entry_scene_id
        data["estimated_duration"] = material.interactive_book.estimated_duration
    return data


def _serialize_book(interactive_book: InteractiveBook) -> dict[str, Any]:
    return {
        "material_id": interactive_book.material_id,
        "status": interactive_book.status,
        "manifest_version": interactive_book.manifest_version,
        "entry_scene_id": interactive_book.entry_scene_id,
        "estimated_duration": interactive_book.estimated_duration,
        "published_at": interactive_book.published_at.isoformat() if interactive_book.published_at else None,
        "created_at": interactive_book.created_at.isoformat() if interactive_book.created_at else None,
        "updated_at": interactive_book.updated_at.isoformat() if interactive_book.updated_at else None,
    }


def _serialize_attempt(attempt: InteractiveBookAttempt) -> dict[str, Any]:
    return {
        "id": attempt.id,
        "interactive_book_id": attempt.interactive_book_id,
        "student_id": attempt.student_id,
        "class_id": attempt.class_id,
        "manifest_version": attempt.manifest_version,
        "status": attempt.status,
        "current_scene_id": attempt.current_scene_id,
        "state_snapshot": attempt.state_snapshot,
        "completion_percent": attempt.completion_percent,
        "score_summary": attempt.score_summary,
        "started_at": attempt.started_at.isoformat() if attempt.started_at else None,
        "last_seen_at": attempt.last_seen_at.isoformat() if attempt.last_seen_at else None,
        "completed_at": attempt.completed_at.isoformat() if attempt.completed_at else None,
    }


def _coerce_dict(value: Any) -> dict[str, Any]:
    return value.copy() if isinstance(value, dict) else {}


def _coerce_list(value: Any) -> list[Any]:
    return value.copy() if isinstance(value, list) else []


def _book_uses_structured_engine(interactive_book: InteractiveBook) -> bool:
    return len(interactive_book.scenes) > 0


def _media_asset_ref(media: InteractiveBookMedia | None) -> dict[str, Any] | None:
    if not media:
        return None
    return {
        "id": media.media_key or media.id,
        "kind": media.media_type,
        "label": _coerce_dict(media.metadata_json).get("label"),
        "url": media.url,
    }


def _resolve_scene_next(scene: InteractiveBookScene) -> Any:
    transitions = sorted(scene.transitions, key=lambda item: item.order_index)
    if not transitions:
        return None
    default_transition = next(
        (
            transition
            for transition in transitions
            if transition.trigger_type in {"default_next", "continue", "end_video", "end_scene"}
        ),
        transitions[0],
    )
    return default_transition.next_scene_key


def _quiz_interaction_from_element(
    *,
    scene: InteractiveBookScene,
    element: InteractiveBookSceneElement,
    quiz: InteractiveBookQuiz,
) -> dict[str, Any]:
    config = _coerce_dict(element.config_json)
    question = config.get("prompt") if isinstance(config.get("prompt"), str) else quiz.question
    trigger = config.get("trigger") if isinstance(config.get("trigger"), str) else "on_enter"
    target_scene_id = config.get("target_scene_id") if isinstance(config.get("target_scene_id"), str) else None
    interaction_type = config.get("interaction_type")
    if not isinstance(interaction_type, str):
        interaction_type = "branching_prompt" if scene.scene_type == "branching" else "multiple_choice"

    data = _coerce_dict(config.get("data"))
    if isinstance(config.get("subtitle"), str):
        data.setdefault("subtitle", config["subtitle"])
    if isinstance(config.get("success_audio_url"), str):
        data.setdefault("success_audio_url", config["success_audio_url"])
    if isinstance(config.get("error_audio_url"), str):
        data.setdefault("error_audio_url", config["error_audio_url"])

    choices = []
    for option in sorted(quiz.options, key=lambda item: item.order_index):
        choices.append(
            {
                "id": option.option_key or option.id,
                "label": option.content,
                "target_scene_id": option.next_scene_key,
                "feedback": option.feedback,
                "feedback_audio_url": option.feedback_audio_url,
                "is_correct": option.is_correct,
                "retry": option.retry,
                "score_delta": option.score_delta,
            },
        )

    interaction = {
        "id": config.get("interaction_id") if isinstance(config.get("interaction_id"), str) else (element.element_key or quiz.quiz_key or quiz.id),
        "type": interaction_type,
        "trigger": trigger,
        "prompt": question,
        "choices": choices,
        "data": data,
    }
    if target_scene_id:
        interaction["target_scene_id"] = target_scene_id
    return interaction


def _video_interaction_to_manifest(video_interaction: InteractiveBookVideoInteraction) -> dict[str, Any]:
    config = _coerce_dict(video_interaction.config_json)
    data = _coerce_dict(config.get("data"))
    if isinstance(config.get("subtitle"), str):
        data.setdefault("subtitle", config["subtitle"])
    if isinstance(config.get("success_audio_url"), str):
        data.setdefault("success_audio_url", config["success_audio_url"])
    if isinstance(config.get("error_audio_url"), str):
        data.setdefault("error_audio_url", config["error_audio_url"])

    return {
        "id": video_interaction.interaction_key or video_interaction.id,
        "type": config.get("interaction_type") if isinstance(config.get("interaction_type"), str) else "choose_path",
        "trigger": "timecode",
        "timecode": video_interaction.timestamp,
        "prompt": video_interaction.prompt,
        "choices": [
            {
                "id": option.option_key or option.id,
                "label": option.label,
                "target_scene_id": option.next_scene_key,
                "feedback": option.feedback,
                "feedback_audio_url": option.feedback_audio_url,
                "is_correct": option.is_correct,
                "retry": option.retry,
                "score_delta": option.score_delta,
            }
            for option in sorted(video_interaction.options, key=lambda item: item.order_index)
        ],
        "data": data,
    }


def _scene_to_manifest(scene: InteractiveBookScene, ordered_scenes: list[InteractiveBookScene]) -> dict[str, Any]:
    content = _coerce_dict(scene.content_json)
    assets: list[dict[str, Any]] = []
    interactions: list[dict[str, Any]] = []
    background_asset = _media_asset_ref(scene.background_media)
    if background_asset:
        assets.append(background_asset)

    elements = sorted(scene.elements, key=lambda item: item.order_index)
    if scene.scene_type == "timeline":
        cards = []
        for element in elements:
            config = _coerce_dict(element.config_json)
            media_asset = _media_asset_ref(element.media)
            if media_asset:
                assets.append(media_asset)
            if element.element_type != "timeline_card":
                continue
            card = {
                "id": element.element_key or element.id,
                "title": config.get("title") or scene.title,
                "description": config.get("description"),
                "target_scene_id": config.get("target_scene_id"),
                "image_url": media_asset["url"] if media_asset else None,
                "order_index": config.get("order_index", element.order_index),
            }
            cards.append(card)
        if not cards:
            for timeline_scene in ordered_scenes:
                if timeline_scene.id == scene.id or timeline_scene.scene_type == "timeline":
                    continue
                summary_source = _coerce_dict(timeline_scene.content_json)
                if summary_source.get("timeline_exclude") is True:
                    continue
                card_image = timeline_scene.background_media.url if timeline_scene.background_media else None
                cards.append(
                    {
                        "id": timeline_scene.scene_key,
                        "title": timeline_scene.title,
                        "description": summary_source.get("timeline_summary") or summary_source.get("text"),
                        "target_scene_id": timeline_scene.scene_key,
                        "image_url": card_image,
                        "order_index": timeline_scene.order_index,
                    },
                )
        content["cards"] = sorted(cards, key=lambda item: item.get("order_index", 0))

    elif scene.scene_type == "slideshow":
        slides = [element.media.url for element in elements if element.element_type in {"slide", "image"} and element.media]
        if slides:
            content["images"] = slides

    elif scene.scene_type == "interactive_video":
        video_media = next((element.media for element in elements if element.element_type == "video" and element.media), None)
        if video_media:
            content.setdefault("video_url", video_media.url)
            video_asset = _media_asset_ref(video_media)
            if video_asset:
                assets.append(video_asset)
        if scene.auto_play:
            content["autoplay"] = True
        if scene.background_media:
            content.setdefault("poster_url", scene.background_media.url)
        interactions.extend(
            _video_interaction_to_manifest(video_interaction)
            for video_interaction in sorted(scene.video_interactions, key=lambda item: item.order_index)
        )

    elif scene.scene_type in {"quiz", "branching"}:
        if scene.background_media:
            content.setdefault("image_url", scene.background_media.url)
        for element in elements:
            if element.element_type == "quiz" and element.quiz:
                interactions.append(_quiz_interaction_from_element(scene=scene, element=element, quiz=element.quiz))

    elif scene.scene_type == "hotspot_audio":
        if scene.background_media:
            content.setdefault("image_url", scene.background_media.url)
        for element in elements:
            config = _coerce_dict(element.config_json)
            media_asset = _media_asset_ref(element.media)
            if media_asset:
                assets.append(media_asset)
            if element.element_type == "hotspot":
                interaction_data = _coerce_dict(config.get("data"))
                for field in ("x", "y", "left", "top", "subtitle", "audio_url", "follow_up_interaction_id", "show_after_audio"):
                    if field in config:
                        interaction_data.setdefault(field, config[field])
                interactions.append(
                    {
                        "id": config.get("interaction_id") if isinstance(config.get("interaction_id"), str) else (element.element_key or element.id),
                        "type": config.get("interaction_type") if isinstance(config.get("interaction_type"), str) else "hotspot",
                        "trigger": config.get("trigger") if isinstance(config.get("trigger"), str) else "on_click",
                        "prompt": config.get("prompt") if isinstance(config.get("prompt"), str) else scene.title,
                        "target_scene_id": config.get("target_scene_id") if isinstance(config.get("target_scene_id"), str) else None,
                        "data": interaction_data,
                    },
                )
            elif element.element_type == "quiz" and element.quiz:
                interactions.append(_quiz_interaction_from_element(scene=scene, element=element, quiz=element.quiz))

    else:
        if scene.background_media:
            content.setdefault("image_url", scene.background_media.url)

    next_scene = _resolve_scene_next(scene)
    scene_payload = {
        "id": scene.scene_key,
        "type": scene.scene_type,
        "title": scene.title,
        "assets": assets,
        "content": content,
        "interactions": interactions,
        "next": next_scene,
    }
    return scene_payload


def _build_manifest_from_structured_engine(interactive_book: InteractiveBook) -> dict[str, Any]:
    scenes = sorted(interactive_book.scenes, key=lambda item: item.order_index)
    scene_keys = {scene.scene_key for scene in scenes}
    entry_scene_id = interactive_book.entry_scene_id if interactive_book.entry_scene_id in scene_keys else None
    manifest = {
        "title": interactive_book.material.title if interactive_book.material else None,
        "entry_scene_id": entry_scene_id or (scenes[0].scene_key if scenes else ""),
        "scenes": [_scene_to_manifest(scene, scenes) for scene in scenes],
        "metadata": {
            "source": "structured_story_engine",
            "manifest_version": interactive_book.manifest_version,
        },
    }
    return InteractiveBookManifest.model_validate(manifest).model_dump(mode="json")


def _resolve_runtime_manifest(interactive_book: InteractiveBook, *, view: str) -> dict[str, Any] | None:
    if _book_uses_structured_engine(interactive_book):
        return _build_manifest_from_structured_engine(interactive_book)
    if view == "draft":
        return interactive_book.draft_manifest
    return interactive_book.published_manifest


def get_accessible_book(
    db: Session,
    *,
    material_id: str,
    current_user: User,
    view: str = "published",
) -> tuple[Material, InteractiveBook, dict[str, Any]]:
    material = material_crud.get_by_id(db, material_id)
    if not material or material.material_type != MaterialType.interactive_book:
        raise HTTPException(status_code=404, detail="Interactive book not found")

    interactive_book = interactive_book_crud.get_by_material_id(db, material_id)
    if not interactive_book:
        raise HTTPException(status_code=404, detail="Interactive book not found")

    draft_manifest = _resolve_runtime_manifest(interactive_book, view="draft")
    published_manifest = _resolve_runtime_manifest(interactive_book, view="published")

    if current_user.role == "student":
        if not material_crud.student_can_access(db, current_user.id, material_id):
            raise HTTPException(status_code=403, detail="Ban khong co quyen xem sach nay")
        if interactive_book.status != InteractiveBookStatus.published or not published_manifest:
            raise HTTPException(status_code=404, detail="Interactive book is not published")
        return material, interactive_book, published_manifest

    if not _can_teacher_access_material(material, current_user.id):
        raise HTTPException(status_code=403, detail="Ban khong co quyen xem sach nay")

    if view == "draft":
        if material.created_by != current_user.id:
            raise HTTPException(status_code=403, detail="Chi chu so huu moi duoc xem ban nhap")
        if not draft_manifest:
            raise HTTPException(status_code=404, detail="Draft manifest not found")
        return material, interactive_book, draft_manifest

    if interactive_book.status != InteractiveBookStatus.published or not published_manifest:
        raise HTTPException(status_code=404, detail="Interactive book is not published")
    return material, interactive_book, published_manifest


def create_interactive_book(db: Session, *, teacher: User, data: InteractiveBookCreateRequest) -> dict[str, Any]:
    manifest = data.manifest.model_dump(mode="json")
    material = Material(
        title=data.title,
        description=data.description,
        thumbnail_url=data.thumbnail_url,
        file_url=None,
        material_type=MaterialType.interactive_book,
        subject=data.subject,
        grade=data.grade,
        is_system=data.is_system,
        folder_id=data.folder_id,
        created_by=teacher.id,
    )
    db.add(material)
    db.flush()

    interactive_book = InteractiveBook(
        material_id=material.id,
        created_by=teacher.id,
        status=InteractiveBookStatus.draft,
        draft_manifest=manifest,
        entry_scene_id=data.manifest.entry_scene_id,
        estimated_duration=data.estimated_duration,
    )
    db.add(interactive_book)
    db.commit()
    db.refresh(material)
    db.refresh(interactive_book)
    return {
        "material": _serialize_material(material),
        "interactive_book": _serialize_book(interactive_book),
        "manifest": manifest,
        "view": "draft",
    }


def update_draft(
    db: Session,
    *,
    material_id: str,
    teacher: User,
    data: InteractiveBookDraftUpdateRequest,
) -> dict[str, Any]:
    material = material_crud.get_by_id(db, material_id)
    if not material or material.material_type != MaterialType.interactive_book:
        raise HTTPException(status_code=404, detail="Interactive book not found")
    if material.created_by != teacher.id:
        raise HTTPException(status_code=403, detail="Chi chu so huu moi duoc sua")

    interactive_book = interactive_book_crud.get_by_material_id(db, material_id)
    if not interactive_book:
        raise HTTPException(status_code=404, detail="Interactive book not found")

    update_fields = data.model_dump(exclude_unset=True, exclude={"manifest", "estimated_duration"})
    for field, value in update_fields.items():
        setattr(material, field, value)

    draft_manifest = data.manifest.model_dump(mode="json") if data.manifest else None
    entry_scene_id = data.manifest.entry_scene_id if data.manifest else None
    interactive_book = interactive_book_crud.update_draft(
        db,
        interactive_book=interactive_book,
        draft_manifest=draft_manifest,
        entry_scene_id=entry_scene_id,
        estimated_duration=data.estimated_duration,
    )
    db.refresh(material)
    return {
        "material": _serialize_material(material),
        "interactive_book": _serialize_book(interactive_book),
        "manifest": interactive_book.draft_manifest,
        "view": "draft",
    }


def publish_book(db: Session, *, material_id: str, teacher: User) -> dict[str, Any]:
    material = material_crud.get_by_id(db, material_id)
    if not material or material.material_type != MaterialType.interactive_book:
        raise HTTPException(status_code=404, detail="Interactive book not found")
    if material.created_by != teacher.id:
        raise HTTPException(status_code=403, detail="Chi chu so huu moi duoc publish")

    interactive_book = interactive_book_crud.get_by_material_id(db, material_id)
    if not interactive_book:
        raise HTTPException(status_code=400, detail="Draft manifest not found")

    if _book_uses_structured_engine(interactive_book):
        manifest = _build_manifest_from_structured_engine(interactive_book)
        interactive_book.draft_manifest = manifest
    elif interactive_book.draft_manifest:
        manifest = InteractiveBookManifest.model_validate(interactive_book.draft_manifest).model_dump(mode="json")
    else:
        raise HTTPException(status_code=400, detail="Draft manifest not found")

    interactive_book = interactive_book_crud.publish(
        db,
        interactive_book=interactive_book,
        manifest=manifest,
    )
    db.refresh(material)
    return {
        "material": _serialize_material(material),
        "interactive_book": _serialize_book(interactive_book),
        "manifest": manifest,
        "view": "published",
    }


def start_attempt(
    db: Session,
    *,
    material_id: str,
    student: User,
    class_id: str | None,
) -> dict[str, Any]:
    material = material_crud.get_by_id(db, material_id)
    if not material or material.material_type != MaterialType.interactive_book:
        raise HTTPException(status_code=404, detail="Interactive book not found")
    if not material_crud.student_can_access(db, student.id, material_id):
        raise HTTPException(status_code=403, detail="Ban khong co quyen truy cap sach nay")

    interactive_book = interactive_book_crud.get_by_material_id(db, material_id)
    if not interactive_book or interactive_book.status != InteractiveBookStatus.published:
        raise HTTPException(status_code=404, detail="Interactive book is not published")
    manifest = _resolve_runtime_manifest(interactive_book, view="published")
    if not manifest:
        raise HTTPException(status_code=400, detail="Published manifest not found")

    if class_id:
        if not class_crud.is_member(db, class_id=class_id, user_id=student.id):
            raise HTTPException(status_code=403, detail="Ban khong thuoc lop hoc nay")
        if not material.is_system:
            class_link = (
                db.query(ClassMaterial)
                .filter(ClassMaterial.class_id == class_id, ClassMaterial.material_id == material_id)
                .first()
            )
            if not class_link:
                raise HTTPException(status_code=400, detail="Sach nay khong duoc gan vao lop hoc nay")

    active_attempt = interactive_book_crud.get_active_attempt_for_student(
        db,
        interactive_book_id=interactive_book.id,
        student_id=student.id,
    )
    if active_attempt:
        return {
            "material": _serialize_material(material),
            "interactive_book": _serialize_book(interactive_book),
            "attempt": _serialize_attempt(active_attempt),
            "manifest": active_attempt.manifest_snapshot or manifest,
            "resume": True,
        }

    latest_attempt = interactive_book_crud.get_latest_attempt_for_student(
        db,
        interactive_book_id=interactive_book.id,
        student_id=student.id,
    )
    if latest_attempt and latest_attempt.status == InteractiveBookAttemptStatus.completed:
        return {
            "material": _serialize_material(material),
            "interactive_book": _serialize_book(interactive_book),
            "attempt": _serialize_attempt(latest_attempt),
            "manifest": latest_attempt.manifest_snapshot or manifest,
            "resume": False,
        }

    manifest = InteractiveBookManifest.model_validate(manifest).model_dump(mode="json")
    state_snapshot = _default_state_snapshot(interactive_book.entry_scene_id or manifest["entry_scene_id"])
    attempt = interactive_book_crud.create_attempt(
        db,
        interactive_book_id=interactive_book.id,
        student_id=student.id,
        class_id=class_id,
        manifest_version=interactive_book.manifest_version,
        manifest_snapshot=manifest,
        current_scene_id=interactive_book.entry_scene_id or manifest["entry_scene_id"],
        state_snapshot=state_snapshot,
        score_summary=state_snapshot["derived_score"],
    )
    return {
        "material": _serialize_material(material),
        "interactive_book": _serialize_book(interactive_book),
        "attempt": _serialize_attempt(attempt),
        "manifest": manifest,
        "resume": False,
    }


def save_checkpoint(
    db: Session,
    *,
    attempt_id: str,
    student: User,
    data: InteractiveBookCheckpointRequest,
) -> dict[str, Any]:
    attempt = interactive_book_crud.get_attempt(db, attempt_id)
    if not attempt:
        raise HTTPException(status_code=404, detail="Attempt not found")
    if attempt.student_id != student.id:
        raise HTTPException(status_code=403, detail="Forbidden")
    if attempt.status != InteractiveBookAttemptStatus.in_progress:
        raise HTTPException(status_code=400, detail="Attempt is not in progress")

    attempt = interactive_book_crud.save_checkpoint(
        db,
        attempt=attempt,
        current_scene_id=data.current_scene_id,
        state_snapshot=data.state_snapshot,
        completion_percent=data.completion_percent,
        score_summary=data.score_summary,
    )
    return _serialize_attempt(attempt)


def complete_attempt(
    db: Session,
    *,
    attempt_id: str,
    student: User,
    data: InteractiveBookCompleteRequest,
) -> dict[str, Any]:
    attempt = interactive_book_crud.get_attempt(db, attempt_id)
    if not attempt:
        raise HTTPException(status_code=404, detail="Attempt not found")
    if attempt.student_id != student.id:
        raise HTTPException(status_code=403, detail="Forbidden")

    attempt = interactive_book_crud.complete_attempt(
        db,
        attempt=attempt,
        current_scene_id=data.current_scene_id,
        state_snapshot=data.state_snapshot,
        completion_percent=data.completion_percent,
        score_summary=data.score_summary,
    )
    return _serialize_attempt(attempt)
