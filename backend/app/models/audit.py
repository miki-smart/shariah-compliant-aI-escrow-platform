"""
Audit Log Model
Immutable audit trail for regulatory compliance
"""
from sqlalchemy import Column, String, Text, Index, ForeignKey
from sqlalchemy import Enum as SQLEnum
from sqlalchemy.dialects.postgresql import UUID, JSONB, INET
from sqlalchemy.orm import Mapped, mapped_column
from typing import Optional
import uuid
import enum
from datetime import datetime, timezone

from app.models.base import BaseModel


class AuditAction(str, enum.Enum):
    """Types of auditable actions"""
    # User actions
    USER_CREATED = "user_created"
    USER_UPDATED = "user_updated"
    USER_DELETED = "user_deleted"
    USER_LOGIN = "user_login"
    USER_LOGOUT = "user_logout"
    USER_VERIFIED = "user_verified"
    
    # Order actions
    ORDER_CREATED = "order_created"
    ORDER_UPDATED = "order_updated"
    ORDER_STATUS_CHANGED = "order_status_changed"
    ORDER_CANCELLED = "order_cancelled"
    
    # Escrow actions
    ESCROW_CREATED = "escrow_created"
    ESCROW_FUNDED = "escrow_funded"
    ESCROW_LOCKED = "escrow_locked"
    ESCROW_FROZEN = "escrow_frozen"
    ESCROW_RELEASED = "escrow_released"
    ESCROW_REVERTED = "escrow_reverted"
    
    # Shariah actions
    SHARIAH_VALIDATED = "shariah_validated"
    SHARIAH_VIOLATION = "shariah_violation"
    SHARIAH_REVIEW_REQUESTED = "shariah_review_requested"
    SHARIAH_REVIEW_COMPLETED = "shariah_review_completed"
    
    # AI actions
    AI_EVALUATION_STARTED = "ai_evaluation_started"
    AI_EVALUATION_COMPLETED = "ai_evaluation_completed"
    AI_DECISION_MADE = "ai_decision_made"
    AI_OVERRIDE = "ai_override"
    
    # Bank actions
    BANK_APPROVAL_REQUESTED = "bank_approval_requested"
    BANK_APPROVED = "bank_approved"
    BANK_REJECTED = "bank_rejected"
    
    # Delivery actions
    DELIVERY_CREATED = "delivery_created"
    DELIVERY_STATUS_CHANGED = "delivery_status_changed"
    DELIVERY_CONFIRMED_BUYER = "delivery_confirmed_buyer"
    DELIVERY_CONFIRMED_PROVIDER = "delivery_confirmed_provider"
    
    # Dispute actions
    DISPUTE_CREATED = "dispute_created"
    DISPUTE_UPDATED = "dispute_updated"
    DISPUTE_RESOLVED = "dispute_resolved"
    
    # System actions
    SYSTEM_ERROR = "system_error"
    SYSTEM_OVERRIDE = "system_override"
    CONFIG_CHANGED = "config_changed"


class EntityType(str, enum.Enum):
    """Types of entities that can be audited"""
    USER = "user"
    ORDER = "order"
    ESCROW = "escrow"
    ESCROW_TRANSACTION = "escrow_transaction"
    DELIVERY = "delivery"
    PRODUCT = "product"
    SHARIAH_RESULT = "shariah_result"
    AI_DECISION = "ai_decision"
    DISPUTE = "dispute"
    SYSTEM = "system"


class ActorType(str, enum.Enum):
    """Types of actors performing actions"""
    USER = "user"
    SYSTEM = "system"
    AI = "ai"
    BANK = "bank"
    ADMIN = "admin"
    SCHEDULER = "scheduler"
    WEBHOOK = "webhook"


class AuditLog(BaseModel):
    """
    Immutable audit log entry.
    Records all significant actions for regulatory compliance.
    """
    __tablename__ = "audit_logs"
    
    # Action details
    action: Mapped[AuditAction] = mapped_column(
        SQLEnum(AuditAction),
        nullable=False,
        index=True,
    )
    
    # Entity being acted upon
    entity_type: Mapped[EntityType] = mapped_column(
        SQLEnum(EntityType),
        nullable=False,
    )
    entity_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), nullable=False)
    
    # Actor performing the action
    actor_type: Mapped[ActorType] = mapped_column(
        SQLEnum(ActorType),
        nullable=False,
    )
    actor_id: Mapped[Optional[uuid.UUID]] = mapped_column(UUID(as_uuid=True), nullable=True)
    actor_name: Mapped[Optional[str]] = mapped_column(String(255), nullable=True)
    
    # Change details
    old_values: Mapped[Optional[dict]] = mapped_column(
        JSONB,
        nullable=True,
        comment="Previous state before change"
    )
    new_values: Mapped[Optional[dict]] = mapped_column(
        JSONB,
        nullable=True,
        comment="New state after change"
    )
    changes: Mapped[Optional[dict]] = mapped_column(
        JSONB,
        nullable=True,
        comment="Summary of what changed"
    )
    
    # Description
    description: Mapped[str] = mapped_column(Text, nullable=False)
    
    # Context
    reason: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    correlation_id: Mapped[Optional[str]] = mapped_column(
        String(100),
        nullable=True,
        index=True,
        comment="Links related audit entries together"
    )
    
    # Request context
    request_id: Mapped[Optional[str]] = mapped_column(String(100), nullable=True)
    ip_address: Mapped[Optional[str]] = mapped_column(INET, nullable=True)
    user_agent: Mapped[Optional[str]] = mapped_column(String(500), nullable=True)
    
    # Related entities
    related_entities: Mapped[Optional[dict]] = mapped_column(
        JSONB,
        nullable=True,
        comment="References to related entities"
    )
    
    # Result
    success: Mapped[bool] = mapped_column(default=True, nullable=False)
    error_message: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    
    # Additional data
    audit_metadata: Mapped[Optional[dict]] = mapped_column(JSONB, nullable=True)
    
    # Indexes for efficient querying
    __table_args__ = (
        Index("ix_audit_logs_entity", "entity_type", "entity_id"),
        Index("ix_audit_logs_actor", "actor_type", "actor_id"),
        Index("ix_audit_logs_action_time", "action", "created_at"),
        Index("ix_audit_logs_created", "created_at"),
    )
    
    @classmethod
    def create_log(
        cls,
        action: AuditAction,
        entity_type: EntityType,
        entity_id: uuid.UUID,
        description: str,
        actor_type: ActorType = ActorType.SYSTEM,
        actor_id: Optional[uuid.UUID] = None,
        old_values: Optional[dict] = None,
        new_values: Optional[dict] = None,
        **kwargs
    ) -> "AuditLog":
        """Factory method to create audit log entry"""
        changes = None
        if old_values and new_values:
            changes = {
                k: {"old": old_values.get(k), "new": v}
                for k, v in new_values.items()
                if old_values.get(k) != v
            }
        
        return cls(
            action=action,
            entity_type=entity_type,
            entity_id=entity_id,
            description=description,
            actor_type=actor_type,
            actor_id=actor_id,
            old_values=old_values,
            new_values=new_values,
            changes=changes,
            **kwargs
        )
    
    def __repr__(self) -> str:
        return f"<AuditLog(id={self.id}, action={self.action}, entity={self.entity_type}:{self.entity_id})>"


class SystemLog(BaseModel):
    """
    System-level logging for operations, errors, and metrics.
    Separate from audit logs for different retention policies.
    """
    __tablename__ = "system_logs"
    
    # Log level
    level: Mapped[str] = mapped_column(String(20), nullable=False)  # DEBUG, INFO, WARNING, ERROR, CRITICAL
    
    # Source
    module: Mapped[str] = mapped_column(String(255), nullable=False)
    function: Mapped[Optional[str]] = mapped_column(String(255), nullable=True)
    
    # Message
    message: Mapped[str] = mapped_column(Text, nullable=False)
    
    # Context
    correlation_id: Mapped[Optional[str]] = mapped_column(String(100), nullable=True, index=True)
    request_id: Mapped[Optional[str]] = mapped_column(String(100), nullable=True)
    
    # Error details
    exception_type: Mapped[Optional[str]] = mapped_column(String(255), nullable=True)
    exception_message: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    stack_trace: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    
    # Data
    extra_data: Mapped[Optional[dict]] = mapped_column(JSONB, nullable=True)
    
    # Indexes
    __table_args__ = (
        Index("ix_system_logs_level", "level"),
        Index("ix_system_logs_module", "module"),
        Index("ix_system_logs_created", "created_at"),
    )
