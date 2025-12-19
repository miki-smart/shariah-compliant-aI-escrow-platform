"""
Order Model
Trade orders with state machine for lifecycle management
"""
from sqlalchemy import Column, String, Text, Numeric, Boolean, Index, ForeignKey, CheckConstraint, DateTime
from sqlalchemy import Enum as SQLEnum
from sqlalchemy.dialects.postgresql import UUID, JSONB
from sqlalchemy.orm import Mapped, mapped_column, relationship, validates
from typing import Optional, List, TYPE_CHECKING
import uuid
import enum
from decimal import Decimal
from datetime import datetime, timezone

from app.models.base import BaseModel, AuditMixin, VersionedMixin

if TYPE_CHECKING:
    from app.models.user import User
    from app.models.product import Product
    from app.models.escrow import Escrow
    from app.models.delivery import Delivery
    from app.models.shariah_result import ShariahResult
    from app.models.ai_decision import AIDecision
    from app.models.dispute import Dispute


class OrderStatus(str, enum.Enum):
    """Order lifecycle status - follows strict state machine"""
    # Initial states
    CREATED = "created"  # Order placed, awaiting validation
    
    # Validation states
    SHARIAH_VALIDATED = "shariah_validated"  # Passed Shariah compliance
    AI_EVALUATED = "ai_evaluated"  # AI risk assessment complete
    PENDING_BANK_APPROVAL = "pending_bank_approval"  # Awaiting bank decision
    
    # Funding states
    BANK_APPROVED = "bank_approved"  # Bank approved financing
    FUNDED = "funded"  # Escrow locked with funds
    
    # Fulfillment states
    PROCESSING = "processing"  # Seller preparing order
    IN_TRANSIT = "in_transit"  # With delivery provider
    
    # Delivery states
    DELIVERED = "delivered"  # Buyer confirmed delivery
    DELIVERY_VERIFIED = "delivery_verified"  # AI validated delivery
    
    # Final states
    SETTLED = "settled"  # Payment released to seller
    COMPLETED = "completed"  # Transaction fully complete
    
    # Exception states
    CANCELLED = "cancelled"  # Order cancelled
    REFUNDED = "refunded"  # Funds returned to buyer/bank
    DISPUTED = "disputed"  # Under dispute resolution
    BLOCKED = "blocked"  # Blocked due to compliance/fraud
    FROZEN = "frozen"  # Escrow frozen pending resolution


class ShariahStatus(str, enum.Enum):
    """Shariah compliance status"""
    PENDING = "pending"
    COMPLIANT = "compliant"
    NON_COMPLIANT = "non_compliant"
    REQUIRES_REVIEW = "requires_review"
    VIOLATION_DETECTED = "violation_detected"


class AIApprovalStatus(str, enum.Enum):
    """AI governance approval status"""
    PENDING = "pending"
    APPROVED = "approved"
    REJECTED = "rejected"
    PENDING_REVIEW = "pending_review"
    FLAGGED = "flagged"


class BankApprovalStatus(str, enum.Enum):
    """Bank financing approval status"""
    NOT_REQUESTED = "not_requested"
    PENDING = "pending"
    APPROVED = "approved"
    REJECTED = "rejected"
    REQUIRES_INFO = "requires_info"


class ContractType(str, enum.Enum):
    """Islamic contract types for transactions"""
    MURABAHA = "murabaha"  # Cost-plus financing
    SALAM = "salam"  # Forward sale
    ISTISNA = "istisna"  # Manufacturing contract
    MUSAWAMAH = "musawamah"  # Negotiated sale
    CASH = "cash"  # Direct cash payment


class OwnershipStatus(str, enum.Enum):
    """Goods ownership status"""
    SELLER = "seller"  # Seller owns goods
    IN_TRANSIT = "in_transit"  # Ownership transferring
    BUYER = "buyer"  # Buyer owns goods (after delivery)


# Valid state transitions
VALID_ORDER_TRANSITIONS = {
    OrderStatus.CREATED: [OrderStatus.SHARIAH_VALIDATED, OrderStatus.BLOCKED, OrderStatus.CANCELLED],
    OrderStatus.SHARIAH_VALIDATED: [OrderStatus.AI_EVALUATED, OrderStatus.BLOCKED, OrderStatus.CANCELLED],
    OrderStatus.AI_EVALUATED: [OrderStatus.PENDING_BANK_APPROVAL, OrderStatus.BLOCKED, OrderStatus.CANCELLED],
    OrderStatus.PENDING_BANK_APPROVAL: [OrderStatus.BANK_APPROVED, OrderStatus.CANCELLED, OrderStatus.BLOCKED],
    OrderStatus.BANK_APPROVED: [OrderStatus.FUNDED, OrderStatus.CANCELLED],
    OrderStatus.FUNDED: [OrderStatus.PROCESSING, OrderStatus.CANCELLED, OrderStatus.REFUNDED, OrderStatus.FROZEN],
    OrderStatus.PROCESSING: [OrderStatus.IN_TRANSIT, OrderStatus.CANCELLED, OrderStatus.FROZEN],
    OrderStatus.IN_TRANSIT: [OrderStatus.DELIVERED, OrderStatus.DISPUTED, OrderStatus.FROZEN],
    OrderStatus.DELIVERED: [OrderStatus.DELIVERY_VERIFIED, OrderStatus.DISPUTED, OrderStatus.FROZEN],
    OrderStatus.DELIVERY_VERIFIED: [OrderStatus.SETTLED, OrderStatus.DISPUTED, OrderStatus.FROZEN],
    OrderStatus.SETTLED: [OrderStatus.COMPLETED, OrderStatus.DISPUTED],
    OrderStatus.DISPUTED: [OrderStatus.FROZEN, OrderStatus.REFUNDED, OrderStatus.SETTLED],
    OrderStatus.FROZEN: [OrderStatus.REFUNDED, OrderStatus.SETTLED, OrderStatus.CANCELLED],
    # Terminal states
    OrderStatus.COMPLETED: [],
    OrderStatus.CANCELLED: [],
    OrderStatus.REFUNDED: [],
    OrderStatus.BLOCKED: [OrderStatus.CANCELLED],
}


class Order(BaseModel, AuditMixin, VersionedMixin):
    """
    Order model representing a trade transaction.
    Implements state machine for lifecycle management.
    """
    __tablename__ = "orders"
    
    # Reference number
    order_number: Mapped[str] = mapped_column(
        String(50),
        unique=True,
        nullable=False,
        index=True,
    )
    
    # Parties
    buyer_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("users.id"),
        nullable=False,
        index=True,
    )
    seller_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("users.id"),
        nullable=False,
        index=True,
    )
    bank_id: Mapped[Optional[uuid.UUID]] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("users.id"),
        nullable=True,
    )
    
    # Product
    product_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("products.id"),
        nullable=False,
        index=True,
    )
    quantity: Mapped[Decimal] = mapped_column(Numeric(18, 4), nullable=False)
    unit_price: Mapped[Decimal] = mapped_column(Numeric(18, 4), nullable=False)
    
    # Amounts
    total_amount: Mapped[Decimal] = mapped_column(Numeric(18, 4), nullable=False)
    buyer_down_payment: Mapped[Decimal] = mapped_column(
        Numeric(18, 4),
        default=Decimal("0"),
        nullable=False,
    )
    bank_financing_amount: Mapped[Decimal] = mapped_column(
        Numeric(18, 4),
        default=Decimal("0"),
        nullable=False,
    )
    currency: Mapped[str] = mapped_column(String(3), default="MYR", nullable=False)
    
    # Status fields
    status: Mapped[OrderStatus] = mapped_column(
        SQLEnum(OrderStatus),
        nullable=False,
        default=OrderStatus.CREATED,
        index=True,
    )
    previous_status: Mapped[Optional[str]] = mapped_column(String(50), nullable=True)
    
    # Compliance status
    shariah_status: Mapped[ShariahStatus] = mapped_column(
        SQLEnum(ShariahStatus),
        nullable=False,
        default=ShariahStatus.PENDING,
    )
    ai_approval_status: Mapped[AIApprovalStatus] = mapped_column(
        SQLEnum(AIApprovalStatus),
        nullable=False,
        default=AIApprovalStatus.PENDING,
    )
    bank_approval_status: Mapped[BankApprovalStatus] = mapped_column(
        SQLEnum(BankApprovalStatus),
        nullable=False,
        default=BankApprovalStatus.NOT_REQUESTED,
    )
    
    # Contract info
    contract_type: Mapped[ContractType] = mapped_column(
        SQLEnum(ContractType),
        nullable=False,
        default=ContractType.MURABAHA,
    )
    financing_requested: Mapped[bool] = mapped_column(default=False, nullable=False)
    
    # Ownership
    ownership_status: Mapped[OwnershipStatus] = mapped_column(
        SQLEnum(OwnershipStatus),
        nullable=False,
        default=OwnershipStatus.SELLER,
    )
    
    # Delivery info
    delivery_address: Mapped[Optional[dict]] = mapped_column(JSONB, nullable=True)
    delivery_terms: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    expected_delivery_date: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True), nullable=True)
    actual_delivery_date: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True), nullable=True)
    
    # Confirmation timestamps
    buyer_confirmed_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True), nullable=True)
    seller_confirmed_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True), nullable=True)
    provider_confirmed_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True), nullable=True)
    
    # Key timestamps
    shariah_validated_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True), nullable=True)
    ai_evaluated_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True), nullable=True)
    bank_approved_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True), nullable=True)
    escrow_locked_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True), nullable=True)
    escrow_released_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True), nullable=True)
    settled_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True), nullable=True)
    
    # Notes
    notes: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    cancellation_reason: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    
    # Additional data
    order_metadata: Mapped[Optional[dict]] = mapped_column(JSONB, nullable=True)
    
    # Relationships
    buyer: Mapped["User"] = relationship(
        "User",
        foreign_keys=[buyer_id],
        back_populates="orders_as_buyer",
    )
    seller: Mapped["User"] = relationship(
        "User",
        foreign_keys=[seller_id],
        back_populates="orders_as_seller",
    )
    product: Mapped["Product"] = relationship("Product", back_populates="orders")
    escrow: Mapped[Optional["Escrow"]] = relationship(
        "Escrow",
        back_populates="order",
        uselist=False,
    )
    delivery: Mapped[Optional["Delivery"]] = relationship(
        "Delivery",
        back_populates="order",
        uselist=False,
    )
    shariah_result: Mapped[Optional["ShariahResult"]] = relationship(
        "ShariahResult",
        back_populates="order",
        uselist=False,
    )
    ai_decision: Mapped[Optional["AIDecision"]] = relationship(
        "AIDecision",
        back_populates="order",
        uselist=False,
    )
    disputes: Mapped[List["Dispute"]] = relationship(
        "Dispute",
        back_populates="order",
        lazy="selectin",
    )
    
    # Indexes
    __table_args__ = (
        Index("ix_orders_buyer_status", "buyer_id", "status"),
        Index("ix_orders_seller_status", "seller_id", "status"),
        Index("ix_orders_status_created", "status", "created_at"),
        Index("ix_orders_shariah_ai", "shariah_status", "ai_approval_status"),
        CheckConstraint("quantity > 0", name="ck_orders_quantity_positive"),
        CheckConstraint("total_amount >= 0", name="ck_orders_amount_non_negative"),
    )
    
    def can_transition_to(self, new_status: OrderStatus) -> bool:
        """Check if transition to new status is valid"""
        allowed_transitions = VALID_ORDER_TRANSITIONS.get(self.status, [])
        return new_status in allowed_transitions
    
    def transition_to(self, new_status: OrderStatus, reason: Optional[str] = None) -> bool:
        """
        Transition order to new status if valid.
        Returns True if successful, False otherwise.
        """
        if not self.can_transition_to(new_status):
            return False
        
        self.previous_status = self.status.value
        self.status = new_status
        
        # Set relevant timestamp
        now = datetime.now(timezone.utc)
        if new_status == OrderStatus.SHARIAH_VALIDATED:
            self.shariah_validated_at = now
        elif new_status == OrderStatus.AI_EVALUATED:
            self.ai_evaluated_at = now
        elif new_status == OrderStatus.BANK_APPROVED:
            self.bank_approved_at = now
        elif new_status == OrderStatus.FUNDED:
            self.escrow_locked_at = now
        elif new_status == OrderStatus.DELIVERED:
            self.actual_delivery_date = now
            self.buyer_confirmed_at = now
        elif new_status == OrderStatus.SETTLED:
            self.escrow_released_at = now
            self.settled_at = now
        elif new_status == OrderStatus.CANCELLED:
            self.cancellation_reason = reason
        
        return True
    
    @property
    def is_active(self) -> bool:
        """Check if order is in an active (non-terminal) state"""
        terminal_states = [
            OrderStatus.COMPLETED,
            OrderStatus.CANCELLED,
            OrderStatus.REFUNDED,
        ]
        return self.status not in terminal_states
    
    @property
    def can_be_cancelled(self) -> bool:
        """Check if order can be cancelled"""
        non_cancellable = [
            OrderStatus.SETTLED,
            OrderStatus.COMPLETED,
            OrderStatus.CANCELLED,
            OrderStatus.REFUNDED,
        ]
        return self.status not in non_cancellable
    
    @property
    def is_delivery_confirmed(self) -> bool:
        """Check if delivery has been confirmed by buyer"""
        return self.buyer_confirmed_at is not None
    
    @property
    def is_fully_confirmed(self) -> bool:
        """Check if all parties have confirmed (buyer + delivery provider)"""
        return (
            self.buyer_confirmed_at is not None
            and self.provider_confirmed_at is not None
        )
    
    @property
    def release_conditions_met(self) -> bool:
        """Check if all conditions for escrow release are met"""
        return (
            self.shariah_status == ShariahStatus.COMPLIANT
            and self.ai_approval_status == AIApprovalStatus.APPROVED
            and self.is_fully_confirmed
            and self.status == OrderStatus.DELIVERY_VERIFIED
        )
    
    @validates("quantity")
    def validate_quantity(self, key, value):
        if value <= 0:
            raise ValueError("Quantity must be positive")
        return value
    
    def __repr__(self) -> str:
        return f"<Order(id={self.id}, number={self.order_number}, status={self.status})>"


class OrderStatusHistory(BaseModel):
    """
    Audit trail for order status changes.
    Immutable record of all transitions.
    """
    __tablename__ = "order_status_history"
    
    order_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("orders.id"),
        nullable=False,
        index=True,
    )
    
    from_status: Mapped[Optional[str]] = mapped_column(String(50), nullable=True)
    to_status: Mapped[str] = mapped_column(String(50), nullable=False)
    
    changed_by: Mapped[Optional[uuid.UUID]] = mapped_column(UUID(as_uuid=True), nullable=True)
    reason: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    
    # Context
    trigger_type: Mapped[str] = mapped_column(String(50), nullable=False)  # user, system, ai, bank
    trigger_details: Mapped[Optional[dict]] = mapped_column(JSONB, nullable=True)
    
    __table_args__ = (
        Index("ix_order_status_history_order", "order_id", "created_at"),
    )
