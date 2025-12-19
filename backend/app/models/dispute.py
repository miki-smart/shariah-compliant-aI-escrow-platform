"""
Dispute Model
Handles dispute resolution between parties
"""
from sqlalchemy import Column, String, Text, Numeric, Boolean, Index, ForeignKey
from sqlalchemy import Enum as SQLEnum
from sqlalchemy.dialects.postgresql import UUID, JSONB, ARRAY
from sqlalchemy.orm import Mapped, mapped_column, relationship
from typing import Optional, List, TYPE_CHECKING
import uuid
import enum
from decimal import Decimal
from datetime import datetime, timezone

from app.models.base import BaseModel, AuditMixin

if TYPE_CHECKING:
    from app.models.order import Order


class DisputeStatus(str, enum.Enum):
    """Dispute lifecycle status"""
    OPENED = "opened"
    UNDER_REVIEW = "under_review"
    AWAITING_RESPONSE = "awaiting_response"
    AWAITING_EVIDENCE = "awaiting_evidence"
    IN_MEDIATION = "in_mediation"
    RESOLVED = "resolved"
    ESCALATED = "escalated"
    CLOSED = "closed"
    CANCELLED = "cancelled"


class DisputeType(str, enum.Enum):
    """Types of disputes"""
    NON_DELIVERY = "non_delivery"
    WRONG_ITEM = "wrong_item"
    DAMAGED_ITEM = "damaged_item"
    QUALITY_ISSUE = "quality_issue"
    QUANTITY_MISMATCH = "quantity_mismatch"
    LATE_DELIVERY = "late_delivery"
    SHARIAH_VIOLATION = "shariah_violation"
    FRAUD = "fraud"
    PAYMENT_ISSUE = "payment_issue"
    OTHER = "other"


class DisputeResolution(str, enum.Enum):
    """Resolution outcomes"""
    BUYER_FAVOR = "buyer_favor"  # Full refund to buyer
    SELLER_FAVOR = "seller_favor"  # Release to seller
    PARTIAL_REFUND = "partial_refund"  # Partial refund to buyer
    MUTUAL_AGREEMENT = "mutual_agreement"  # Both parties agreed
    ESCALATED_EXTERNAL = "escalated_external"  # Sent to external arbitration
    NO_RESOLUTION = "no_resolution"  # Unable to resolve


class DisputeParty(str, enum.Enum):
    """Party types in dispute"""
    BUYER = "buyer"
    SELLER = "seller"
    BANK = "bank"
    PLATFORM = "platform"


class Dispute(BaseModel, AuditMixin):
    """
    Dispute record for order issues.
    Manages the dispute resolution process.
    """
    __tablename__ = "disputes"
    
    # Link to order
    order_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("orders.id"),
        nullable=False,
        index=True,
    )
    
    # Dispute reference
    dispute_number: Mapped[str] = mapped_column(
        String(50),
        unique=True,
        nullable=False,
    )
    
    # Initiator
    initiator_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        nullable=False,
        index=True,
    )
    initiator_type: Mapped[DisputeParty] = mapped_column(
        SQLEnum(DisputeParty),
        nullable=False,
    )
    
    # Respondent
    respondent_id: Mapped[Optional[uuid.UUID]] = mapped_column(
        UUID(as_uuid=True),
        nullable=True,
    )
    respondent_type: Mapped[Optional[DisputeParty]] = mapped_column(
        SQLEnum(DisputeParty),
        nullable=True,
    )
    
    # Dispute details
    dispute_type: Mapped[DisputeType] = mapped_column(
        SQLEnum(DisputeType),
        nullable=False,
    )
    status: Mapped[DisputeStatus] = mapped_column(
        SQLEnum(DisputeStatus),
        nullable=False,
        default=DisputeStatus.OPENED,
    )
    
    # Description
    title: Mapped[str] = mapped_column(String(255), nullable=False)
    description: Mapped[str] = mapped_column(Text, nullable=False)
    
    # Amount in dispute
    disputed_amount: Mapped[Decimal] = mapped_column(Numeric(18, 4), nullable=False)
    currency: Mapped[str] = mapped_column(String(3), default="MYR", nullable=False)
    
    # Evidence
    evidence: Mapped[Optional[List[dict]]] = mapped_column(
        JSONB,
        nullable=True,
        comment="List of evidence items with type, url, description"
    )
    
    # Priority
    priority: Mapped[str] = mapped_column(String(20), default="medium", nullable=False)  # low, medium, high, urgent
    
    # Resolution
    resolution: Mapped[Optional[DisputeResolution]] = mapped_column(
        SQLEnum(DisputeResolution),
        nullable=True,
    )
    resolution_amount: Mapped[Optional[Decimal]] = mapped_column(Numeric(18, 4), nullable=True)
    resolution_notes: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    resolved_by: Mapped[Optional[uuid.UUID]] = mapped_column(UUID(as_uuid=True), nullable=True)
    resolved_at: Mapped[Optional[datetime]] = mapped_column(nullable=True)
    
    # Assignment
    assigned_to: Mapped[Optional[uuid.UUID]] = mapped_column(UUID(as_uuid=True), nullable=True)
    assigned_at: Mapped[Optional[datetime]] = mapped_column(nullable=True)
    
    # Deadlines
    response_deadline: Mapped[Optional[datetime]] = mapped_column(nullable=True)
    resolution_deadline: Mapped[Optional[datetime]] = mapped_column(nullable=True)
    
    # Escalation
    is_escalated: Mapped[bool] = mapped_column(default=False, nullable=False)
    escalated_at: Mapped[Optional[datetime]] = mapped_column(nullable=True)
    escalation_reason: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    
    # Additional data
    dispute_metadata: Mapped[Optional[dict]] = mapped_column(JSONB, nullable=True)
    
    # Relationships
    order: Mapped["Order"] = relationship("Order", back_populates="disputes")
    messages: Mapped[List["DisputeMessage"]] = relationship(
        "DisputeMessage",
        back_populates="dispute",
        lazy="selectin",
        order_by="DisputeMessage.created_at",
    )
    
    # Indexes
    __table_args__ = (
        Index("ix_disputes_order_status", "order_id", "status"),
        Index("ix_disputes_initiator", "initiator_id"),
        Index("ix_disputes_status", "status"),
        Index("ix_disputes_assigned", "assigned_to", "status"),
    )
    
    @property
    def is_open(self) -> bool:
        """Check if dispute is still open"""
        closed_statuses = [DisputeStatus.RESOLVED, DisputeStatus.CLOSED, DisputeStatus.CANCELLED]
        return self.status not in closed_statuses
    
    @property
    def is_resolved(self) -> bool:
        return self.status == DisputeStatus.RESOLVED
    
    @property
    def days_open(self) -> int:
        """Calculate days since dispute opened"""
        if self.resolved_at:
            delta = self.resolved_at - self.created_at
        else:
            delta = datetime.now(timezone.utc) - self.created_at
        return delta.days
    
    def transition_to(self, new_status: DisputeStatus) -> None:
        """Update dispute status"""
        self.status = new_status
    
    def resolve(
        self,
        resolution: DisputeResolution,
        amount: Optional[Decimal],
        notes: str,
        resolver_id: uuid.UUID
    ) -> None:
        """Resolve the dispute"""
        self.status = DisputeStatus.RESOLVED
        self.resolution = resolution
        self.resolution_amount = amount
        self.resolution_notes = notes
        self.resolved_by = resolver_id
        self.resolved_at = datetime.now(timezone.utc)
    
    def escalate(self, reason: str) -> None:
        """Escalate the dispute"""
        self.status = DisputeStatus.ESCALATED
        self.is_escalated = True
        self.escalated_at = datetime.now(timezone.utc)
        self.escalation_reason = reason
    
    def add_evidence(self, evidence_type: str, url: str, description: str) -> None:
        """Add evidence to dispute"""
        if self.evidence is None:
            self.evidence = []
        self.evidence.append({
            "type": evidence_type,
            "url": url,
            "description": description,
            "added_at": datetime.now(timezone.utc).isoformat(),
        })
    
    def __repr__(self) -> str:
        return f"<Dispute(id={self.id}, order_id={self.order_id}, status={self.status})>"


class DisputeMessage(BaseModel):
    """
    Messages/communications within a dispute.
    Tracks all communication between parties.
    """
    __tablename__ = "dispute_messages"
    
    dispute_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("disputes.id"),
        nullable=False,
        index=True,
    )
    
    # Sender
    sender_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), nullable=False)
    sender_type: Mapped[DisputeParty] = mapped_column(
        SQLEnum(DisputeParty),
        nullable=False,
    )
    sender_name: Mapped[str] = mapped_column(String(255), nullable=False)
    
    # Message
    message_type: Mapped[str] = mapped_column(
        String(50),
        default="message",
        nullable=False,
    )  # message, response, decision, system
    content: Mapped[str] = mapped_column(Text, nullable=False)
    
    # Attachments
    attachments: Mapped[Optional[List[dict]]] = mapped_column(JSONB, nullable=True)
    
    # Read status
    is_read: Mapped[bool] = mapped_column(default=False, nullable=False)
    read_at: Mapped[Optional[datetime]] = mapped_column(nullable=True)
    
    # Visibility
    is_internal: Mapped[bool] = mapped_column(default=False, nullable=False)
    visible_to: Mapped[Optional[List[str]]] = mapped_column(ARRAY(String), nullable=True)
    
    # Relationships
    dispute: Mapped["Dispute"] = relationship("Dispute", back_populates="messages")
    
    __table_args__ = (
        Index("ix_dispute_messages_dispute", "dispute_id", "created_at"),
    )


class DisputeTimeline(BaseModel):
    """
    Timeline events for dispute tracking.
    Immutable record of all dispute activities.
    """
    __tablename__ = "dispute_timeline"
    
    dispute_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("disputes.id"),
        nullable=False,
        index=True,
    )
    
    # Event details
    event_type: Mapped[str] = mapped_column(String(50), nullable=False)
    event_description: Mapped[str] = mapped_column(Text, nullable=False)
    
    # Actor
    actor_id: Mapped[Optional[uuid.UUID]] = mapped_column(UUID(as_uuid=True), nullable=True)
    actor_type: Mapped[str] = mapped_column(String(50), nullable=False)  # user, system, ai
    
    # State change
    from_status: Mapped[Optional[str]] = mapped_column(String(50), nullable=True)
    to_status: Mapped[Optional[str]] = mapped_column(String(50), nullable=True)
    
    # Additional data
    timeline_metadata: Mapped[Optional[dict]] = mapped_column(JSONB, nullable=True)
    
    __table_args__ = (
        Index("ix_dispute_timeline_dispute", "dispute_id", "created_at"),
    )
