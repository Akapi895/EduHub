"""add interactive story engine tables

Revision ID: 5d8ab4f3d129
Revises: c9c9f4e7d41a
Create Date: 2026-04-18 15:30:00.000000

"""

from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql


# revision identifiers, used by Alembic.
revision: str = "5d8ab4f3d129"
down_revision: Union[str, None] = "c9c9f4e7d41a"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        "interactive_book_media",
        sa.Column("id", sa.String(), nullable=False),
        sa.Column("interactive_book_id", sa.String(), nullable=False),
        sa.Column("media_key", sa.String(), nullable=True),
        sa.Column("media_type", sa.String(), nullable=False),
        sa.Column("url", sa.String(), nullable=False),
        sa.Column("thumbnail_url", sa.String(), nullable=True),
        sa.Column("duration", sa.Float(), nullable=True),
        sa.Column("metadata_json", postgresql.JSONB(astext_type=sa.Text()), nullable=True),
        sa.Column("order_index", sa.Integer(), nullable=False, server_default="0"),
        sa.Column("created_at", sa.DateTime(), server_default=sa.text("now()"), nullable=False),
        sa.Column("updated_at", sa.DateTime(), server_default=sa.text("now()"), nullable=False),
        sa.ForeignKeyConstraint(["interactive_book_id"], ["interactive_books.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("interactive_book_id", "media_key", name="uq_interactive_book_media_key"),
    )
    op.create_table(
        "interactive_book_actions",
        sa.Column("id", sa.String(), nullable=False),
        sa.Column("interactive_book_id", sa.String(), nullable=False),
        sa.Column("action_key", sa.String(), nullable=True),
        sa.Column("action_type", sa.String(), nullable=False),
        sa.Column("config_json", postgresql.JSONB(astext_type=sa.Text()), nullable=True),
        sa.Column("order_index", sa.Integer(), nullable=False, server_default="0"),
        sa.Column("created_at", sa.DateTime(), server_default=sa.text("now()"), nullable=False),
        sa.Column("updated_at", sa.DateTime(), server_default=sa.text("now()"), nullable=False),
        sa.ForeignKeyConstraint(["interactive_book_id"], ["interactive_books.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("interactive_book_id", "action_key", name="uq_interactive_book_action_key"),
    )
    op.create_table(
        "interactive_book_quizzes",
        sa.Column("id", sa.String(), nullable=False),
        sa.Column("interactive_book_id", sa.String(), nullable=False),
        sa.Column("quiz_key", sa.String(), nullable=True),
        sa.Column("question", sa.String(), nullable=False),
        sa.Column("quiz_type", sa.String(), nullable=False, server_default="multiple_choice"),
        sa.Column("config_json", postgresql.JSONB(astext_type=sa.Text()), nullable=True),
        sa.Column("order_index", sa.Integer(), nullable=False, server_default="0"),
        sa.Column("created_at", sa.DateTime(), server_default=sa.text("now()"), nullable=False),
        sa.Column("updated_at", sa.DateTime(), server_default=sa.text("now()"), nullable=False),
        sa.ForeignKeyConstraint(["interactive_book_id"], ["interactive_books.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("interactive_book_id", "quiz_key", name="uq_interactive_book_quiz_key"),
    )
    op.create_table(
        "interactive_book_scenes",
        sa.Column("id", sa.String(), nullable=False),
        sa.Column("interactive_book_id", sa.String(), nullable=False),
        sa.Column("scene_key", sa.String(), nullable=False),
        sa.Column("title", sa.String(), nullable=True),
        sa.Column("scene_type", sa.String(), nullable=False),
        sa.Column("order_index", sa.Integer(), nullable=False, server_default="0"),
        sa.Column("background_media_id", sa.String(), nullable=True),
        sa.Column("auto_play", sa.Boolean(), nullable=False, server_default=sa.text("false")),
        sa.Column("content_json", postgresql.JSONB(astext_type=sa.Text()), nullable=True),
        sa.Column("created_at", sa.DateTime(), server_default=sa.text("now()"), nullable=False),
        sa.Column("updated_at", sa.DateTime(), server_default=sa.text("now()"), nullable=False),
        sa.ForeignKeyConstraint(["background_media_id"], ["interactive_book_media.id"], ondelete="SET NULL"),
        sa.ForeignKeyConstraint(["interactive_book_id"], ["interactive_books.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("interactive_book_id", "scene_key", name="uq_interactive_book_scene_key"),
    )
    op.create_table(
        "interactive_book_quiz_options",
        sa.Column("id", sa.String(), nullable=False),
        sa.Column("quiz_id", sa.String(), nullable=False),
        sa.Column("option_key", sa.String(), nullable=True),
        sa.Column("content", sa.String(), nullable=False),
        sa.Column("is_correct", sa.Boolean(), nullable=False, server_default=sa.text("false")),
        sa.Column("order_index", sa.Integer(), nullable=False, server_default="0"),
        sa.Column("feedback", sa.String(), nullable=True),
        sa.Column("feedback_audio_url", sa.String(), nullable=True),
        sa.Column("correct_action_key", sa.String(), nullable=True),
        sa.Column("wrong_action_key", sa.String(), nullable=True),
        sa.Column("next_scene_key", sa.String(), nullable=True),
        sa.Column("retry", sa.Boolean(), nullable=False, server_default=sa.text("false")),
        sa.Column("score_delta", sa.Float(), nullable=True),
        sa.Column("config_json", postgresql.JSONB(astext_type=sa.Text()), nullable=True),
        sa.Column("created_at", sa.DateTime(), server_default=sa.text("now()"), nullable=False),
        sa.Column("updated_at", sa.DateTime(), server_default=sa.text("now()"), nullable=False),
        sa.ForeignKeyConstraint(["quiz_id"], ["interactive_book_quizzes.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_table(
        "interactive_book_scene_elements",
        sa.Column("id", sa.String(), nullable=False),
        sa.Column("scene_id", sa.String(), nullable=False),
        sa.Column("element_key", sa.String(), nullable=True),
        sa.Column("element_type", sa.String(), nullable=False),
        sa.Column("media_id", sa.String(), nullable=True),
        sa.Column("quiz_id", sa.String(), nullable=True),
        sa.Column("action_id", sa.String(), nullable=True),
        sa.Column("order_index", sa.Integer(), nullable=False, server_default="0"),
        sa.Column("config_json", postgresql.JSONB(astext_type=sa.Text()), nullable=True),
        sa.Column("created_at", sa.DateTime(), server_default=sa.text("now()"), nullable=False),
        sa.Column("updated_at", sa.DateTime(), server_default=sa.text("now()"), nullable=False),
        sa.ForeignKeyConstraint(["action_id"], ["interactive_book_actions.id"], ondelete="SET NULL"),
        sa.ForeignKeyConstraint(["media_id"], ["interactive_book_media.id"], ondelete="SET NULL"),
        sa.ForeignKeyConstraint(["quiz_id"], ["interactive_book_quizzes.id"], ondelete="SET NULL"),
        sa.ForeignKeyConstraint(["scene_id"], ["interactive_book_scenes.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("scene_id", "element_key", name="uq_interactive_book_scene_element_key"),
    )
    op.create_table(
        "interactive_book_transitions",
        sa.Column("id", sa.String(), nullable=False),
        sa.Column("scene_id", sa.String(), nullable=False),
        sa.Column("trigger_type", sa.String(), nullable=False),
        sa.Column("condition_json", postgresql.JSONB(astext_type=sa.Text()), nullable=True),
        sa.Column("next_scene_key", sa.String(), nullable=True),
        sa.Column("action_key", sa.String(), nullable=True),
        sa.Column("order_index", sa.Integer(), nullable=False, server_default="0"),
        sa.Column("created_at", sa.DateTime(), server_default=sa.text("now()"), nullable=False),
        sa.Column("updated_at", sa.DateTime(), server_default=sa.text("now()"), nullable=False),
        sa.ForeignKeyConstraint(["scene_id"], ["interactive_book_scenes.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_table(
        "interactive_book_video_interactions",
        sa.Column("id", sa.String(), nullable=False),
        sa.Column("scene_id", sa.String(), nullable=False),
        sa.Column("interaction_key", sa.String(), nullable=True),
        sa.Column("timestamp", sa.Float(), nullable=False),
        sa.Column("prompt", sa.String(), nullable=True),
        sa.Column("config_json", postgresql.JSONB(astext_type=sa.Text()), nullable=True),
        sa.Column("order_index", sa.Integer(), nullable=False, server_default="0"),
        sa.Column("created_at", sa.DateTime(), server_default=sa.text("now()"), nullable=False),
        sa.Column("updated_at", sa.DateTime(), server_default=sa.text("now()"), nullable=False),
        sa.ForeignKeyConstraint(["scene_id"], ["interactive_book_scenes.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_table(
        "interactive_book_video_options",
        sa.Column("id", sa.String(), nullable=False),
        sa.Column("interaction_id", sa.String(), nullable=False),
        sa.Column("option_key", sa.String(), nullable=True),
        sa.Column("label", sa.String(), nullable=False),
        sa.Column("next_scene_key", sa.String(), nullable=True),
        sa.Column("is_correct", sa.Boolean(), nullable=True),
        sa.Column("retry", sa.Boolean(), nullable=False, server_default=sa.text("false")),
        sa.Column("order_index", sa.Integer(), nullable=False, server_default="0"),
        sa.Column("feedback", sa.String(), nullable=True),
        sa.Column("feedback_audio_url", sa.String(), nullable=True),
        sa.Column("action_key", sa.String(), nullable=True),
        sa.Column("score_delta", sa.Float(), nullable=True),
        sa.Column("config_json", postgresql.JSONB(astext_type=sa.Text()), nullable=True),
        sa.Column("created_at", sa.DateTime(), server_default=sa.text("now()"), nullable=False),
        sa.Column("updated_at", sa.DateTime(), server_default=sa.text("now()"), nullable=False),
        sa.ForeignKeyConstraint(["interaction_id"], ["interactive_book_video_interactions.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id"),
    )

    op.create_index("ix_interactive_book_media_book", "interactive_book_media", ["interactive_book_id", "order_index"])
    op.create_index("ix_interactive_book_actions_book", "interactive_book_actions", ["interactive_book_id", "order_index"])
    op.create_index("ix_interactive_book_quizzes_book", "interactive_book_quizzes", ["interactive_book_id", "order_index"])
    op.create_index("ix_interactive_book_scenes_book", "interactive_book_scenes", ["interactive_book_id", "order_index"])
    op.create_index("ix_interactive_book_scene_elements_scene", "interactive_book_scene_elements", ["scene_id", "order_index"])
    op.create_index("ix_interactive_book_transitions_scene", "interactive_book_transitions", ["scene_id", "order_index"])
    op.create_index("ix_interactive_book_video_interactions_scene", "interactive_book_video_interactions", ["scene_id", "order_index"])
    op.create_index("ix_interactive_book_video_options_interaction", "interactive_book_video_options", ["interaction_id", "order_index"])


def downgrade() -> None:
    op.drop_index("ix_interactive_book_video_options_interaction", table_name="interactive_book_video_options")
    op.drop_index("ix_interactive_book_video_interactions_scene", table_name="interactive_book_video_interactions")
    op.drop_index("ix_interactive_book_transitions_scene", table_name="interactive_book_transitions")
    op.drop_index("ix_interactive_book_scene_elements_scene", table_name="interactive_book_scene_elements")
    op.drop_index("ix_interactive_book_scenes_book", table_name="interactive_book_scenes")
    op.drop_index("ix_interactive_book_quizzes_book", table_name="interactive_book_quizzes")
    op.drop_index("ix_interactive_book_actions_book", table_name="interactive_book_actions")
    op.drop_index("ix_interactive_book_media_book", table_name="interactive_book_media")

    op.drop_table("interactive_book_video_options")
    op.drop_table("interactive_book_video_interactions")
    op.drop_table("interactive_book_transitions")
    op.drop_table("interactive_book_scene_elements")
    op.drop_table("interactive_book_quiz_options")
    op.drop_table("interactive_book_scenes")
    op.drop_table("interactive_book_quizzes")
    op.drop_table("interactive_book_actions")
    op.drop_table("interactive_book_media")
