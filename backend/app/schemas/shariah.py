"""
Shariah Compliance Schemas
Pydantic schemas for Shariah validation operations
"""
from pydantic import BaseModel, Field, ConfigDict
from typing import Optional, List, Dict, Any
from datetime import datetime
from uuid import UUID
from enum import Enum


class ShariahComplianceStatusEnum(str, Enum):
    """Shariah compliance validation result"""
    PENDING = "pending"
    COMPLIANT = "compliant"
    NON_COMPLIANT = "non_compliant"
    REQUIRES_REVIEW = "requires_review"
    VIOLATION_DETECTED = "violation_detected"


class ViolationTypeEnum(str, Enum):
    """Types of Shariah violations"""
    RIBA = "riba"
    GHARAR = "gharar"
    MAISIR = "maisir"
    HARAM_PRODUCT = "haram_product"
    HARAM_SERVICE = "haram_service"
    CONTRACT_VIOLATION = "contract_violation"
    OTHER = "other"


# ============ Request Schemas ============

class ShariahValidationRequest(BaseModel):
    """Request schema for triggering Shariah validation"""
    order_id: UUID
    force_revalidation: bool = Field(
        default=False, 
        description="Force revalidation even if already validated"
    )
    
    model_config = ConfigDict(
        json_schema_extra={
            "example": {
                "order_id": "123e4567-e89b-12d3-a456-426614174000",
                "force_revalidation": False
            }
        }
    )


class ShariahReviewRequest(BaseModel):
    """Request schema for manual Shariah review"""
    decision: str = Field(
        ..., 
        description="Review decision: 'approve' or 'reject'"
    )
    notes: Optional[str] = Field(
        None, 
        description="Review notes"
    )
    
    model_config = ConfigDict(
        json_schema_extra={
            "example": {
                "decision": "approve",
                "notes": "Manual review completed. Transaction structure verified."
            }
        }
    )


class ProductKeywordCheckRequest(BaseModel):
    """Request schema for checking product keywords"""
    product_name: str = Field(..., min_length=1, description="Product name to check")
    description: Optional[str] = Field(None, description="Product description to check")
    
    model_config = ConfigDict(
        json_schema_extra={
            "example": {
                "product_name": "Halal Chicken Burger",
                "description": "Fresh halal certified chicken patty with vegetables"
            }
        }
    )


# ============ Response Schemas ============

class ViolationResponse(BaseModel):
    """Schema for a single violation"""
    rule_code: str
    rule_name: str
    description: str
    severity: str  # critical, high, medium, low
    violation_type: str


class ShariahResultResponse(BaseModel):
    """Response schema for Shariah validation result"""
    id: UUID
    order_id: UUID
    status: ShariahComplianceStatusEnum
    compliance_score: Optional[float] = None
    
    # Product validation
    product_is_halal: bool
    product_category_compliant: bool
    haram_products_detected: bool
    haram_indicators: Optional[Dict[str, Any]] = None
    
    # Transaction validation
    transaction_compliant: bool
    contract_type_valid: bool
    no_riba_detected: bool
    no_gharar_detected: bool
    no_maisir_detected: bool
    
    # Violations
    violations: Optional[List[ViolationResponse]] = None
    violation_count: int
    primary_violation_type: Optional[ViolationTypeEnum] = None
    
    # Validation info
    validation_method: str
    rules_applied: Optional[List[str]] = None
    principles_validated: Optional[List[str]] = None
    
    # Review info
    requires_manual_review: bool
    review_reason: Optional[str] = None
    reviewed_by: Optional[UUID] = None
    reviewed_at: Optional[datetime] = None
    review_notes: Optional[str] = None
    review_decision: Optional[str] = None
    
    # Explanation
    explanation: Optional[str] = None
    
    # Timestamps
    validated_at: datetime
    created_at: datetime
    updated_at: datetime
    
    model_config = ConfigDict(from_attributes=True)


class ShariahStatusResponse(BaseModel):
    """Simplified response for Shariah status check"""
    order_id: UUID
    status: ShariahComplianceStatusEnum
    is_compliant: bool
    violation_count: int
    primary_violation: Optional[str] = None
    validated_at: Optional[datetime] = None
    requires_review: bool
    can_proceed: bool  # Whether order can proceed to next step
    
    model_config = ConfigDict(from_attributes=True)


class ShariahCertificateResponse(BaseModel):
    """Response schema for Shariah compliance certificate"""
    certificate_id: str
    order_id: UUID
    order_number: str
    
    # Compliance info
    status: ShariahComplianceStatusEnum
    compliance_score: Optional[float] = None
    is_compliant: bool
    
    # Order details
    product_name: str
    product_category: str
    order_amount: float
    currency: str
    contract_type: str
    
    # Parties
    buyer_name: str
    seller_name: str
    
    # Validation details
    validation_method: str
    principles_validated: List[str]
    rules_applied: List[str]
    
    # Dates
    validated_at: datetime
    certificate_issued_at: datetime
    valid_until: Optional[datetime] = None
    
    # Signature/verification
    verification_code: str
    issued_by: str
    
    model_config = ConfigDict(
        json_schema_extra={
            "example": {
                "certificate_id": "CERT-12345678",
                "order_id": "123e4567-e89b-12d3-a456-426614174000",
                "status": "compliant",
                "is_compliant": True
            }
        }
    )


class ProductKeywordCheckResponse(BaseModel):
    """Response schema for product keyword check"""
    is_clean: bool
    found_keywords: List[str]
    recommendation: str  # ALLOW, BLOCK, REVIEW
    risk_level: str  # low, medium, high, critical
    
    model_config = ConfigDict(
        json_schema_extra={
            "example": {
                "is_clean": True,
                "found_keywords": [],
                "recommendation": "ALLOW",
                "risk_level": "low"
            }
        }
    )


class ShariahRuleResponse(BaseModel):
    """Response schema for Shariah rule"""
    code: str
    name: str
    description: str
    category: str
    severity: str
    is_active: bool


class ShariahRulesListResponse(BaseModel):
    """Response schema for listing all Shariah rules"""
    rules: List[ShariahRuleResponse]
    total: int


class ShariahValidationSummary(BaseModel):
    """Summary of Shariah validation for dashboard"""
    total_validated: int
    compliant_count: int
    non_compliant_count: int
    requires_review_count: int
    compliance_rate: float
    common_violations: List[Dict[str, Any]]
