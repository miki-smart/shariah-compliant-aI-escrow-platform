"""
Models Package
Exports all SQLAlchemy models for the application
"""

from app.models.base import BaseModel, TimestampMixin, SoftDeleteMixin, AuditMixin, VersionedMixin
from app.models.user import User, UserDocument, UserRole, UserStatus, BusinessType
from app.models.product import Product, ProductReview, HaramProductKeyword, ShariahCategory, ProductCategory, ProductStatus
from app.models.order import (
    Order,
    OrderStatusHistory,
    OrderStatus,
    ShariahStatus,
    AIApprovalStatus,
    BankApprovalStatus,
    ContractType,
    OwnershipStatus,
    VALID_ORDER_TRANSITIONS,
)
from app.models.escrow import (
    Escrow,
    EscrowTransaction,
    EscrowStatus,
    TransactionType,
    TransactionStatus,
    VALID_ESCROW_TRANSITIONS,
)
from app.models.delivery import (
    Delivery,
    DeliveryTrackingEvent,
    DeliveryConfirmation,
    DeliveryStatus,
    ConfirmationType,
    DeliveryIssueType,
)
from app.models.shariah_result import (
    ShariahResult,
    ShariahRule,
    ShariahComplianceStatus,
    ViolationType,
)
from app.models.ai_decision import AIDecision
from app.models.audit import AuditLog, SystemLog, AuditAction, EntityType, ActorType
from app.models.dispute import (
    Dispute,
    DisputeMessage,
    DisputeTimeline,
    DisputeStatus,
    DisputeType,
    DisputeResolution,
    DisputeParty,
)

# All models for Alembic to discover
__all__ = [
    # Base
    "BaseModel",
    "TimestampMixin",
    "SoftDeleteMixin",
    "AuditMixin",
    "VersionedMixin",
    # User
    "User",
    "UserDocument",
    "UserRole",
    "UserStatus",
    "BusinessType",
    # Product
    "Product",
    "ProductReview",
    "HaramProductKeyword",
    "ShariahCategory",
    "ProductCategory",
    "ProductStatus",
    # Order
    "Order",
    "OrderStatusHistory",
    "OrderStatus",
    "ShariahStatus",
    "AIApprovalStatus",
    "BankApprovalStatus",
    "ContractType",
    "OwnershipStatus",
    "VALID_ORDER_TRANSITIONS",
    # Escrow
    "Escrow",
    "EscrowTransaction",
    "EscrowStatus",
    "TransactionType",
    "TransactionStatus",
    "VALID_ESCROW_TRANSITIONS",
    # Delivery
    "Delivery",
    "DeliveryTrackingEvent",
    "DeliveryConfirmation",
    "DeliveryStatus",
    "ConfirmationType",
    "DeliveryIssueType",
    # Shariah
    "ShariahResult",
    "ShariahRule",
    "ShariahComplianceStatus",
    "ViolationType",
    # AI
    "AIDecision",
    # Audit
    "AuditLog",
    "SystemLog",
    "AuditAction",
    "EntityType",
    "ActorType",
    # Dispute
    "Dispute",
    "DisputeMessage",
    "DisputeTimeline",
    "DisputeStatus",
    "DisputeType",
    "DisputeResolution",
    "DisputeParty",
]
