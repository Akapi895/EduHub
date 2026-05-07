"""CRUD operations for GameCardPair (pair-matching game content)."""
from __future__ import annotations

from sqlalchemy.orm import Session

from app.models.game_card import GameCardPair
from app.schemas.game import GameCardPairCreate, GameCardPairUpdate
from app.utils.datetime_utils import now_local_naive


# ── Serialisation ─────────────────────────────────────────────────────────────

def serialize_card_pair(pair: GameCardPair) -> dict:
    return {
        "id": pair.id,
        "package_id": pair.package_id,
        "left_label": pair.left_label,
        "left_image_url": pair.left_image_url,
        "right_label": pair.right_label,
        "right_image_url": pair.right_image_url,
        "order_index": pair.order_index,
        "match_mode": pair.match_mode,
        "is_active": pair.is_active,
        "created_at": pair.created_at,
        "updated_at": pair.updated_at,
    }


# ── Queries ───────────────────────────────────────────────────────────────────

def get_card_pairs(db: Session, package_id: str) -> list[GameCardPair]:
    """Return all active card pairs for a package, ordered by order_index."""
    return (
        db.query(GameCardPair)
        .filter(GameCardPair.package_id == package_id, GameCardPair.is_active.is_(True))
        .order_by(GameCardPair.order_index.asc(), GameCardPair.created_at.asc())
        .all()
    )


def get_card_pair(db: Session, pair_id: str) -> GameCardPair | None:
    return db.query(GameCardPair).filter(GameCardPair.id == pair_id).first()


# ── Mutations ─────────────────────────────────────────────────────────────────

def create_card_pair(db: Session, *, package_id: str, data: GameCardPairCreate) -> GameCardPair:
    # Enforce max 15 pairs per package
    existing = db.query(GameCardPair).filter(
        GameCardPair.package_id == package_id,
        GameCardPair.is_active.is_(True),
    ).count()
    if existing >= 15:
        raise ValueError("Tối đa 15 cặp thẻ được phép cho mỗi game.")

    pair = GameCardPair(
        package_id=package_id,
        left_label=data.left_label,
        left_image_url=data.left_image_url,
        right_label=data.right_label,
        right_image_url=data.right_image_url,
        order_index=data.order_index,
        match_mode=data.match_mode,
    )
    db.add(pair)
    db.commit()
    db.refresh(pair)
    return pair


def update_card_pair(db: Session, *, pair: GameCardPair, data: GameCardPairUpdate) -> GameCardPair:
    update_fields = data.model_dump(exclude_unset=True)
    for field, value in update_fields.items():
        setattr(pair, field, value)
    pair.updated_at = now_local_naive()
    db.commit()
    db.refresh(pair)
    return pair


def delete_card_pair(db: Session, *, pair: GameCardPair) -> None:
    pair.is_active = False
    pair.updated_at = now_local_naive()
    db.commit()


def reorder_card_pairs(db: Session, *, package_id: str, ordered_ids: list[str]) -> list[GameCardPair]:
    """Apply a new order_index sequence from a list of pair IDs."""
    pairs_by_id = {
        pair.id: pair
        for pair in db.query(GameCardPair).filter(
            GameCardPair.package_id == package_id,
            GameCardPair.id.in_(ordered_ids),
        ).all()
    }
    for index, pair_id in enumerate(ordered_ids):
        pair = pairs_by_id.get(pair_id)
        if pair:
            pair.order_index = index
    db.commit()
    return get_card_pairs(db, package_id)
