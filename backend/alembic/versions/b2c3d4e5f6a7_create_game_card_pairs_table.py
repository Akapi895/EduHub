"""Create game_card_pairs table for Memory Card game module.

Revision ID: b2c3d4e5f6a7
Revises: 7f2e4d8b9a3c
Create Date: 2026-05-11 00:20:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa

# revision identifiers, used by Alembic.
revision: str = 'b2c3d4e5f6a7'
down_revision: Union[str, None] = '7f2e4d8b9a3c'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # Create the game_card_pairs table
    op.create_table(
        'game_card_pairs',
        sa.Column('id', sa.String(), nullable=False),
        sa.Column('package_id', sa.String(), nullable=False),
        sa.Column('left_label', sa.Text(), nullable=True),
        sa.Column('left_image_url', sa.Text(), nullable=True),
        sa.Column('right_label', sa.Text(), nullable=True),
        sa.Column('right_image_url', sa.Text(), nullable=True),
        sa.Column('order_index', sa.Integer(), nullable=False, server_default='0'),
        sa.Column('difficulty_band', sa.String(), nullable=False, server_default='recognition'),
        sa.Column('is_active', sa.Boolean(), nullable=False, server_default='true'),
        sa.Column('match_mode', sa.String(), nullable=False, server_default='image_image'),
        sa.Column('created_at', sa.DateTime(), server_default=sa.text('now()'), nullable=True),
        sa.Column('updated_at', sa.DateTime(), server_default=sa.text('now()'), nullable=True),
        sa.ForeignKeyConstraint(['package_id'], ['content_packages.id'], ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('id'),
    )

    # Create index on package_id for faster lookups
    op.create_index('ix_game_card_pairs_package_id', 'game_card_pairs', ['package_id'])


def downgrade() -> None:
    op.drop_index('ix_game_card_pairs_package_id', table_name='game_card_pairs')
    op.drop_table('game_card_pairs')
