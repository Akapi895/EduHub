"""add game hub publications

Revision ID: d1a9c3f6b7e4
Revises: 8f3e9d1c4b2a
Create Date: 2026-04-27 00:00:00.000000

"""

from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


revision: str = "d1a9c3f6b7e4"
down_revision: Union[str, None] = "8f3e9d1c4b2a"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        "content_package_publications",
        sa.Column("id", sa.String(), nullable=False),
        sa.Column("package_id", sa.String(), nullable=False),
        sa.Column("channel", sa.String(), nullable=False),
        sa.Column("visibility", sa.String(), nullable=False),
        sa.Column("status", sa.String(), nullable=False),
        sa.Column("published_by", sa.String(), nullable=True),
        sa.Column("published_at", sa.DateTime(), nullable=True),
        sa.Column("start_at", sa.DateTime(), nullable=True),
        sa.Column("end_at", sa.DateTime(), nullable=True),
        sa.Column("featured", sa.Boolean(), nullable=False),
        sa.Column("sort_order", sa.Integer(), nullable=False),
        sa.Column("metadata_json", sa.JSON(), nullable=True),
        sa.Column("created_at", sa.DateTime(), server_default=sa.text("CURRENT_TIMESTAMP"), nullable=False),
        sa.Column("updated_at", sa.DateTime(), server_default=sa.text("CURRENT_TIMESTAMP"), nullable=False),
        sa.ForeignKeyConstraint(["package_id"], ["content_packages.id"], ondelete="CASCADE"),
        sa.ForeignKeyConstraint(["published_by"], ["users.id"]),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("package_id", "channel", name="uq_content_package_publication_channel"),
    )
    op.create_index(
        "ix_content_package_publications_channel_status",
        "content_package_publications",
        ["channel", "status", "visibility"],
    )

    op.create_table(
        "content_package_access_rules",
        sa.Column("id", sa.String(), nullable=False),
        sa.Column("package_id", sa.String(), nullable=False),
        sa.Column("permission", sa.String(), nullable=False),
        sa.Column("audience_type", sa.String(), nullable=False),
        sa.Column("audience_id", sa.String(), nullable=True),
        sa.Column("effect", sa.String(), nullable=False),
        sa.Column("is_active", sa.Boolean(), nullable=False),
        sa.Column("start_at", sa.DateTime(), nullable=True),
        sa.Column("end_at", sa.DateTime(), nullable=True),
        sa.Column("created_by", sa.String(), nullable=False),
        sa.Column("created_at", sa.DateTime(), server_default=sa.text("CURRENT_TIMESTAMP"), nullable=False),
        sa.Column("updated_at", sa.DateTime(), server_default=sa.text("CURRENT_TIMESTAMP"), nullable=False),
        sa.ForeignKeyConstraint(["created_by"], ["users.id"]),
        sa.ForeignKeyConstraint(["package_id"], ["content_packages.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index(
        "ix_content_package_access_rules_lookup",
        "content_package_access_rules",
        ["package_id", "permission", "audience_type", "audience_id", "is_active"],
    )

    op.add_column(
        "package_attempts",
        sa.Column("play_context", sa.String(), server_default="class_assignment", nullable=False),
    )
    op.add_column(
        "package_attempts",
        sa.Column("access_rule_id", sa.String(), nullable=True),
    )
    op.add_column(
        "package_attempts",
        sa.Column("duration_ms", sa.Integer(), nullable=True),
    )
    op.add_column(
        "package_attempts",
        sa.Column("leaderboard_eligible", sa.Boolean(), server_default=sa.text("true"), nullable=False),
    )
    op.create_foreign_key(
        "fk_package_attempts_access_rule_id",
        "package_attempts",
        "content_package_access_rules",
        ["access_rule_id"],
        ["id"],
        ondelete="SET NULL",
    )

    op.create_table(
        "game_leaderboard_entries",
        sa.Column("id", sa.String(), nullable=False),
        sa.Column("package_id", sa.String(), nullable=False),
        sa.Column("user_id", sa.String(), nullable=False),
        sa.Column("scope_type", sa.String(), nullable=False),
        sa.Column("scope_id", sa.String(), nullable=False),
        sa.Column("best_attempt_id", sa.String(), nullable=True),
        sa.Column("last_attempt_id", sa.String(), nullable=True),
        sa.Column("best_score_total", sa.Float(), nullable=True),
        sa.Column("best_score_context", sa.Float(), nullable=True),
        sa.Column("best_score_question", sa.Float(), nullable=True),
        sa.Column("best_duration_ms", sa.Integer(), nullable=True),
        sa.Column("attempts_count", sa.Integer(), nullable=False),
        sa.Column("last_played_at", sa.DateTime(), nullable=True),
        sa.Column("created_at", sa.DateTime(), server_default=sa.text("CURRENT_TIMESTAMP"), nullable=False),
        sa.Column("updated_at", sa.DateTime(), server_default=sa.text("CURRENT_TIMESTAMP"), nullable=False),
        sa.ForeignKeyConstraint(["best_attempt_id"], ["package_attempts.id"], ondelete="SET NULL"),
        sa.ForeignKeyConstraint(["last_attempt_id"], ["package_attempts.id"], ondelete="SET NULL"),
        sa.ForeignKeyConstraint(["package_id"], ["content_packages.id"], ondelete="CASCADE"),
        sa.ForeignKeyConstraint(["user_id"], ["users.id"]),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("package_id", "user_id", "scope_type", "scope_id", name="uq_game_leaderboard_package_user_scope"),
    )
    op.create_index(
        "ix_game_leaderboard_package_scope",
        "game_leaderboard_entries",
        ["package_id", "scope_type", "scope_id"],
    )
    op.create_index(
        "ix_game_leaderboard_rank_lookup",
        "game_leaderboard_entries",
        ["package_id", "scope_type", "scope_id", "best_score_total", "best_duration_ms"],
    )


def downgrade() -> None:
    op.drop_index("ix_game_leaderboard_rank_lookup", table_name="game_leaderboard_entries")
    op.drop_index("ix_game_leaderboard_package_scope", table_name="game_leaderboard_entries")
    op.drop_table("game_leaderboard_entries")
    op.drop_constraint("fk_package_attempts_access_rule_id", "package_attempts", type_="foreignkey")
    op.drop_column("package_attempts", "leaderboard_eligible")
    op.drop_column("package_attempts", "duration_ms")
    op.drop_column("package_attempts", "access_rule_id")
    op.drop_column("package_attempts", "play_context")
    op.drop_index("ix_content_package_access_rules_lookup", table_name="content_package_access_rules")
    op.drop_table("content_package_access_rules")
    op.drop_index("ix_content_package_publications_channel_status", table_name="content_package_publications")
    op.drop_table("content_package_publications")
