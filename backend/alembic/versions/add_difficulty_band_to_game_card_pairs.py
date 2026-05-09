"""Add difficulty_band to game_card_pairs.

Revision ID: add_diff_band_card_pairs
Revises: 8g3h4i5j6k7l
Create Date: 2026-05-09
"""
from alembic import op
import sqlalchemy as sa


# revision identifiers
revision = 'add_diff_band_card_pairs'
down_revision = '8g3h4i5j6k7l'
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column(
        'game_card_pairs',
        sa.Column('difficulty_band', sa.String(), nullable=False, server_default='recognition')
    )


def downgrade() -> None:
    op.drop_column('game_card_pairs', 'difficulty_band')
