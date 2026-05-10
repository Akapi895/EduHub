"""add score breakdown fields to package_attempts

Revision ID: a1b2c3d4e5f6
Revises: b2c3d4e5f6a7
Create Date: 2026-05-07 00:00:00.000000

"""

from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


revision: str = "a1b2c3d4e5f6"
down_revision: Union[str, None] = "b2c3d4e5f6a7"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column(
        'package_attempts',
        sa.Column('score_gameplay_base', sa.Float(), nullable=True),
    )
    op.add_column(
        'package_attempts',
        sa.Column('score_gameplay_bonus', sa.Float(), nullable=True),
    )


def downgrade() -> None:
    op.drop_column('package_attempts', 'score_gameplay_bonus')
    op.drop_column('package_attempts', 'score_gameplay_base')
