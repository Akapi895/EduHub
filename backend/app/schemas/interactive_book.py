from __future__ import annotations

from datetime import datetime
from typing import Any

from pydantic import BaseModel, Field, model_validator

from app.utils.enums import (
    InteractiveBookAttemptStatus,
    InteractiveBookSceneType,
    InteractiveBookStatus,
    InteractiveBookTrigger,
)


def _is_allowed_asset_url(url: str) -> bool:
    return url.startswith(("http://", "https://", "/"))


def _extract_transition_refs(value: Any) -> set[str]:
    refs: set[str] = set()
    if isinstance(value, str):
        refs.add(value)
    elif isinstance(value, list):
        for item in value:
            refs.update(_extract_transition_refs(item))
    elif isinstance(value, dict):
        for item in value.values():
            refs.update(_extract_transition_refs(item))
    return refs


class InteractiveAssetRef(BaseModel):
    id: str | None = None
    kind: str | None = None
    label: str | None = None
    url: str

    @model_validator(mode="after")
    def validate_url(self):
        if self.url.startswith("data:"):
            raise ValueError("Asset URLs must not use inline base64 data.")
        if not _is_allowed_asset_url(self.url):
            raise ValueError("Asset URLs must use http(s) or absolute app paths.")
        return self


class InteractiveChoice(BaseModel):
    id: str
    label: str
    target_scene_id: str | None = None
    feedback: str | None = None
    feedback_image_url: str | None = None
    feedback_audio_url: str | None = None
    is_correct: bool | None = None
    retry: bool = False
    score_delta: float | None = None


class InteractiveInteraction(BaseModel):
    id: str | None = None
    type: str
    trigger: InteractiveBookTrigger = InteractiveBookTrigger.on_click
    timecode: float | None = None
    prompt: str | None = None
    target_scene_id: str | None = None
    choices: list[InteractiveChoice] = Field(default_factory=list)
    data: dict[str, Any] = Field(default_factory=dict)

    @model_validator(mode="after")
    def validate_trigger(self):
        if self.trigger == InteractiveBookTrigger.timecode:
            if self.timecode is None:
                raise ValueError("Timeline interactions require a timecode.")
            if self.timecode < 0:
                raise ValueError("Timeline interactions cannot use a negative timecode.")
        elif self.timecode is not None and self.timecode < 0:
            raise ValueError("Interaction timecode cannot be negative.")
        return self


class InteractiveScene(BaseModel):
    id: str
    type: InteractiveBookSceneType
    title: str | None = None
    assets: list[InteractiveAssetRef] = Field(default_factory=list)
    content: dict[str, Any] | list[Any] | str | None = None
    interactions: list[InteractiveInteraction] = Field(default_factory=list)
    next: Any = None

    @model_validator(mode="after")
    def validate_scene(self):
        seen_ids: set[str] = set()
        seen_timecodes: set[float] = set()
        for interaction in self.interactions:
            if interaction.id:
                if interaction.id in seen_ids:
                    raise ValueError(f"Duplicate interaction id '{interaction.id}' in scene '{self.id}'.")
                seen_ids.add(interaction.id)
            if interaction.trigger == InteractiveBookTrigger.timecode and interaction.timecode is not None:
                if interaction.timecode in seen_timecodes:
                    raise ValueError(
                        f"Duplicate timeline trigger {interaction.timecode} in scene '{self.id}'.",
                    )
                seen_timecodes.add(interaction.timecode)
        return self


class InteractiveBookManifest(BaseModel):
    title: str | None = None
    entry_scene_id: str
    scenes: list[InteractiveScene]
    metadata: dict[str, Any] = Field(default_factory=dict)

    @model_validator(mode="after")
    def validate_manifest(self):
        if not self.scenes:
            raise ValueError("Manifest must include at least one scene.")

        scene_ids = [scene.id for scene in self.scenes]
        if len(scene_ids) != len(set(scene_ids)):
            raise ValueError("Scene ids must be unique.")

        scene_id_set = set(scene_ids)
        if self.entry_scene_id not in scene_id_set:
            raise ValueError("entry_scene_id must reference an existing scene.")

        for scene in self.scenes:
            refs = _extract_transition_refs(scene.next)
            for interaction in scene.interactions:
                if interaction.target_scene_id:
                    refs.add(interaction.target_scene_id)
                for choice in interaction.choices:
                    if choice.target_scene_id:
                        refs.add(choice.target_scene_id)
            unknown_refs = refs - scene_id_set
            if unknown_refs:
                unknown = ", ".join(sorted(unknown_refs))
                raise ValueError(f"Scene '{scene.id}' references unknown scene ids: {unknown}.")
        return self


class InteractiveBookCreateRequest(BaseModel):
    title: str
    description: str | None = None
    thumbnail_url: str | None = None
    subject: str | None = None
    grade: str | None = None
    is_system: bool = False
    folder_id: str | None = None
    estimated_duration: int | None = None
    manifest: InteractiveBookManifest


class InteractiveBookDraftUpdateRequest(BaseModel):
    title: str | None = None
    description: str | None = None
    thumbnail_url: str | None = None
    subject: str | None = None
    grade: str | None = None
    is_system: bool | None = None
    folder_id: str | None = None
    estimated_duration: int | None = None
    manifest: InteractiveBookManifest | None = None


class InteractiveBookSummaryOut(BaseModel):
    material_id: str
    status: InteractiveBookStatus
    manifest_version: int
    entry_scene_id: str | None = None
    estimated_duration: int | None = None
    published_at: datetime | None = None
    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}


class InteractiveBookAttemptOut(BaseModel):
    id: str
    interactive_book_id: str
    student_id: str
    class_id: str | None = None
    manifest_version: int
    status: InteractiveBookAttemptStatus
    current_scene_id: str | None = None
    state_snapshot: dict[str, Any] | None = None
    completion_percent: float
    score_summary: dict[str, Any] | None = None
    started_at: datetime
    last_seen_at: datetime
    completed_at: datetime | None = None

    model_config = {"from_attributes": True}


class InteractiveBookStartRequest(BaseModel):
    class_id: str | None = None


class InteractiveBookCheckpointRequest(BaseModel):
    current_scene_id: str
    state_snapshot: dict[str, Any]
    completion_percent: float = Field(ge=0, le=100)
    score_summary: dict[str, Any] | None = None


class InteractiveBookEventItem(BaseModel):
    scene_id: str | None = None
    event_type: str
    payload: dict[str, Any] | None = None


class InteractiveBookEventsBatchRequest(BaseModel):
    events: list[InteractiveBookEventItem]


class InteractiveBookCompleteRequest(BaseModel):
    current_scene_id: str | None = None
    state_snapshot: dict[str, Any]
    completion_percent: float = Field(ge=0, le=100)
    score_summary: dict[str, Any] | None = None
