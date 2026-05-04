from __future__ import annotations

from copy import deepcopy
from sqlalchemy.orm import Session

from app.models.game_module import GameModule, GameModuleTriggerMapping
from app.utils.enums import DifficultyBand, GameModuleStatus, QuestionType


GOLD_MINER_MODULE_ID = "gold-miner"
GOLD_MINER_MANIFEST_URL = "/game-modules/gold-miner/manifest.json"
GOLD_MINER_ENTRY_URL = "/game-modules/gold-miner/index.html"
GOLD_MINER_THUMBNAIL_URL = "/game-modules/gold-miner/images/background.png"
MEMORY_CARD_MODULE_ID = "memory-card"
MEMORY_CARD_MANIFEST_URL = "/game-modules/memory-card/manifest.json"
MEMORY_CARD_ENTRY_URL = "/game-modules/memory-card/index.html"
MEMORY_CARD_THUMBNAIL_URL = "/game-modules/memory-card/thumbnail.svg"

GOLD_MINER_TRIGGER_MAPPINGS = (
    {
        "trigger_type": "item_captured",
        "trigger_key": "item_type",
        "trigger_value": "rock",
        "difficulty_band": DifficultyBand.recognition,
        "selector_strategy": "ordered_no_repeat",
    },
    {
        "trigger_type": "item_captured",
        "trigger_key": "item_type",
        "trigger_value": "small_gold",
        "difficulty_band": DifficultyBand.comprehension,
        "selector_strategy": "ordered_no_repeat",
    },
    {
        "trigger_type": "item_captured",
        "trigger_key": "item_type",
        "trigger_value": "big_gold",
        "difficulty_band": DifficultyBand.application_basic,
        "selector_strategy": "ordered_no_repeat",
    },
    {
        "trigger_type": "item_captured",
        "trigger_key": "item_type",
        "trigger_value": "diamond",
        "difficulty_band": DifficultyBand.application_advanced,
        "selector_strategy": "ordered_no_repeat",
    },
)

MEMORY_CARD_TRIGGER_MAPPINGS = (
    {
        "trigger_type": "pair_matched",
        "trigger_key": "difficulty_band",
        "trigger_value": "recognition",
        "difficulty_band": DifficultyBand.recognition,
        "selector_strategy": "ordered_no_repeat",
    },
    {
        "trigger_type": "pair_matched",
        "trigger_key": "difficulty_band",
        "trigger_value": "comprehension",
        "difficulty_band": DifficultyBand.comprehension,
        "selector_strategy": "ordered_no_repeat",
    },
    {
        "trigger_type": "pair_matched",
        "trigger_key": "difficulty_band",
        "trigger_value": "application_basic",
        "difficulty_band": DifficultyBand.application_basic,
        "selector_strategy": "ordered_no_repeat",
    },
    {
        "trigger_type": "pair_matched",
        "trigger_key": "difficulty_band",
        "trigger_value": "application_advanced",
        "difficulty_band": DifficultyBand.application_advanced,
        "selector_strategy": "ordered_no_repeat",
    },
)

GOLD_MINER_ITEM_DISTRIBUTION = {
    "rock": 6,
    "small_gold": 4,
    "big_gold": 2,
    "diamond": 3,
}

GOLD_MINER_CAPABILITY_CONFIG = {
    "entry": GOLD_MINER_ENTRY_URL,
    "thumbnail_url": GOLD_MINER_THUMBNAIL_URL,
    "bridge": {
        "enabled": True,
        "version": 1,
        "capabilities": [
            "ready",
            "state",
            "progress",
            "complete",
            "pause",
            "resume",
            "restart",
            "question_trigger",
        ],
    },
    "runtime": {
        "kind": "iframe",
        "sandbox": "allow-scripts",
        "allow": "fullscreen",
        "aspect_ratio": "16 / 9",
    },
    "session": {
        "default_levels": 1,
        "item_count_per_level": sum(GOLD_MINER_ITEM_DISTRIBUTION.values()),
        "default_time_limit_seconds": 60,
        "target_score_base": 1000,
        "target_score_step": 180,
        "ends_when_board_cleared": True,
    },
    "question_distribution": {
        "mode": "progressive",
        "questions_per_level_cap": 4,
        "allow_non_question_items": True,
        "trigger_strategy": "adaptive_capture_quota",
    },
    "supports_blocking_modal": True,
    "supports_timer_pause": True,
    "supported_question_types": [
        QuestionType.single_choice,
        QuestionType.multi_choice,
        QuestionType.text,
        QuestionType.matching,
    ],
}

MEMORY_CARD_CAPABILITY_CONFIG = {
    "entry": MEMORY_CARD_ENTRY_URL,
    "thumbnail_url": MEMORY_CARD_THUMBNAIL_URL,
    "bridge": {
        "enabled": True,
        "version": 1,
        "capabilities": [
            "ready",
            "state",
            "progress",
            "complete",
            "pause",
            "resume",
            "restart",
            "question_trigger",
        ],
    },
    "runtime": {
        "kind": "iframe",
        "sandbox": "allow-scripts",
        "allow": "fullscreen",
        "aspect_ratio": "16 / 9",
    },
    "session": {
        "max_levels": 4,
        "default_time_limit_seconds": 300,
        "max_moves": 30,
    },
    "question_distribution": {
        "mode": "ordered_no_repeat",
        "trigger_strategy": "pair_matched_by_difficulty",
    },
    "memory_card": {
        "board_pair_count": 8,
        "flip_back_delay_ms": 850,
    },
    "supports_blocking_modal": True,
    "supports_timer_pause": True,
    "supported_question_types": [
        QuestionType.single_choice,
        QuestionType.multi_choice,
        QuestionType.text,
        QuestionType.matching,
    ],
}

DEFAULT_GAME_MODULE_DEFINITIONS = (
    {
        "id": GOLD_MINER_MODULE_ID,
        "slug": GOLD_MINER_MODULE_ID,
        "title": "Gold Miner",
        "description": "Arcade gold miner module with blocking-question runtime integration.",
        "runtime_kind": "iframe",
        "manifest_url": GOLD_MINER_MANIFEST_URL,
        "capability_config": GOLD_MINER_CAPABILITY_CONFIG,
        "trigger_mappings": GOLD_MINER_TRIGGER_MAPPINGS,
    },
    {
        "id": MEMORY_CARD_MODULE_ID,
        "slug": MEMORY_CARD_MODULE_ID,
        "title": "Memory Card",
        "description": "Memory matching module with question checkpoints and runtime bridge integration.",
        "runtime_kind": "iframe",
        "manifest_url": MEMORY_CARD_MANIFEST_URL,
        "capability_config": MEMORY_CARD_CAPABILITY_CONFIG,
        "trigger_mappings": MEMORY_CARD_TRIGGER_MAPPINGS,
    },
)


def _merge_capability_config(*, defaults: dict, existing: dict | None) -> dict:
    if not existing:
        return deepcopy(defaults)

    merged = deepcopy(defaults)
    merged.update(existing)

    for key in ("bridge", "runtime", "session", "question_distribution", "memory_card"):
        default_branch = defaults.get(key)
        if not isinstance(default_branch, dict):
            continue
        existing_branch = existing.get(key) if isinstance(existing.get(key), dict) else {}
        branch = dict(default_branch)
        branch.update(existing_branch)
        merged[key] = branch

    return merged


def _ensure_module(
    db: Session,
    *,
    definition: dict,
) -> GameModule:
    module = db.query(GameModule).filter(GameModule.slug == definition["slug"]).first()
    if not module:
        module = GameModule(
            id=definition["id"],
            slug=definition["slug"],
            title=definition["title"],
            description=definition["description"],
            runtime_kind=definition["runtime_kind"],
            manifest_url=definition["manifest_url"],
            status=GameModuleStatus.active,
            capability_config=deepcopy(definition["capability_config"]),
        )
        db.add(module)
        db.flush()
    else:
        changed = False
        if not module.title:
            module.title = definition["title"]
            changed = True
        if not module.description:
            module.description = definition["description"]
            changed = True
        if not module.manifest_url:
            module.manifest_url = definition["manifest_url"]
            changed = True
        if not module.runtime_kind:
            module.runtime_kind = definition["runtime_kind"]
            changed = True
        if module.status != GameModuleStatus.active:
            module.status = GameModuleStatus.active
            changed = True
        merged_capability_config = _merge_capability_config(
            defaults=definition["capability_config"],
            existing=module.capability_config,
        )
        if merged_capability_config != (module.capability_config or {}):
            module.capability_config = merged_capability_config
            changed = True
        if changed:
            db.flush()

    existing_mappings = {
        (mapping.trigger_type, mapping.trigger_key, mapping.trigger_value): mapping
        for mapping in db.query(GameModuleTriggerMapping)
        .filter(GameModuleTriggerMapping.game_module_id == module.id)
        .all()
    }

    for mapping_definition in definition["trigger_mappings"]:
        key = (
            mapping_definition["trigger_type"],
            mapping_definition["trigger_key"],
            mapping_definition["trigger_value"],
        )
        mapping = existing_mappings.get(key)
        if not mapping:
            db.add(
                GameModuleTriggerMapping(
                    game_module_id=module.id,
                    trigger_type=mapping_definition["trigger_type"],
                    trigger_key=mapping_definition["trigger_key"],
                    trigger_value=mapping_definition["trigger_value"],
                    difficulty_band=mapping_definition["difficulty_band"],
                    selector_strategy=mapping_definition["selector_strategy"],
                    is_active=True,
                )
            )
            continue
        mapping.difficulty_band = mapping_definition["difficulty_band"]
        mapping.selector_strategy = mapping_definition["selector_strategy"]
        mapping.is_active = True

    return module


def ensure_default_game_modules(db: Session) -> GameModule:
    modules_by_slug: dict[str, GameModule] = {}
    for definition in DEFAULT_GAME_MODULE_DEFINITIONS:
        module = _ensure_module(db, definition=definition)
        modules_by_slug[module.slug] = module

    db.commit()
    prioritized_module = modules_by_slug.get(GOLD_MINER_MODULE_ID) or next(iter(modules_by_slug.values()))
    db.refresh(prioritized_module)
    return prioritized_module
