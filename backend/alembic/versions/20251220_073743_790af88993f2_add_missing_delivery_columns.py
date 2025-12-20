"""add_missing_delivery_columns

Revision ID: 790af88993f2
Revises: add_photo_verification
Create Date: 2025-12-20 07:37:43.317512+00:00

"""

from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = "790af88993f2"
down_revision: Union[str, None] = "add_photo_verification"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # Add missing photo verification attempt columns
    op.add_column('deliveries', sa.Column('pickup_photo_attempts', sa.Integer(), server_default='0', nullable=False))
    op.add_column('deliveries', sa.Column('delivery_photo_attempts', sa.Integer(), server_default='0', nullable=False))
    op.add_column('deliveries', sa.Column('max_photo_attempts', sa.Integer(), server_default='3', nullable=False))
    
    # Add seller pickup confirmation request columns
    op.add_column('deliveries', sa.Column('seller_requested_pickup_confirmation', sa.Boolean(), server_default='false', nullable=False))
    op.add_column('deliveries', sa.Column('seller_requested_pickup_at', sa.DateTime(timezone=True), nullable=True))
    
    # Add provider pickup confirmation columns
    op.add_column('deliveries', sa.Column('provider_confirmed_pickup', sa.Boolean(), server_default='false', nullable=False))
    op.add_column('deliveries', sa.Column('provider_confirmed_pickup_at', sa.DateTime(timezone=True), nullable=True))


def downgrade() -> None:
    op.drop_column('deliveries', 'provider_confirmed_pickup_at')
    op.drop_column('deliveries', 'provider_confirmed_pickup')
    op.drop_column('deliveries', 'seller_requested_pickup_at')
    op.drop_column('deliveries', 'seller_requested_pickup_confirmation')
    op.drop_column('deliveries', 'max_photo_attempts')
    op.drop_column('deliveries', 'delivery_photo_attempts')
    op.drop_column('deliveries', 'pickup_photo_attempts')
