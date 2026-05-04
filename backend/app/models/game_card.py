from __future__ import annotations

import uuid
from datetime import datetime
from typing import TYPE_CHECKING

from sqlalchemy import Boolean, DateTime, ForeignKey, Integer, String, Text, func
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base

if TYPE_CHECKING:
    from app.models.content_package import ContentPackage


class GameCardPair(Base):
    """A matched pair of cards for pair-matching game modules (e.g. Memory Card).

    Each pair contains a "left" card (prompt/question side) and a "right" card
    (answer side). Both sides have an optional image URL and optional text label,
    allowing purely visual pairs, text-only pairs, or mixed pairs.

    This model is intentionally decoupled from the question_bank system and can be
    reused by any future game module that uses a pair-matching mechanic.
    """

    __tablename__ = "game_card_pairs"

    id: Mapped[str] = mapped_column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    package_id: Mapped[str] = mapped_column(
        String, ForeignKey("content_packages.id", ondelete="CASCADE"), nullable=False, index=True
    )

    # Left card — the "question/prompt" side
    left_label: Mapped[str | None] = mapped_column(Text, nullable=True)
    left_image_url: Mapped[str | None] = mapped_column(Text, nullable=True)

    # Right card — the "answer" side
    right_label: Mapped[str | None] = mapped_column(Text, nullable=True)
    right_image_url: Mapped[str | None] = mapped_column(Text, nullable=True)

    order_index: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    is_active: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)

    created_at: Mapped[datetime] = mapped_column(DateTime, server_default=func.now())
    updated_at: Mapped[datetime] = mapped_column(DateTime, server_default=func.now(), onupdate=func.now())

    package: Mapped["ContentPackage"] = relationship("ContentPackage", back_populates="card_pairs")
