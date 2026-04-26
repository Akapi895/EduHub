from __future__ import annotations

from sqlalchemy.orm import Session

from app.models.game_module import GameModule, GameModuleTriggerMapping
from app.utils.enums import DifficultyBand, GameModuleStatus, QuestionType


GOLD_MINER_MODULE_ID = "gold-miner"
GOLD_MINER_MANIFEST_URL = "/game-modules/gold-miner/manifest.json"
GOLD_MINER_ENTRY_URL = "/game-modules/gold-miner/index.html"
GOLD_MINER_THUMBNAIL_URL = "/game-modules/gold-miner/images/background.png"

GOLD_MINER_TRIGGER_MAPPINGS = (
    ("rock", DifficultyBand.recognition),
    ("small_gold", DifficultyBand.comprehension),
    ("big_gold", DifficultyBand.application_basic),
    ("diamond", DifficultyBand.application_advanced),
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


def _merge_capability_config(existing: dict | None) -> dict:
    if not existing:
        return dict(GOLD_MINER_CAPABILITY_CONFIG)

    merged = dict(GOLD_MINER_CAPABILITY_CONFIG)
    merged.update(existing)

    existing_bridge = existing.get("bridge") if isinstance(existing.get("bridge"), dict) else {}
    bridge = dict(GOLD_MINER_CAPABILITY_CONFIG["bridge"])
    bridge.update(existing_bridge)
    merged["bridge"] = bridge

    existing_runtime = existing.get("runtime") if isinstance(existing.get("runtime"), dict) else {}
    runtime = dict(GOLD_MINER_CAPABILITY_CONFIG["runtime"])
    runtime.update(existing_runtime)
    merged["runtime"] = runtime

    existing_session = existing.get("session") if isinstance(existing.get("session"), dict) else {}
    session = dict(GOLD_MINER_CAPABILITY_CONFIG["session"])
    session.update(existing_session)
    merged["session"] = session

    existing_distribution = (
        existing.get("question_distribution") if isinstance(existing.get("question_distribution"), dict) else {}
    )
    question_distribution = dict(GOLD_MINER_CAPABILITY_CONFIG["question_distribution"])
    question_distribution.update(existing_distribution)
    merged["question_distribution"] = question_distribution
    return merged


def ensure_default_game_modules(db: Session) -> GameModule:
    module = db.query(GameModule).filter(GameModule.slug == GOLD_MINER_MODULE_ID).first()
    if not module:
        module = GameModule(
            id=GOLD_MINER_MODULE_ID,
            slug=GOLD_MINER_MODULE_ID,
            title="Gold Miner",
            description="Arcade gold miner module with blocking-question runtime integration.",
            runtime_kind="iframe",
            manifest_url=GOLD_MINER_MANIFEST_URL,
            status=GameModuleStatus.active,
            capability_config=dict(GOLD_MINER_CAPABILITY_CONFIG),
        )
        db.add(module)
        db.flush()
    else:
        changed = False
        if not module.manifest_url:
            module.manifest_url = GOLD_MINER_MANIFEST_URL
            changed = True
        if not module.runtime_kind:
            module.runtime_kind = "iframe"
            changed = True
        if module.status != GameModuleStatus.active:
            module.status = GameModuleStatus.active
            changed = True
        merged_capability_config = _merge_capability_config(module.capability_config)
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

    for trigger_value, difficulty_band in GOLD_MINER_TRIGGER_MAPPINGS:
        key = ("item_captured", "item_type", trigger_value)
        mapping = existing_mappings.get(key)
        if not mapping:
            db.add(
                GameModuleTriggerMapping(
                    game_module_id=module.id,
                    trigger_type="item_captured",
                    trigger_key="item_type",
                    trigger_value=trigger_value,
                    difficulty_band=difficulty_band,
                    selector_strategy="ordered_no_repeat",
                    is_active=True,
                )
            )
            continue
        mapping.difficulty_band = difficulty_band
        mapping.selector_strategy = "ordered_no_repeat"
        mapping.is_active = True

    db.commit()
    db.refresh(module)
    return module
