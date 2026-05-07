"""add match_mode to game_card_pairs

Revision ID: 7f2e4d8b9a3c
Revises: None
Create Date: 2026-05-06 00:00:00.000000

This is a standalone migration to add the match_mode column to game_card_pairs.
It can be applied to any existing database state.

"""

from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


revision: str = "7f2e4d8b9a3c"
down_revision: Union[str, None] = "d1a9c3f6b7e4"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # Add match_mode column to game_card_pairs table
    # Default value "image_image" ensures existing records are not affected
    op.add_column(
        'game_card_pairs',
        sa.Column('match_mode', sa.String(), nullable=False, server_default='image_image')
    )
    # Remove the server default after migration to allow nullable if needed (optional)
    op.alter_column('game_card_pairs', 'match_mode', server_default=None)


def downgrade() -> None:
    # Drop the match_mode column when rolling back
    op.drop_column('game_card_pairs', 'match_mode')
