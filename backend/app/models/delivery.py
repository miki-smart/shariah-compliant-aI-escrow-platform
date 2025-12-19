"""
Delivery Model
Delivery tracking with dual confirmation support (buyer + delivery provider)
"""
from sqlalchemy import Column, String, Text, Numeric, Boolean, Index, ForeignKey
from sqlalchemy import Enum as SQLEnum
from sqlalchemy.dialects.postgresql import UUID, JSONB
from sqlalchemy.orm import Mapped, mapped_column, relationship
from typing import Optional, List, TYPE_CHECKING
import uuid
import enum
from decimal import Decimal
from datetime import datetime, timezone

from app.models.base import BaseModel, AuditMixin

if TYPE_CHECKING:
    from app.models.order import Order


class DeliveryStatus(str, enum.Enum):
    """Delivery lifecycle status"""
    PENDING = "pending"  # Awaiting pickup
    PICKED_UP = "picked_up"  # Collected from seller
    IN_TRANSIT = "in_transit"  # On the way
    OUT_FOR_DELIVERY = "out_for_delivery"  # Last mile
    DELIVERED = "delivered"  # Delivered to buyer
    DELIVERY_FAILED = "delivery_failed"  # Failed attempt
    RETURNED = "returned"  # Returned to seller
    CANCELLED = "cancelled"  # Cancelled


class ConfirmationType(str, enum.Enum):
    """Type of delivery confirmation"""
    BUYER = "buyer"
    PROVIDER = "provider"
    SELLER = "seller"
    SYSTEM = "system"


class DeliveryIssueType(str, enum.Enum):
    """Types of delivery issues"""
    NOT_DELIVERED = "not_delivered"
    WRONG_ITEM = "wrong_item"
    DAMAGED = "damaged"
    PARTIAL_DELIVERY = "partial_delivery"
    WRONG_ADDRESS = "wrong_address"
    RECIPIENT_UNAVAILABLE = "recipient_unavailable"
    OTHER = "other"


class Delivery(BaseModel, AuditMixin):
    """
    Delivery tracking for an order.
    Supports dual confirmation (buyer + provider).
    """
    __tablename__ = "deliveries"
    
    # Link to order (one-to-one)
    order_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("orders.id"),
        unique=True,
        nullable=False,
        index=True,
    )
    
    # Delivery provider
    provider_id: Mapped[Optional[uuid.UUID]] = mapped_column(
        UUID(as_uuid=True),
        nullable=True,
        index=True,
    )
    provider_name: Mapped[Optional[str]] = mapped_column(String(255), nullable=True)
    
    # Tracking
    tracking_number: Mapped[Optional[str]] = mapped_column(
        String(100),
        unique=True,
        nullable=True,
        index=True,
    )
    tracking_url: Mapped[Optional[str]] = mapped_column(String(500), nullable=True)
    
    # Status
    status: Mapped[DeliveryStatus] = mapped_column(
        SQLEnum(DeliveryStatus),
        nullable=False,
        default=DeliveryStatus.PENDING,
    )
    
    # Addresses
    pickup_address: Mapped[Optional[dict]] = mapped_column(JSONB, nullable=True)
    delivery_address: Mapped[dict] = mapped_column(JSONB, nullable=False)
    
    # Dates
    estimated_pickup_date: Mapped[Optional[datetime]] = mapped_column(nullable=True)
    actual_pickup_date: Mapped[Optional[datetime]] = mapped_column(nullable=True)
    estimated_delivery_date: Mapped[Optional[datetime]] = mapped_column(nullable=True)
    actual_delivery_date: Mapped[Optional[datetime]] = mapped_column(nullable=True)
    
    # Confirmations
    buyer_confirmed: Mapped[bool] = mapped_column(default=False, nullable=False)
    buyer_confirmed_at: Mapped[Optional[datetime]] = mapped_column(nullable=True)
    buyer_confirmation_notes: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    
    provider_confirmed: Mapped[bool] = mapped_column(default=False, nullable=False)
    provider_confirmed_at: Mapped[Optional[datetime]] = mapped_column(nullable=True)
    provider_confirmation_reference: Mapped[Optional[str]] = mapped_column(String(100), nullable=True)
    provider_confirmation_data: Mapped[Optional[dict]] = mapped_column(JSONB, nullable=True)
    
    # Proof of delivery
    delivery_proof: Mapped[Optional[dict]] = mapped_column(
        JSONB,
        nullable=True,
        comment="POD data: signature, photo, recipient name"
    )
    
    # Issues
    has_issue: Mapped[bool] = mapped_column(default=False, nullable=False)
    issue_type: Mapped[Optional[DeliveryIssueType]] = mapped_column(
        SQLEnum(DeliveryIssueType),
        nullable=True,
    )
    issue_description: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    issue_reported_at: Mapped[Optional[datetime]] = mapped_column(nullable=True)
    
    # Package details
    package_weight: Mapped[Optional[float]] = mapped_column(nullable=True)
    package_dimensions: Mapped[Optional[dict]] = mapped_column(JSONB, nullable=True)
    package_count: Mapped[int] = mapped_column(default=1, nullable=False)
    
    # Cost
    shipping_cost: Mapped[Decimal] = mapped_column(
        Numeric(18, 4),
        default=Decimal("0"),
        nullable=False,
    )
    insurance_amount: Mapped[Decimal] = mapped_column(
        Numeric(18, 4),
        default=Decimal("0"),
        nullable=False,
    )
    
    # Instructions
    delivery_instructions: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    
    # AI validation
    ai_validation_status: Mapped[Optional[str]] = mapped_column(String(50), nullable=True)
    ai_validation_score: Mapped[Optional[float]] = mapped_column(nullable=True)
    ai_validation_notes: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    ai_validated_at: Mapped[Optional[datetime]] = mapped_column(nullable=True)
    
    # Additional data
    delivery_metadata: Mapped[Optional[dict]] = mapped_column(JSONB, nullable=True)
    
    # Relationships
    order: Mapped["Order"] = relationship("Order", back_populates="delivery")
    tracking_events: Mapped[List["DeliveryTrackingEvent"]] = relationship(
        "DeliveryTrackingEvent",
        back_populates="delivery",
        lazy="selectin",
        order_by="DeliveryTrackingEvent.event_timestamp.desc()",
    )
    confirmations: Mapped[List["DeliveryConfirmation"]] = relationship(
        "DeliveryConfirmation",
        back_populates="delivery",
        lazy="selectin",
    )
    
    # Indexes
    __table_args__ = (
        Index("ix_deliveries_status", "status"),
        Index("ix_deliveries_provider", "provider_id", "status"),
    )
    
    @property
    def is_confirmed(self) -> bool:
        """Check if delivery is confirmed by buyer"""
        return self.buyer_confirmed
    
    @property
    def is_dual_confirmed(self) -> bool:
        """Check if both buyer and provider confirmed"""
        return self.buyer_confirmed and self.provider_confirmed
    
    @property
    def confirmations_match(self) -> bool:
        """Check if buyer and provider confirmations match"""
        if not self.is_dual_confirmed:
            return False
        # Both confirmed delivery - basic match
        return True
    
    def confirm_by_buyer(self, notes: Optional[str] = None) -> None:
        """Record buyer confirmation"""
        self.buyer_confirmed = True
        self.buyer_confirmed_at = datetime.now(timezone.utc)
        self.buyer_confirmation_notes = notes
        if self.status != DeliveryStatus.DELIVERED:
            self.status = DeliveryStatus.DELIVERED
            self.actual_delivery_date = datetime.now(timezone.utc)
    
    def confirm_by_provider(
        self,
        reference: Optional[str] = None,
        data: Optional[dict] = None
    ) -> None:
        """Record provider confirmation"""
        self.provider_confirmed = True
        self.provider_confirmed_at = datetime.now(timezone.utc)
        self.provider_confirmation_reference = reference
        self.provider_confirmation_data = data
    
    def report_issue(
        self,
        issue_type: DeliveryIssueType,
        description: str
    ) -> None:
        """Report a delivery issue"""
        self.has_issue = True
        self.issue_type = issue_type
        self.issue_description = description
        self.issue_reported_at = datetime.now(timezone.utc)
    
    def __repr__(self) -> str:
        return f"<Delivery(id={self.id}, order_id={self.order_id}, status={self.status})>"


class DeliveryTrackingEvent(BaseModel):
    """
    Individual tracking events for a delivery.
    Sourced from delivery provider APIs or manual updates.
    """
    __tablename__ = "delivery_tracking_events"
    
    delivery_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("deliveries.id"),
        nullable=False,
        index=True,
    )
    
    # Event details
    event_type: Mapped[str] = mapped_column(String(50), nullable=False)
    event_status: Mapped[str] = mapped_column(String(50), nullable=False)
    event_description: Mapped[str] = mapped_column(Text, nullable=False)
    event_timestamp: Mapped[datetime] = mapped_column(nullable=False)
    
    # Location
    location: Mapped[Optional[str]] = mapped_column(String(255), nullable=True)
    location_coordinates: Mapped[Optional[dict]] = mapped_column(JSONB, nullable=True)
    
    # Source
    source: Mapped[str] = mapped_column(String(50), default="provider", nullable=False)  # provider, system, user
    external_event_id: Mapped[Optional[str]] = mapped_column(String(100), nullable=True)
    
    # Raw data
    raw_data: Mapped[Optional[dict]] = mapped_column(JSONB, nullable=True)
    
    # Relationships
    delivery: Mapped["Delivery"] = relationship("Delivery", back_populates="tracking_events")
    
    __table_args__ = (
        Index("ix_tracking_events_delivery_time", "delivery_id", "event_timestamp"),
    )


class DeliveryConfirmation(BaseModel):
    """
    Delivery confirmations from different parties.
    Supports multiple confirmation sources for validation.
    """
    __tablename__ = "delivery_confirmations"
    
    delivery_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("deliveries.id"),
        nullable=False,
        index=True,
    )
    
    # Confirmation details
    confirmation_type: Mapped[ConfirmationType] = mapped_column(
        SQLEnum(ConfirmationType),
        nullable=False,
    )
    confirmed_by: Mapped[Optional[uuid.UUID]] = mapped_column(UUID(as_uuid=True), nullable=True)
    confirmed_at: Mapped[datetime] = mapped_column(
        default=lambda: datetime.now(timezone.utc),
        nullable=False,
    )
    
    # Confirmation data
    confirmation_reference: Mapped[Optional[str]] = mapped_column(String(100), nullable=True)
    notes: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    
    # Evidence
    signature_data: Mapped[Optional[str]] = mapped_column(Text, nullable=True)  # Base64 encoded
    photo_urls: Mapped[Optional[List[str]]] = mapped_column(JSONB, nullable=True)
    recipient_name: Mapped[Optional[str]] = mapped_column(String(255), nullable=True)
    recipient_id: Mapped[Optional[str]] = mapped_column(String(100), nullable=True)
    
    # Verification
    is_verified: Mapped[bool] = mapped_column(default=False, nullable=False)
    verification_method: Mapped[Optional[str]] = mapped_column(String(50), nullable=True)
    
    # Metadata
    device_info: Mapped[Optional[dict]] = mapped_column(JSONB, nullable=True)
    location: Mapped[Optional[dict]] = mapped_column(JSONB, nullable=True)
    
    # Relationships
    delivery: Mapped["Delivery"] = relationship("Delivery", back_populates="confirmations")
    
    __table_args__ = (
        Index("ix_delivery_confirmations_type", "delivery_id", "confirmation_type"),
    )
