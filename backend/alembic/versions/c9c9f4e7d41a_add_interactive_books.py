"""add interactive books

Revision ID: c9c9f4e7d41a
Revises: aac64db6d6f2
Create Date: 2026-04-18 01:10:00.000000

"""

from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql


# revision identifiers, used by Alembic.
revision: str = "c9c9f4e7d41a"
down_revision: Union[str, None] = "aac64db6d6f2"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        "interactive_books",
        sa.Column("id", sa.String(), nullable=False),
        sa.Column("material_id", sa.String(), nullable=False),
        sa.Column("status", sa.String(), nullable=False),
        sa.Column("draft_manifest", postgresql.JSONB(astext_type=sa.Text()), nullable=True),
        sa.Column("published_manifest", postgresql.JSONB(astext_type=sa.Text()), nullable=True),
        sa.Column("manifest_version", sa.Integer(), nullable=False),
        sa.Column("entry_scene_id", sa.String(), nullable=True),
        sa.Column("estimated_duration", sa.Integer(), nullable=True),
        sa.Column("created_by", sa.String(), nullable=False),
        sa.Column("published_at", sa.DateTime(), nullable=True),
        sa.Column("created_at", sa.DateTime(), server_default=sa.text("now()"), nullable=False),
        sa.Column("updated_at", sa.DateTime(), server_default=sa.text("now()"), nullable=False),
        sa.ForeignKeyConstraint(["created_by"], ["users.id"]),
        sa.ForeignKeyConstraint(["material_id"], ["library_materials.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("material_id"),
    )
    op.create_table(
        "interactive_book_attempts",
        sa.Column("id", sa.String(), nullable=False),
        sa.Column("interactive_book_id", sa.String(), nullable=False),
        sa.Column("student_id", sa.String(), nullable=False),
        sa.Column("class_id", sa.String(), nullable=True),
        sa.Column("manifest_version", sa.Integer(), nullable=False),
        sa.Column("manifest_snapshot", postgresql.JSONB(astext_type=sa.Text()), nullable=True),
        sa.Column("status", sa.String(), nullable=False),
        sa.Column("current_scene_id", sa.String(), nullable=True),
        sa.Column("state_snapshot", postgresql.JSONB(astext_type=sa.Text()), nullable=True),
        sa.Column("completion_percent", sa.Float(), nullable=False),
        sa.Column("score_summary", postgresql.JSONB(astext_type=sa.Text()), nullable=True),
        sa.Column("started_at", sa.DateTime(), server_default=sa.text("now()"), nullable=False),
        sa.Column("last_seen_at", sa.DateTime(), server_default=sa.text("now()"), nullable=False),
        sa.Column("completed_at", sa.DateTime(), nullable=True),
        sa.ForeignKeyConstraint(["class_id"], ["classes.id"], ondelete="SET NULL"),
        sa.ForeignKeyConstraint(["interactive_book_id"], ["interactive_books.id"], ondelete="CASCADE"),
        sa.ForeignKeyConstraint(["student_id"], ["users.id"]),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_table(
        "interactive_book_events",
        sa.Column("id", sa.String(), nullable=False),
        sa.Column("attempt_id", sa.String(), nullable=False),
        sa.Column("scene_id", sa.String(), nullable=True),
        sa.Column("event_type", sa.String(), nullable=False),
        sa.Column("payload", postgresql.JSONB(astext_type=sa.Text()), nullable=True),
        sa.Column("created_at", sa.DateTime(), server_default=sa.text("now()"), nullable=False),
        sa.ForeignKeyConstraint(["attempt_id"], ["interactive_book_attempts.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index(
        "ix_interactive_book_attempts_student_book",
        "interactive_book_attempts",
        ["student_id", "interactive_book_id"],
    )
    op.create_index(
        "ix_interactive_book_events_attempt",
        "interactive_book_events",
        ["attempt_id", "created_at"],
    )


def downgrade() -> None:
    op.drop_index("ix_interactive_book_events_attempt", table_name="interactive_book_events")
    op.drop_index("ix_interactive_book_attempts_student_book", table_name="interactive_book_attempts")
    op.drop_table("interactive_book_events")
    op.drop_table("interactive_book_attempts")
    op.drop_table("interactive_books")
