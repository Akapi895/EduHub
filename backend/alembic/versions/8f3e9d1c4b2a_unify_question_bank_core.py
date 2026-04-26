"""unify question bank core

Revision ID: 8f3e9d1c4b2a
Revises: 5d8ab4f3d129
Create Date: 2026-04-24 15:45:00.000000

"""

from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


revision: str = "8f3e9d1c4b2a"
down_revision: Union[str, None] = "5d8ab4f3d129"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        "game_modules",
        sa.Column("id", sa.String(), nullable=False),
        sa.Column("slug", sa.String(), nullable=False),
        sa.Column("title", sa.Text(), nullable=False),
        sa.Column("description", sa.Text(), nullable=True),
        sa.Column("runtime_kind", sa.String(), nullable=False),
        sa.Column("manifest_url", sa.Text(), nullable=False),
        sa.Column("status", sa.String(), nullable=False),
        sa.Column("capability_config", sa.JSON(), nullable=True),
        sa.Column("created_at", sa.DateTime(), server_default=sa.text("CURRENT_TIMESTAMP"), nullable=False),
        sa.Column("updated_at", sa.DateTime(), server_default=sa.text("CURRENT_TIMESTAMP"), nullable=False),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("slug"),
    )

    op.create_table(
        "content_packages",
        sa.Column("id", sa.String(), nullable=False),
        sa.Column("package_type", sa.String(), nullable=False),
        sa.Column("title", sa.Text(), nullable=False),
        sa.Column("description", sa.Text(), nullable=True),
        sa.Column("subject", sa.String(), nullable=True),
        sa.Column("grade", sa.String(), nullable=True),
        sa.Column("thumbnail_url", sa.Text(), nullable=True),
        sa.Column("status", sa.String(), nullable=False),
        sa.Column("created_by", sa.String(), nullable=False),
        sa.Column("version", sa.Integer(), nullable=False),
        sa.Column("published_at", sa.DateTime(), nullable=True),
        sa.Column("created_at", sa.DateTime(), server_default=sa.text("CURRENT_TIMESTAMP"), nullable=False),
        sa.Column("updated_at", sa.DateTime(), server_default=sa.text("CURRENT_TIMESTAMP"), nullable=False),
        sa.ForeignKeyConstraint(["created_by"], ["users.id"]),
        sa.PrimaryKeyConstraint("id"),
    )

    op.create_table(
        "content_package_assignments",
        sa.Column("id", sa.String(), nullable=False),
        sa.Column("package_id", sa.String(), nullable=False),
        sa.Column("class_id", sa.String(), nullable=False),
        sa.Column("assigned_by", sa.String(), nullable=False),
        sa.Column("start_at", sa.DateTime(), nullable=True),
        sa.Column("end_at", sa.DateTime(), nullable=True),
        sa.Column("is_active", sa.Boolean(), nullable=False),
        sa.Column("created_at", sa.DateTime(), server_default=sa.text("CURRENT_TIMESTAMP"), nullable=False),
        sa.ForeignKeyConstraint(["assigned_by"], ["users.id"]),
        sa.ForeignKeyConstraint(["class_id"], ["classes.id"], ondelete="CASCADE"),
        sa.ForeignKeyConstraint(["package_id"], ["content_packages.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("package_id", "class_id", name="uq_content_package_class_assignment"),
    )

    op.create_table(
        "exam_package_configs",
        sa.Column("package_id", sa.String(), nullable=False),
        sa.Column("start_time", sa.DateTime(), nullable=True),
        sa.Column("end_time", sa.DateTime(), nullable=True),
        sa.Column("duration_minutes", sa.Integer(), nullable=True),
        sa.Column("shuffle_questions", sa.Boolean(), nullable=False),
        sa.Column("max_attempts", sa.Integer(), nullable=False),
        sa.Column("allow_review", sa.Boolean(), nullable=False),
        sa.Column("show_answers_policy", sa.String(), nullable=False),
        sa.Column("created_at", sa.DateTime(), server_default=sa.text("CURRENT_TIMESTAMP"), nullable=False),
        sa.Column("updated_at", sa.DateTime(), server_default=sa.text("CURRENT_TIMESTAMP"), nullable=False),
        sa.ForeignKeyConstraint(["package_id"], ["content_packages.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("package_id"),
    )

    op.create_table(
        "game_package_configs",
        sa.Column("package_id", sa.String(), nullable=False),
        sa.Column("game_module_id", sa.String(), nullable=False),
        sa.Column("selector_strategy", sa.String(), nullable=False),
        sa.Column("runtime_config", sa.JSON(), nullable=True),
        sa.Column("scoring_config", sa.JSON(), nullable=True),
        sa.Column("created_at", sa.DateTime(), server_default=sa.text("CURRENT_TIMESTAMP"), nullable=False),
        sa.Column("updated_at", sa.DateTime(), server_default=sa.text("CURRENT_TIMESTAMP"), nullable=False),
        sa.ForeignKeyConstraint(["game_module_id"], ["game_modules.id"]),
        sa.ForeignKeyConstraint(["package_id"], ["content_packages.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("package_id"),
    )

    op.create_table(
        "question_banks",
        sa.Column("id", sa.String(), nullable=False),
        sa.Column("package_id", sa.String(), nullable=False),
        sa.Column("created_by", sa.String(), nullable=False),
        sa.Column("created_at", sa.DateTime(), server_default=sa.text("CURRENT_TIMESTAMP"), nullable=False),
        sa.Column("updated_at", sa.DateTime(), server_default=sa.text("CURRENT_TIMESTAMP"), nullable=False),
        sa.ForeignKeyConstraint(["created_by"], ["users.id"]),
        sa.ForeignKeyConstraint(["package_id"], ["content_packages.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("package_id"),
    )

    op.create_table(
        "question_bank_items",
        sa.Column("id", sa.String(), nullable=False),
        sa.Column("question_bank_id", sa.String(), nullable=False),
        sa.Column("type", sa.String(), nullable=False),
        sa.Column("difficulty_band", sa.String(), nullable=True),
        sa.Column("content", sa.Text(), nullable=False),
        sa.Column("instruction", sa.Text(), nullable=True),
        sa.Column("explanation", sa.Text(), nullable=True),
        sa.Column("points", sa.Integer(), nullable=False),
        sa.Column("required", sa.Boolean(), nullable=False),
        sa.Column("order_index", sa.Integer(), nullable=False),
        sa.Column("is_active", sa.Boolean(), nullable=False),
        sa.Column("created_by", sa.String(), nullable=False),
        sa.Column("created_at", sa.DateTime(), server_default=sa.text("CURRENT_TIMESTAMP"), nullable=False),
        sa.Column("updated_at", sa.DateTime(), server_default=sa.text("CURRENT_TIMESTAMP"), nullable=False),
        sa.ForeignKeyConstraint(["created_by"], ["users.id"]),
        sa.ForeignKeyConstraint(["question_bank_id"], ["question_banks.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index("ix_question_bank_items_bank_order", "question_bank_items", ["question_bank_id", "order_index"], unique=False)
    op.create_index("ix_question_bank_items_bank_difficulty", "question_bank_items", ["question_bank_id", "difficulty_band", "is_active"], unique=False)
    op.create_index("ix_question_bank_items_bank_type", "question_bank_items", ["question_bank_id", "type", "is_active"], unique=False)

    op.create_table(
        "question_item_options",
        sa.Column("id", sa.String(), nullable=False),
        sa.Column("question_item_id", sa.String(), nullable=False),
        sa.Column("option_key", sa.String(), nullable=False),
        sa.Column("content", sa.Text(), nullable=False),
        sa.Column("is_correct", sa.Boolean(), nullable=False),
        sa.Column("order_index", sa.Integer(), nullable=False),
        sa.ForeignKeyConstraint(["question_item_id"], ["question_bank_items.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("question_item_id", "option_key", name="uq_question_item_option_key"),
    )

    op.create_table(
        "question_item_matching_right_items",
        sa.Column("id", sa.String(), nullable=False),
        sa.Column("question_item_id", sa.String(), nullable=False),
        sa.Column("right_key", sa.String(), nullable=False),
        sa.Column("content", sa.Text(), nullable=False),
        sa.Column("order_index", sa.Integer(), nullable=False),
        sa.ForeignKeyConstraint(["question_item_id"], ["question_bank_items.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("question_item_id", "right_key", name="uq_question_item_matching_right_key"),
    )

    op.create_table(
        "question_item_matching_left_items",
        sa.Column("id", sa.String(), nullable=False),
        sa.Column("question_item_id", sa.String(), nullable=False),
        sa.Column("left_key", sa.String(), nullable=False),
        sa.Column("content", sa.Text(), nullable=False),
        sa.Column("correct_right_key", sa.String(), nullable=False),
        sa.Column("order_index", sa.Integer(), nullable=False),
        sa.ForeignKeyConstraint(["question_item_id"], ["question_bank_items.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("question_item_id", "left_key", name="uq_question_item_matching_left_key"),
    )

    op.create_table(
        "question_item_text_configs",
        sa.Column("id", sa.String(), nullable=False),
        sa.Column("question_item_id", sa.String(), nullable=False),
        sa.Column("input_variant", sa.String(), nullable=False),
        sa.Column("grading_mode", sa.String(), nullable=False),
        sa.Column("min_length", sa.Integer(), nullable=True),
        sa.Column("max_length", sa.Integer(), nullable=True),
        sa.Column("case_sensitive", sa.Boolean(), nullable=False),
        sa.Column("accent_sensitive", sa.Boolean(), nullable=False),
        sa.Column("trim_whitespace", sa.Boolean(), nullable=False),
        sa.Column("ignore_punctuation", sa.Boolean(), nullable=False),
        sa.Column("manual_grading_required", sa.Boolean(), nullable=False),
        sa.ForeignKeyConstraint(["question_item_id"], ["question_bank_items.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("question_item_id"),
    )

    op.create_table(
        "question_item_text_accepted_answers",
        sa.Column("id", sa.String(), nullable=False),
        sa.Column("text_config_id", sa.String(), nullable=False),
        sa.Column("answer_text", sa.Text(), nullable=False),
        sa.Column("normalized_answer", sa.Text(), nullable=True),
        sa.Column("score_ratio", sa.Float(), nullable=False),
        sa.Column("order_index", sa.Integer(), nullable=False),
        sa.ForeignKeyConstraint(["text_config_id"], ["question_item_text_configs.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id"),
    )

    op.create_table(
        "question_item_text_keywords",
        sa.Column("id", sa.String(), nullable=False),
        sa.Column("text_config_id", sa.String(), nullable=False),
        sa.Column("keyword", sa.Text(), nullable=False),
        sa.Column("weight", sa.Float(), nullable=False),
        sa.Column("is_required", sa.Boolean(), nullable=False),
        sa.Column("match_mode", sa.String(), nullable=False),
        sa.ForeignKeyConstraint(["text_config_id"], ["question_item_text_configs.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id"),
    )

    op.create_table(
        "question_item_assets",
        sa.Column("id", sa.String(), nullable=False),
        sa.Column("question_item_id", sa.String(), nullable=False),
        sa.Column("asset_type", sa.String(), nullable=False),
        sa.Column("url", sa.Text(), nullable=False),
        sa.Column("order_index", sa.Integer(), nullable=False),
        sa.ForeignKeyConstraint(["question_item_id"], ["question_bank_items.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id"),
    )

    op.create_table(
        "package_attempts",
        sa.Column("id", sa.String(), nullable=False),
        sa.Column("package_id", sa.String(), nullable=False),
        sa.Column("user_id", sa.String(), nullable=False),
        sa.Column("class_id", sa.String(), nullable=True),
        sa.Column("attempt_index", sa.Integer(), nullable=False),
        sa.Column("status", sa.String(), nullable=False),
        sa.Column("started_at", sa.DateTime(), server_default=sa.text("CURRENT_TIMESTAMP"), nullable=False),
        sa.Column("submitted_at", sa.DateTime(), nullable=True),
        sa.Column("completed_at", sa.DateTime(), nullable=True),
        sa.Column("score_total", sa.Float(), nullable=True),
        sa.Column("score_question", sa.Float(), nullable=True),
        sa.Column("score_context", sa.Float(), nullable=True),
        sa.Column("summary_payload", sa.JSON(), nullable=True),
        sa.Column("runtime_state", sa.JSON(), nullable=True),
        sa.Column("created_at", sa.DateTime(), server_default=sa.text("CURRENT_TIMESTAMP"), nullable=False),
        sa.Column("updated_at", sa.DateTime(), server_default=sa.text("CURRENT_TIMESTAMP"), nullable=False),
        sa.ForeignKeyConstraint(["class_id"], ["classes.id"], ondelete="CASCADE"),
        sa.ForeignKeyConstraint(["package_id"], ["content_packages.id"], ondelete="CASCADE"),
        sa.ForeignKeyConstraint(["user_id"], ["users.id"]),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("package_id", "user_id", "attempt_index", name="uq_package_attempt_index"),
    )

    op.create_table(
        "package_question_attempts",
        sa.Column("id", sa.String(), nullable=False),
        sa.Column("package_attempt_id", sa.String(), nullable=False),
        sa.Column("question_item_id", sa.String(), nullable=False),
        sa.Column("source_context", sa.String(), nullable=False),
        sa.Column("source_payload", sa.JSON(), nullable=True),
        sa.Column("display_order", sa.Integer(), nullable=True),
        sa.Column("difficulty_band_snapshot", sa.String(), nullable=True),
        sa.Column("presented_at", sa.DateTime(), server_default=sa.text("CURRENT_TIMESTAMP"), nullable=False),
        sa.Column("answered_at", sa.DateTime(), nullable=True),
        sa.Column("graded_at", sa.DateTime(), nullable=True),
        sa.Column("resolved_at", sa.DateTime(), nullable=True),
        sa.Column("pause_started_at", sa.DateTime(), nullable=True),
        sa.Column("pause_ended_at", sa.DateTime(), nullable=True),
        sa.Column("status", sa.String(), nullable=False),
        sa.Column("is_correct", sa.Boolean(), nullable=True),
        sa.Column("score_awarded", sa.Float(), nullable=True),
        sa.Column("graded_by", sa.String(), nullable=True),
        sa.Column("feedback_message", sa.Text(), nullable=True),
        sa.Column("created_at", sa.DateTime(), server_default=sa.text("CURRENT_TIMESTAMP"), nullable=False),
        sa.Column("updated_at", sa.DateTime(), server_default=sa.text("CURRENT_TIMESTAMP"), nullable=False),
        sa.ForeignKeyConstraint(["graded_by"], ["users.id"]),
        sa.ForeignKeyConstraint(["package_attempt_id"], ["package_attempts.id"], ondelete="CASCADE"),
        sa.ForeignKeyConstraint(["question_item_id"], ["question_bank_items.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id"),
    )

    op.create_table(
        "question_attempt_selected_options",
        sa.Column("id", sa.String(), nullable=False),
        sa.Column("question_attempt_id", sa.String(), nullable=False),
        sa.Column("option_id", sa.String(), nullable=False),
        sa.ForeignKeyConstraint(["option_id"], ["question_item_options.id"], ondelete="CASCADE"),
        sa.ForeignKeyConstraint(["question_attempt_id"], ["package_question_attempts.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("question_attempt_id", "option_id", name="uq_question_attempt_option"),
    )

    op.create_table(
        "question_attempt_matching_answers",
        sa.Column("id", sa.String(), nullable=False),
        sa.Column("question_attempt_id", sa.String(), nullable=False),
        sa.Column("left_item_id", sa.String(), nullable=False),
        sa.Column("selected_right_key", sa.String(), nullable=True),
        sa.Column("is_correct", sa.Boolean(), nullable=True),
        sa.ForeignKeyConstraint(["left_item_id"], ["question_item_matching_left_items.id"], ondelete="CASCADE"),
        sa.ForeignKeyConstraint(["question_attempt_id"], ["package_question_attempts.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id"),
    )

    op.create_table(
        "question_attempt_text_answers",
        sa.Column("id", sa.String(), nullable=False),
        sa.Column("question_attempt_id", sa.String(), nullable=False),
        sa.Column("raw_answer", sa.Text(), nullable=False),
        sa.Column("normalized_answer", sa.Text(), nullable=True),
        sa.Column("grading_mode_snapshot", sa.String(), nullable=True),
        sa.Column("score_awarded", sa.Float(), nullable=True),
        sa.ForeignKeyConstraint(["question_attempt_id"], ["package_question_attempts.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("question_attempt_id"),
    )

    op.create_table(
        "question_attempt_uploaded_assets",
        sa.Column("id", sa.String(), nullable=False),
        sa.Column("question_attempt_id", sa.String(), nullable=False),
        sa.Column("asset_url", sa.Text(), nullable=False),
        sa.Column("asset_type", sa.String(), nullable=True),
        sa.Column("created_at", sa.DateTime(), server_default=sa.text("CURRENT_TIMESTAMP"), nullable=False),
        sa.ForeignKeyConstraint(["question_attempt_id"], ["package_question_attempts.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id"),
    )

    op.create_table(
        "game_module_trigger_mappings",
        sa.Column("id", sa.String(), nullable=False),
        sa.Column("game_module_id", sa.String(), nullable=False),
        sa.Column("trigger_type", sa.String(), nullable=False),
        sa.Column("trigger_key", sa.String(), nullable=False),
        sa.Column("trigger_value", sa.String(), nullable=False),
        sa.Column("difficulty_band", sa.String(), nullable=False),
        sa.Column("selector_strategy", sa.String(), nullable=False),
        sa.Column("is_active", sa.Boolean(), nullable=False),
        sa.Column("created_at", sa.DateTime(), server_default=sa.text("CURRENT_TIMESTAMP"), nullable=False),
        sa.ForeignKeyConstraint(["game_module_id"], ["game_modules.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id"),
    )

    op.create_table(
        "game_runtime_events",
        sa.Column("id", sa.String(), nullable=False),
        sa.Column("package_attempt_id", sa.String(), nullable=False),
        sa.Column("event_type", sa.String(), nullable=False),
        sa.Column("event_payload", sa.JSON(), nullable=True),
        sa.Column("created_at", sa.DateTime(), server_default=sa.text("CURRENT_TIMESTAMP"), nullable=False),
        sa.ForeignKeyConstraint(["package_attempt_id"], ["package_attempts.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id"),
    )

    op.drop_table("answer_options")
    op.drop_table("answers")
    op.drop_table("question_options")
    op.drop_table("matching_pairs")
    op.drop_table("questions")
    op.drop_table("exam_submissions")
    op.drop_table("exams")


def downgrade() -> None:
    op.create_table(
        "exams",
        sa.Column("id", sa.String(), nullable=False),
        sa.Column("class_id", sa.String(), nullable=False),
        sa.Column("title", sa.String(), nullable=False),
        sa.Column("description", sa.String(), nullable=True),
        sa.Column("thumbnail_url", sa.String(), nullable=True),
        sa.Column("start_time", sa.DateTime(), nullable=True),
        sa.Column("end_time", sa.DateTime(), nullable=True),
        sa.Column("duration_minutes", sa.Integer(), nullable=True),
        sa.Column("shuffle_questions", sa.Boolean(), nullable=False),
        sa.Column("max_attempts", sa.Integer(), nullable=False),
        sa.Column("allow_review", sa.Boolean(), nullable=False),
        sa.Column("show_answers_policy", sa.String(), nullable=False),
        sa.Column("status", sa.String(), nullable=False),
        sa.Column("created_by", sa.String(), nullable=False),
        sa.Column("created_at", sa.DateTime(), server_default=sa.text("CURRENT_TIMESTAMP"), nullable=False),
        sa.ForeignKeyConstraint(["class_id"], ["classes.id"]),
        sa.ForeignKeyConstraint(["created_by"], ["users.id"]),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_table(
        "exam_submissions",
        sa.Column("id", sa.String(), nullable=False),
        sa.Column("exam_id", sa.String(), nullable=False),
        sa.Column("student_id", sa.String(), nullable=False),
        sa.Column("started_at", sa.DateTime(), server_default=sa.text("CURRENT_TIMESTAMP"), nullable=False),
        sa.Column("submitted_at", sa.DateTime(), nullable=True),
        sa.Column("total_score", sa.Float(), nullable=True),
        sa.Column("status", sa.String(), nullable=False),
        sa.ForeignKeyConstraint(["exam_id"], ["exams.id"]),
        sa.ForeignKeyConstraint(["student_id"], ["users.id"]),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_table(
        "questions",
        sa.Column("id", sa.String(), nullable=False),
        sa.Column("exam_id", sa.String(), nullable=False),
        sa.Column("type", sa.String(), nullable=False),
        sa.Column("content", sa.String(), nullable=False),
        sa.Column("instruction", sa.String(), nullable=True),
        sa.Column("points", sa.Integer(), nullable=False),
        sa.Column("required", sa.Boolean(), nullable=False),
        sa.Column("order_index", sa.Integer(), nullable=False),
        sa.Column("created_at", sa.DateTime(), server_default=sa.text("CURRENT_TIMESTAMP"), nullable=False),
        sa.ForeignKeyConstraint(["exam_id"], ["exams.id"]),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_table(
        "answers",
        sa.Column("id", sa.String(), nullable=False),
        sa.Column("submission_id", sa.String(), nullable=False),
        sa.Column("question_id", sa.String(), nullable=False),
        sa.Column("text_answer", sa.String(), nullable=True),
        sa.Column("uploaded_image_url", sa.String(), nullable=True),
        sa.Column("score", sa.Float(), nullable=True),
        sa.Column("graded_by", sa.String(), nullable=True),
        sa.Column("graded_at", sa.DateTime(), nullable=True),
        sa.ForeignKeyConstraint(["graded_by"], ["users.id"]),
        sa.ForeignKeyConstraint(["question_id"], ["questions.id"]),
        sa.ForeignKeyConstraint(["submission_id"], ["exam_submissions.id"]),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_table(
        "matching_pairs",
        sa.Column("id", sa.String(), nullable=False),
        sa.Column("question_id", sa.String(), nullable=False),
        sa.Column("left_text", sa.String(), nullable=False),
        sa.Column("right_text", sa.String(), nullable=False),
        sa.Column("correct_match", sa.String(), nullable=False),
        sa.ForeignKeyConstraint(["question_id"], ["questions.id"]),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_table(
        "question_options",
        sa.Column("id", sa.String(), nullable=False),
        sa.Column("question_id", sa.String(), nullable=False),
        sa.Column("content", sa.String(), nullable=False),
        sa.Column("is_correct", sa.Boolean(), nullable=False),
        sa.ForeignKeyConstraint(["question_id"], ["questions.id"]),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_table(
        "answer_options",
        sa.Column("id", sa.String(), nullable=False),
        sa.Column("answer_id", sa.String(), nullable=False),
        sa.Column("option_id", sa.String(), nullable=False),
        sa.ForeignKeyConstraint(["answer_id"], ["answers.id"]),
        sa.ForeignKeyConstraint(["option_id"], ["question_options.id"]),
        sa.PrimaryKeyConstraint("id"),
    )

    op.drop_table("game_runtime_events")
    op.drop_table("game_module_trigger_mappings")
    op.drop_table("question_attempt_uploaded_assets")
    op.drop_table("question_attempt_text_answers")
    op.drop_table("question_attempt_matching_answers")
    op.drop_table("question_attempt_selected_options")
    op.drop_table("package_question_attempts")
    op.drop_table("package_attempts")
    op.drop_table("question_item_assets")
    op.drop_table("question_item_text_keywords")
    op.drop_table("question_item_text_accepted_answers")
    op.drop_table("question_item_text_configs")
    op.drop_table("question_item_matching_left_items")
    op.drop_table("question_item_matching_right_items")
    op.drop_table("question_item_options")
    op.drop_index("ix_question_bank_items_bank_type", table_name="question_bank_items")
    op.drop_index("ix_question_bank_items_bank_difficulty", table_name="question_bank_items")
    op.drop_index("ix_question_bank_items_bank_order", table_name="question_bank_items")
    op.drop_table("question_bank_items")
    op.drop_table("question_banks")
    op.drop_table("game_package_configs")
    op.drop_table("exam_package_configs")
    op.drop_table("content_package_assignments")
    op.drop_table("content_packages")
    op.drop_table("game_modules")
