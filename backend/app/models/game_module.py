from __future__ import annotations

import uuid
from datetime import datetime
from typing import TYPE_CHECKING, Any

from sqlalchemy import Boolean, DateTime, ForeignKey, JSON, String, Text, func
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base
from app.utils.enums import GameModuleStatus

if TYPE_CHECKING:
    from app.models.content_package import GamePackageConfig
    from app.models.package_attempt import PackageAttempt


class GameModule(Base):
    __tablename__ = "game_modules"

    id: Mapped[str] = mapped_column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    slug: Mapped[str] = mapped_column(String, nullable=False, unique=True)
    title: Mapped[str] = mapped_column(Text, nullable=False)
    description: Mapped[str | None] = mapped_column(Text, nullable=True)
    runtime_kind: Mapped[str] = mapped_column(String, default="iframe", nullable=False)
    manifest_url: Mapped[str] = mapped_column(Text, nullable=False)
    status: Mapped[str] = mapped_column(String, default=GameModuleStatus.draft, nullable=False)
    capability_config: Mapped[dict[str, Any] | None] = mapped_column(JSON, nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, server_default=func.now())
    updated_at: Mapped[datetime] = mapped_column(DateTime, server_default=func.now(), onupdate=func.now())

    package_configs: Mapped[list["GamePackageConfig"]] = relationship("GamePackageConfig", back_populates="game_module")
    trigger_mappings: Mapped[list["GameModuleTriggerMapping"]] = relationship(
        "GameModuleTriggerMapping", back_populates="game_module", cascade="all, delete-orphan"
    )


class GameModuleTriggerMapping(Base):
    __tablename__ = "game_module_trigger_mappings"

    id: Mapped[str] = mapped_column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    game_module_id: Mapped[str] = mapped_column(String, ForeignKey("game_modules.id", ondelete="CASCADE"), nullable=False)
    trigger_type: Mapped[str] = mapped_column(String, nullable=False)
    trigger_key: Mapped[str] = mapped_column(String, nullable=False)
    trigger_value: Mapped[str] = mapped_column(String, nullable=False)
    difficulty_band: Mapped[str] = mapped_column(String, nullable=False)
    selector_strategy: Mapped[str] = mapped_column(String, default="random_no_repeat", nullable=False)
    is_active: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)
    created_at: Mapped[datetime] = mapped_column(DateTime, server_default=func.now())

    game_module: Mapped["GameModule"] = relationship("GameModule", back_populates="trigger_mappings")


class GameRuntimeEvent(Base):
    __tablename__ = "game_runtime_events"

    id: Mapped[str] = mapped_column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    package_attempt_id: Mapped[str] = mapped_column(
        String, ForeignKey("package_attempts.id", ondelete="CASCADE"), nullable=False
    )
    event_type: Mapped[str] = mapped_column(String, nullable=False)
    event_payload: Mapped[dict[str, Any] | None] = mapped_column(JSON, nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, server_default=func.now())

    package_attempt: Mapped["PackageAttempt"] = relationship("PackageAttempt", back_populates="runtime_events")
