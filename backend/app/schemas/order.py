"""
Order Schemas
Pydantic models for order requests/responses
"""
from pydantic import BaseModel, Field, field_validator
from typing import Optional, List, Dict, Any
from uuid import UUID
from datetime import datetime
from decimal import Decimal
from enum import Enum


class OrderStatus(str, Enum):
    """Order lifecycle status"""
    CREATED = "created"
    SHARIAH_VALIDATED = "shariah_validated"
    AI_EVALUATED = "ai_evaluated"
    PENDING_BANK_APPROVAL = "pending_bank_approval"
    BANK_APPROVED = "bank_approved"
    FUNDED = "funded"
    PROCESSING = "processing"
    IN_TRANSIT = "in_transit"
    DELIVERED = "delivered"
    DELIVERY_VERIFIED = "delivery_verified"
    SETTLED = "settled"
    COMPLETED = "completed"
    CANCELLED = "cancelled"
    REFUNDED = "refunded"
    DISPUTED = "disputed"
    BLOCKED = "blocked"
    FROZEN = "frozen"


class ShariahStatus(str, Enum):
    """Shariah compliance status"""
    PENDING = "pending"
    COMPLIANT = "compliant"
    NON_COMPLIANT = "non_compliant"
    REQUIRES_REVIEW = "requires_review"
    VIOLATION_DETECTED = "violation_detected"


class AIApprovalStatus(str, Enum):
    """AI governance approval status"""
    PENDING = "pending"
    APPROVED = "approved"
    REJECTED = "rejected"
    PENDING_REVIEW = "pending_review"
    FLAGGED = "flagged"


class BankApprovalStatus(str, Enum):
    """Bank financing approval status"""
    NOT_REQUESTED = "not_requested"
    PENDING = "pending"
    APPROVED = "approved"
    REJECTED = "rejected"
    REQUIRES_INFO = "requires_info"


class ContractType(str, Enum):
    """Islamic contract types"""
    MURABAHA = "murabaha"
    SALAM = "salam"
    ISTISNA = "istisna"
    MUSAWAMAH = "musawamah"
    CASH = "cash"


class OwnershipStatus(str, Enum):
    """Goods ownership status"""
    SELLER = "seller"
    IN_TRANSIT = "in_transit"
    BUYER = "buyer"


# ============ Order Creation ============

class DeliveryAddressRequest(BaseModel):
    """Delivery address schema"""
    street: str = Field(..., min_length=5, max_length=255)
    city: str = Field(..., min_length=2, max_length=100)
    state: Optional[str] = Field(None, max_length=100)
    postal_code: Optional[str] = Field(None, max_length=20)
    country: str = Field(default="Ethiopia", max_length=100)
    phone: Optional[str] = Field(None, max_length=20)
    instructions: Optional[str] = Field(None, max_length=500)


class OrderCreateRequest(BaseModel):
    """Request schema for creating a new order"""
    product_id: UUID
    quantity: int = Field(..., ge=1)
    financing_requested: bool = Field(default=False)
    contract_type: ContractType = Field(default=ContractType.MURABAHA)
    delivery_address: Optional[DeliveryAddressRequest] = None
    notes: Optional[str] = Field(None, max_length=1000)
    
    @field_validator('quantity')
    @classmethod
    def validate_quantity(cls, v):
        if v < 1:
            raise ValueError('Quantity must be at least 1')
        return v


# ============ Order Responses ============

class UserSummary(BaseModel):
    """Minimal user info for order responses"""
    id: UUID
    email: str
    full_name: Optional[str] = None
    business_name: Optional[str] = None
    phone: Optional[str] = None
    
    class Config:
        from_attributes = True


class ProductSummary(BaseModel):
    """Minimal product info for order responses"""
    id: UUID
    name: str
    sku: Optional[str] = None
    category: str
    price: Decimal
    currency: str
    thumbnail_url: Optional[str] = None
    
    class Config:
        from_attributes = True


class DeliveryAddressResponse(BaseModel):
    """Delivery address in response"""
    street: Optional[str] = None
    city: Optional[str] = None
    state: Optional[str] = None
    postal_code: Optional[str] = None
    country: Optional[str] = None
    phone: Optional[str] = None
    instructions: Optional[str] = None


class AIDecisionSummary(BaseModel):
    """AI decision summary"""
    risk_score: Optional[float] = None
    risk_level: Optional[str] = None
    decision: str
    factors: Optional[Dict[str, Any]] = None
    explanation: Optional[str] = None


class ShariahResultSummary(BaseModel):
    """Shariah validation result summary"""
    status: ShariahStatus
    compliance_score: Optional[float] = None
    violations: Optional[List[str]] = None
    notes: Optional[str] = None


class OrderResponse(BaseModel):
    """Complete order response"""
    id: UUID
    order_number: str
    
    # Parties
    buyer_id: UUID
    seller_id: UUID
    bank_id: Optional[UUID] = None
    buyer: Optional[UserSummary] = None
    seller: Optional[UserSummary] = None
    
    # Product
    product_id: UUID
    product: Optional[ProductSummary] = None
    quantity: Decimal
    unit_price: Decimal
    
    # Amounts
    total_amount: Decimal
    buyer_down_payment: Decimal
    bank_financing_amount: Decimal
    currency: str
    
    # Status
    status: OrderStatus
    shariah_status: ShariahStatus
    ai_approval_status: AIApprovalStatus
    bank_approval_status: BankApprovalStatus
    
    # Contract
    contract_type: ContractType
    financing_requested: bool
    ownership_status: OwnershipStatus
    
    # Delivery
    delivery_address: Optional[DeliveryAddressResponse] = None
    delivery_terms: Optional[str] = None
    expected_delivery_date: Optional[datetime] = None
    actual_delivery_date: Optional[datetime] = None
    
    # Confirmations
    buyer_confirmed_at: Optional[datetime] = None
    seller_confirmed_at: Optional[datetime] = None
    provider_confirmed_at: Optional[datetime] = None
    
    # Key timestamps
    shariah_validated_at: Optional[datetime] = None
    ai_evaluated_at: Optional[datetime] = None
    bank_approved_at: Optional[datetime] = None
    escrow_locked_at: Optional[datetime] = None
    escrow_released_at: Optional[datetime] = None
    settled_at: Optional[datetime] = None
    
    # Notes
    notes: Optional[str] = None
    cancellation_reason: Optional[str] = None
    
    # AI & Shariah results
    ai_decision: Optional[AIDecisionSummary] = None
    shariah_result: Optional[ShariahResultSummary] = None
    
    # Timestamps
    created_at: datetime
    updated_at: datetime
    
    # Computed
    is_active: bool = True
    can_be_cancelled: bool = True
    release_conditions_met: bool = False
    
    class Config:
        from_attributes = True


class OrderListResponse(BaseModel):
    """Paginated order list response"""
    orders: List[OrderResponse]
    total: int
    skip: int
    limit: int


# ============ Order Actions ============

class BankApprovalRequest(BaseModel):
    """Bank approval/rejection request"""
    approved: bool
    reason: Optional[str] = Field(None, max_length=500)
    financing_amount: Optional[Decimal] = Field(None, ge=0)
    notes: Optional[str] = Field(None, max_length=1000)


class DeliveryConfirmationRequest(BaseModel):
    """Delivery confirmation request"""
    confirmed: bool
    delivery_date: Optional[datetime] = None
    notes: Optional[str] = Field(None, max_length=500)
    rating: Optional[int] = Field(None, ge=1, le=5)


class SellerProcessRequest(BaseModel):
    """Seller processing order request"""
    action: str = Field(..., pattern="^(accept|reject|ship)$")
    estimated_delivery_date: Optional[datetime] = None
    tracking_number: Optional[str] = Field(None, max_length=100)
    notes: Optional[str] = Field(None, max_length=500)


class DeliveryAssignmentRequest(BaseModel):
    """Request to assign delivery provider to order"""
    provider_id: UUID
    estimated_delivery_date: Optional[datetime] = None
    special_instructions: Optional[str] = Field(None, max_length=500)


class CancelOrderRequest(BaseModel):
    """Order cancellation request"""
    reason: str = Field(..., min_length=10, max_length=500)


class DisputeRequest(BaseModel):
    """Dispute initiation request"""
    reason: str = Field(..., min_length=20, max_length=1000)
    dispute_type: str = Field(..., pattern="^(delivery|quality|other)$")
    evidence_urls: Optional[List[str]] = None


# ============ Order History ============

class OrderStatusHistoryResponse(BaseModel):
    """Order status history entry"""
    id: UUID
    order_id: UUID
    from_status: Optional[str] = None
    to_status: str
    changed_by: Optional[UUID] = None
    reason: Optional[str] = None
    trigger_type: str
    created_at: datetime
    
    class Config:
        from_attributes = True


# ============ Order Filters ============

class OrderFilterParams(BaseModel):
    """Query parameters for filtering orders"""
    status: Optional[OrderStatus] = None
    statuses: Optional[List[OrderStatus]] = None
    shariah_status: Optional[ShariahStatus] = None
    ai_status: Optional[AIApprovalStatus] = None
    bank_status: Optional[BankApprovalStatus] = None
    financing_requested: Optional[bool] = None
    date_from: Optional[datetime] = None
    date_to: Optional[datetime] = None
    skip: int = Field(default=0, ge=0)
    limit: int = Field(default=50, ge=1, le=100)

