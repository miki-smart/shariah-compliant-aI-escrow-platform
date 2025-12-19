"""
Escrow Schemas
Pydantic schemas for escrow operations
"""
from pydantic import BaseModel, Field, ConfigDict
from typing import Optional, List, Dict, Any
from datetime import datetime
from decimal import Decimal
from uuid import UUID
from enum import Enum


class EscrowStatusEnum(str, Enum):
    """Escrow account status"""
    PENDING = "pending"
    LOCKED = "locked"
    FROZEN = "frozen"
    RELEASED = "released"
    REVERTED = "reverted"
    PARTIALLY_RELEASED = "partially_released"


class TransactionTypeEnum(str, Enum):
    """Type of escrow transaction"""
    BANK_DEPOSIT = "bank_deposit"
    BUYER_DEPOSIT = "buyer_deposit"
    RELEASE_TO_SELLER = "release_to_seller"
    REFUND_TO_BUYER = "refund_to_buyer"
    REFUND_TO_BANK = "refund_to_bank"
    FEE_DEDUCTION = "fee_deduction"
    FREEZE = "freeze"
    UNFREEZE = "unfreeze"


class TransactionStatusEnum(str, Enum):
    """Transaction processing status"""
    PENDING = "pending"
    PROCESSING = "processing"
    COMPLETED = "completed"
    FAILED = "failed"
    REVERSED = "reversed"


# ============ Request Schemas ============

class EscrowFundRequest(BaseModel):
    """Request schema for funding an escrow account"""
    amount: Decimal = Field(..., gt=0, description="Amount to fund")
    bank_reference: Optional[str] = Field(None, max_length=100, description="Bank reference number")
    notes: Optional[str] = Field(None, description="Additional notes")
    
    model_config = ConfigDict(
        json_schema_extra={
            "example": {
                "amount": 1500.00,
                "bank_reference": "BANK-REF-12345",
                "notes": "Initial escrow funding"
            }
        }
    )


class EscrowReleaseRequest(BaseModel):
    """Request schema for releasing escrow funds"""
    amount: Optional[Decimal] = Field(None, gt=0, description="Amount to release (defaults to full amount)")
    reason: Optional[str] = Field(None, description="Reason for release")
    bank_reference: Optional[str] = Field(None, max_length=100, description="Bank reference for transfer")
    
    model_config = ConfigDict(
        json_schema_extra={
            "example": {
                "amount": 1500.00,
                "reason": "Delivery confirmed, all conditions met",
                "bank_reference": "REL-12345"
            }
        }
    )


class EscrowRefundRequest(BaseModel):
    """Request schema for refunding escrow funds"""
    amount: Optional[Decimal] = Field(None, gt=0, description="Amount to refund (defaults to full amount)")
    reason: str = Field(..., min_length=5, description="Reason for refund")
    refund_to: str = Field(default="buyer", description="Refund recipient: 'buyer' or 'bank'")
    
    model_config = ConfigDict(
        json_schema_extra={
            "example": {
                "amount": 1500.00,
                "reason": "Order cancelled by buyer",
                "refund_to": "buyer"
            }
        }
    )


class EscrowFreezeRequest(BaseModel):
    """Request schema for freezing escrow"""
    reason: str = Field(..., min_length=5, description="Reason for freeze")
    
    model_config = ConfigDict(
        json_schema_extra={
            "example": {
                "reason": "Dispute raised by buyer regarding product quality"
            }
        }
    )


# ============ Response Schemas ============

class EscrowTransactionResponse(BaseModel):
    """Response schema for escrow transactions"""
    id: UUID
    escrow_id: UUID
    transaction_type: TransactionTypeEnum
    status: TransactionStatusEnum
    amount: Decimal
    currency: str
    from_account: Optional[str] = None
    to_account: Optional[str] = None
    reference_number: str
    external_reference: Optional[str] = None
    initiated_by: Optional[UUID] = None
    initiator_type: str
    description: Optional[str] = None
    processed_at: Optional[datetime] = None
    failure_reason: Optional[str] = None
    created_at: datetime
    
    model_config = ConfigDict(from_attributes=True)


class ReleaseConditions(BaseModel):
    """Schema for tracking release conditions"""
    shariah_compliant: Dict[str, Any] = Field(
        default_factory=lambda: {"met": False, "updated_at": None}
    )
    ai_approved: Dict[str, Any] = Field(
        default_factory=lambda: {"met": False, "updated_at": None}
    )
    buyer_confirmed: Dict[str, Any] = Field(
        default_factory=lambda: {"met": False, "updated_at": None}
    )
    provider_confirmed: Dict[str, Any] = Field(
        default_factory=lambda: {"met": False, "updated_at": None}
    )
    no_disputes: Dict[str, Any] = Field(
        default_factory=lambda: {"met": True, "updated_at": None}
    )


class EscrowResponse(BaseModel):
    """Response schema for escrow details"""
    id: UUID
    order_id: UUID
    escrow_number: str
    status: EscrowStatusEnum
    previous_status: Optional[str] = None
    
    # Amounts
    total_amount: Decimal
    bank_amount: Decimal
    buyer_amount: Decimal
    released_amount: Decimal
    refunded_amount: Decimal
    platform_fee: Decimal
    currency: str
    
    # Bank info
    bank_id: Optional[UUID] = None
    bank_reference: Optional[str] = None
    
    # Timestamps
    locked_at: Optional[datetime] = None
    frozen_at: Optional[datetime] = None
    released_at: Optional[datetime] = None
    reverted_at: Optional[datetime] = None
    created_at: datetime
    updated_at: datetime
    
    # Release conditions
    release_conditions: Optional[Dict[str, Any]] = None
    
    # Computed properties
    available_balance: Decimal
    is_locked: bool
    is_frozen: bool
    is_terminal: bool
    
    model_config = ConfigDict(from_attributes=True)


class EscrowBalanceResponse(BaseModel):
    """Response schema for escrow balance check"""
    escrow_id: UUID
    order_id: UUID
    total_amount: Decimal
    available_balance: Decimal
    released_amount: Decimal
    refunded_amount: Decimal
    platform_fee: Decimal
    currency: str
    status: EscrowStatusEnum
    is_funded: bool
    
    model_config = ConfigDict(from_attributes=True)


class EscrowSummaryResponse(BaseModel):
    """Simplified escrow summary for listings"""
    id: UUID
    order_id: UUID
    escrow_number: str
    status: EscrowStatusEnum
    total_amount: Decimal
    currency: str
    locked_at: Optional[datetime] = None
    created_at: datetime
    
    model_config = ConfigDict(from_attributes=True)


class EscrowTransactionListResponse(BaseModel):
    """Response schema for transaction list with pagination"""
    transactions: List[EscrowTransactionResponse]
    total: int
    page: int
    page_size: int
    total_pages: int


class EscrowOperationResult(BaseModel):
    """Response schema for escrow operations (fund, release, refund)"""
    success: bool
    message: str
    escrow: Optional[EscrowResponse] = None
    transaction: Optional[EscrowTransactionResponse] = None
    
    model_config = ConfigDict(
        json_schema_extra={
            "example": {
                "success": True,
                "message": "Escrow funded successfully",
                "escrow": {
                    "id": "123e4567-e89b-12d3-a456-426614174000",
                    "status": "locked"
                }
            }
        }
    )
