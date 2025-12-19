"""
Escrow Model
Manages escrow accounts and transaction tracking
"""
from sqlalchemy import Column, String, Text, Numeric, Boolean, Index, ForeignKey, CheckConstraint
from sqlalchemy import Enum as SQLEnum
from sqlalchemy.dialects.postgresql import UUID, JSONB
from sqlalchemy.orm import Mapped, mapped_column, relationship
from typing import Optional, List, TYPE_CHECKING
import uuid
import enum
from decimal import Decimal
from datetime import datetime, timezone

from app.models.base import BaseModel, AuditMixin, VersionedMixin

if TYPE_CHECKING:
    from app.models.order import Order


class EscrowStatus(str, enum.Enum):
    """Escrow account status"""
    PENDING = "pending"  # Created but not yet funded
    LOCKED = "locked"  # Funds secured
    FROZEN = "frozen"  # Dispute/delivery failure
    RELEASED = "released"  # Funds sent to seller
    REVERTED = "reverted"  # Funds returned to bank/buyer
    PARTIALLY_RELEASED = "partially_released"  # Partial release (rare cases)


class TransactionType(str, enum.Enum):
    """Type of escrow transaction"""
    BANK_DEPOSIT = "bank_deposit"  # Bank financing locked
    BUYER_DEPOSIT = "buyer_deposit"  # Buyer down payment
    RELEASE_TO_SELLER = "release_to_seller"  # Payment to seller
    REFUND_TO_BUYER = "refund_to_buyer"  # Refund to buyer
    REFUND_TO_BANK = "refund_to_bank"  # Return financing to bank
    FEE_DEDUCTION = "fee_deduction"  # Platform fee
    FREEZE = "freeze"  # Freeze operation
    UNFREEZE = "unfreeze"  # Unfreeze operation


class TransactionStatus(str, enum.Enum):
    """Transaction processing status"""
    PENDING = "pending"
    PROCESSING = "processing"
    COMPLETED = "completed"
    FAILED = "failed"
    REVERSED = "reversed"


# Valid escrow state transitions
VALID_ESCROW_TRANSITIONS = {
    EscrowStatus.PENDING: [EscrowStatus.LOCKED, EscrowStatus.REVERTED],
    EscrowStatus.LOCKED: [EscrowStatus.FROZEN, EscrowStatus.RELEASED, EscrowStatus.REVERTED],
    EscrowStatus.FROZEN: [EscrowStatus.LOCKED, EscrowStatus.REVERTED, EscrowStatus.RELEASED],
    EscrowStatus.RELEASED: [],  # Terminal
    EscrowStatus.REVERTED: [],  # Terminal
    EscrowStatus.PARTIALLY_RELEASED: [EscrowStatus.RELEASED, EscrowStatus.REVERTED],
}


class Escrow(BaseModel, AuditMixin, VersionedMixin):
    """
    Escrow account for an order.
    Holds funds until release conditions are met.
    """
    __tablename__ = "escrows"
    
    # Link to order (one-to-one)
    order_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("orders.id"),
        unique=True,
        nullable=False,
        index=True,
    )
    
    # Escrow reference number
    escrow_number: Mapped[str] = mapped_column(
        String(50),
        unique=True,
        nullable=False,
    )
    
    # Status
    status: Mapped[EscrowStatus] = mapped_column(
        SQLEnum(EscrowStatus),
        nullable=False,
        default=EscrowStatus.PENDING,
    )
    previous_status: Mapped[Optional[str]] = mapped_column(String(50), nullable=True)
    
    # Amounts
    bank_amount: Mapped[Decimal] = mapped_column(
        Numeric(18, 4),
        default=Decimal("0"),
        nullable=False,
    )
    buyer_amount: Mapped[Decimal] = mapped_column(
        Numeric(18, 4),
        default=Decimal("0"),
        nullable=False,
    )
    total_amount: Mapped[Decimal] = mapped_column(
        Numeric(18, 4),
        nullable=False,
    )
    released_amount: Mapped[Decimal] = mapped_column(
        Numeric(18, 4),
        default=Decimal("0"),
        nullable=False,
    )
    refunded_amount: Mapped[Decimal] = mapped_column(
        Numeric(18, 4),
        default=Decimal("0"),
        nullable=False,
    )
    platform_fee: Mapped[Decimal] = mapped_column(
        Numeric(18, 4),
        default=Decimal("0"),
        nullable=False,
    )
    currency: Mapped[str] = mapped_column(String(3), default="MYR", nullable=False)
    
    # Bank reference
    bank_id: Mapped[Optional[uuid.UUID]] = mapped_column(
        UUID(as_uuid=True),
        nullable=True,
    )
    bank_reference: Mapped[Optional[str]] = mapped_column(String(100), nullable=True)
    
    # Key timestamps
    locked_at: Mapped[Optional[datetime]] = mapped_column(nullable=True)
    frozen_at: Mapped[Optional[datetime]] = mapped_column(nullable=True)
    released_at: Mapped[Optional[datetime]] = mapped_column(nullable=True)
    reverted_at: Mapped[Optional[datetime]] = mapped_column(nullable=True)
    
    # Freeze info
    freeze_reason: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    frozen_by: Mapped[Optional[uuid.UUID]] = mapped_column(UUID(as_uuid=True), nullable=True)
    
    # Release conditions tracking
    release_conditions: Mapped[Optional[dict]] = mapped_column(
        JSONB,
        nullable=True,
        comment="Tracks which release conditions are met"
    )
    
    # Notes
    notes: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    
    # Relationships
    order: Mapped["Order"] = relationship("Order", back_populates="escrow")
    transactions: Mapped[List["EscrowTransaction"]] = relationship(
        "EscrowTransaction",
        back_populates="escrow",
        lazy="selectin",
        order_by="EscrowTransaction.created_at",
    )
    
    # Indexes
    __table_args__ = (
        Index("ix_escrows_status", "status"),
        CheckConstraint("total_amount >= 0", name="ck_escrows_total_non_negative"),
        CheckConstraint("released_amount >= 0", name="ck_escrows_released_non_negative"),
        CheckConstraint("refunded_amount >= 0", name="ck_escrows_refunded_non_negative"),
    )
    
    def can_transition_to(self, new_status: EscrowStatus) -> bool:
        """Check if transition to new status is valid"""
        allowed = VALID_ESCROW_TRANSITIONS.get(self.status, [])
        return new_status in allowed
    
    def transition_to(self, new_status: EscrowStatus, reason: Optional[str] = None) -> bool:
        """Transition escrow to new status"""
        if not self.can_transition_to(new_status):
            return False
        
        self.previous_status = self.status.value
        self.status = new_status
        
        now = datetime.now(timezone.utc)
        if new_status == EscrowStatus.LOCKED:
            self.locked_at = now
        elif new_status == EscrowStatus.FROZEN:
            self.frozen_at = now
            self.freeze_reason = reason
        elif new_status == EscrowStatus.RELEASED:
            self.released_at = now
            self.released_amount = self.total_amount - self.platform_fee
        elif new_status == EscrowStatus.REVERTED:
            self.reverted_at = now
            self.refunded_amount = self.total_amount
        
        return True
    
    @property
    def is_locked(self) -> bool:
        return self.status == EscrowStatus.LOCKED
    
    @property
    def is_frozen(self) -> bool:
        return self.status == EscrowStatus.FROZEN
    
    @property
    def is_terminal(self) -> bool:
        return self.status in [EscrowStatus.RELEASED, EscrowStatus.REVERTED]
    
    @property
    def available_balance(self) -> Decimal:
        """Get available balance (not yet released or refunded)"""
        return self.total_amount - self.released_amount - self.refunded_amount
    
    def update_release_condition(self, condition: str, met: bool) -> None:
        """Update a release condition status"""
        if self.release_conditions is None:
            self.release_conditions = {}
        self.release_conditions[condition] = {
            "met": met,
            "updated_at": datetime.now(timezone.utc).isoformat(),
        }
    
    def all_release_conditions_met(self) -> bool:
        """Check if all release conditions are met"""
        if not self.release_conditions:
            return False
        required = ["shariah_compliant", "ai_approved", "buyer_confirmed", "provider_confirmed"]
        return all(
            self.release_conditions.get(c, {}).get("met", False)
            for c in required
        )
    
    def __repr__(self) -> str:
        return f"<Escrow(id={self.id}, order_id={self.order_id}, status={self.status})>"


class EscrowTransaction(BaseModel, AuditMixin):
    """
    Individual escrow transaction.
    Immutable audit trail of all fund movements.
    """
    __tablename__ = "escrow_transactions"
    
    # Link to escrow
    escrow_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("escrows.id"),
        nullable=False,
        index=True,
    )
    
    # Transaction details
    transaction_type: Mapped[TransactionType] = mapped_column(
        SQLEnum(TransactionType),
        nullable=False,
    )
    status: Mapped[TransactionStatus] = mapped_column(
        SQLEnum(TransactionStatus),
        nullable=False,
        default=TransactionStatus.PENDING,
    )
    
    # Amount
    amount: Mapped[Decimal] = mapped_column(Numeric(18, 4), nullable=False)
    currency: Mapped[str] = mapped_column(String(3), default="MYR", nullable=False)
    
    # Direction
    from_account: Mapped[Optional[str]] = mapped_column(String(100), nullable=True)
    to_account: Mapped[Optional[str]] = mapped_column(String(100), nullable=True)
    
    # Reference
    reference_number: Mapped[str] = mapped_column(String(100), unique=True, nullable=False)
    external_reference: Mapped[Optional[str]] = mapped_column(String(100), nullable=True)
    
    # Actor
    initiated_by: Mapped[Optional[uuid.UUID]] = mapped_column(UUID(as_uuid=True), nullable=True)
    initiator_type: Mapped[str] = mapped_column(String(50), default="system", nullable=False)  # user, system, ai
    
    # Processing
    processed_at: Mapped[Optional[datetime]] = mapped_column(nullable=True)
    failure_reason: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    
    # Description
    description: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    
    # Transaction extra data
    transaction_metadata: Mapped[Optional[dict]] = mapped_column(JSONB, nullable=True)
    
    # Relationships
    escrow: Mapped["Escrow"] = relationship("Escrow", back_populates="transactions")
    
    # Indexes
    __table_args__ = (
        Index("ix_escrow_transactions_escrow_type", "escrow_id", "transaction_type"),
        Index("ix_escrow_transactions_status", "status"),
        CheckConstraint("amount > 0", name="ck_escrow_transactions_amount_positive"),
    )
    
    def mark_completed(self) -> None:
        """Mark transaction as completed"""
        self.status = TransactionStatus.COMPLETED
        self.processed_at = datetime.now(timezone.utc)
    
    def mark_failed(self, reason: str) -> None:
        """Mark transaction as failed"""
        self.status = TransactionStatus.FAILED
        self.failure_reason = reason
        self.processed_at = datetime.now(timezone.utc)
    
    def __repr__(self) -> str:
        return f"<EscrowTransaction(id={self.id}, type={self.transaction_type}, amount={self.amount})>"
