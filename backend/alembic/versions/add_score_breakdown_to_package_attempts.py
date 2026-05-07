"""add score breakdown fields to package_attempts for Memory Card

Revision ID: 8g3h4i5j6k7l
Revises: 7f2e4d8b9a3c
Create Date: 2026-05-07 00:00:00.000000

This migration adds breakdown score fields to support detailed score tracking,
particularly for Memory Card where scoring is composed of:
- Base points from matching (score_gameplay_base)
- Bonus points from time efficiency (score_gameplay_bonus)

"""

from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


revision: str = "8g3h4i5j6k7l"
down_revision: Union[str, None] = "7f2e4d8b9a3c"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # Add score breakdown columns to package_attempts
    op.add_column(
        'package_attempts',
        sa.Column('score_gameplay_base', sa.Float(), nullable=True),
    )
    op.add_column(
        'package_attempts',
        sa.Column('score_gameplay_bonus', sa.Float(), nullable=True),
    )
    # Add index for faster score queries
    op.create_index(
        'ix_package_attempts_score_breakdown',
        'package_attempts',
        ['score_gameplay_base', 'score_gameplay_bonus'],
    )


def downgrade() -> None:
    # Drop index and columns
    op.drop_index('ix_package_attempts_score_breakdown', table_name='package_attempts')
    op.drop_column('package_attempts', 'score_gameplay_bonus')
    op.drop_column('package_attempts', 'score_gameplay_base')
