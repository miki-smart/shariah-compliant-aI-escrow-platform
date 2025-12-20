"""Add photo verification fields to delivery

Revision ID: add_photo_verification
Revises: fix_datetime_tz
Create Date: 2025-12-19

"""
from typing import Sequence, Union
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

# revision identifiers, used by Alembic.
revision: str = 'add_photo_verification'
down_revision: Union[str, None] = 'fix_datetime_tz'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # Add photo verification columns to deliveries table
    op.add_column('deliveries', sa.Column('pickup_photo_url', sa.String(500), nullable=True))
    op.add_column('deliveries', sa.Column('pickup_photo_hash', sa.String(64), nullable=True))
    op.add_column('deliveries', sa.Column('pickup_similarity_score', sa.Float(), nullable=True))
    op.add_column('deliveries', sa.Column('pickup_photo_verified', sa.Boolean(), server_default='false', nullable=False))
    op.add_column('deliveries', sa.Column('pickup_verified_at', sa.DateTime(timezone=True), nullable=True))
    
    op.add_column('deliveries', sa.Column('delivery_photo_url', sa.String(500), nullable=True))
    op.add_column('deliveries', sa.Column('delivery_photo_hash', sa.String(64), nullable=True))
    op.add_column('deliveries', sa.Column('delivery_similarity_score', sa.Float(), nullable=True))
    op.add_column('deliveries', sa.Column('delivery_photo_verified', sa.Boolean(), server_default='false', nullable=False))
    op.add_column('deliveries', sa.Column('delivery_verified_at', sa.DateTime(timezone=True), nullable=True))
    
    # Seller confirmation for pickup
    op.add_column('deliveries', sa.Column('seller_confirmed_pickup', sa.Boolean(), server_default='false', nullable=False))
    op.add_column('deliveries', sa.Column('seller_confirmed_pickup_at', sa.DateTime(timezone=True), nullable=True))
    
    # Fraud detection
    op.add_column('deliveries', sa.Column('fraud_detected', sa.Boolean(), server_default='false', nullable=False))
    op.add_column('deliveries', sa.Column('fraud_type', sa.String(50), nullable=True))
    op.add_column('deliveries', sa.Column('fraud_detected_at', sa.DateTime(timezone=True), nullable=True))
    
    # Verification status enum
    op.add_column('deliveries', sa.Column('photo_verification_status', sa.String(50), server_default='pending', nullable=False))
    
    # Photo verification attempts
    op.add_column('deliveries', sa.Column('pickup_photo_attempts', sa.Integer(), server_default='0', nullable=False))
    op.add_column('deliveries', sa.Column('delivery_photo_attempts', sa.Integer(), server_default='0', nullable=False))
    op.add_column('deliveries', sa.Column('max_photo_attempts', sa.Integer(), server_default='3', nullable=False))
    
    # Seller pickup confirmation request
    op.add_column('deliveries', sa.Column('seller_requested_pickup_confirmation', sa.Boolean(), server_default='false', nullable=False))
    op.add_column('deliveries', sa.Column('seller_requested_pickup_at', sa.DateTime(timezone=True), nullable=True))
    
    # Provider pickup confirmation
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
    op.drop_column('deliveries', 'photo_verification_status')
    op.drop_column('deliveries', 'fraud_detected_at')
    op.drop_column('deliveries', 'fraud_type')
    op.drop_column('deliveries', 'fraud_detected')
    op.drop_column('deliveries', 'seller_confirmed_pickup_at')
    op.drop_column('deliveries', 'seller_confirmed_pickup')
    op.drop_column('deliveries', 'delivery_verified_at')
    op.drop_column('deliveries', 'delivery_photo_verified')
    op.drop_column('deliveries', 'delivery_similarity_score')
    op.drop_column('deliveries', 'delivery_photo_hash')
    op.drop_column('deliveries', 'delivery_photo_url')
    op.drop_column('deliveries', 'pickup_verified_at')
    op.drop_column('deliveries', 'pickup_photo_verified')
    op.drop_column('deliveries', 'pickup_similarity_score')
    op.drop_column('deliveries', 'pickup_photo_hash')
    op.drop_column('deliveries', 'pickup_photo_url')
