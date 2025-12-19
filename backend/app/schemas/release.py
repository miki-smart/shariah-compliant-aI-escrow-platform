"""
Release Gate Schemas
Pydantic schemas for payment release gate operations
"""
from pydantic import BaseModel, Field, ConfigDict
from typing import Optional, List, Dict, Any
from datetime import datetime
from uuid import UUID
from enum import Enum


class ReleaseConditionStatus(str, Enum):
    """Status of a single release condition"""
    MET = "met"
    NOT_MET = "not_met"
    PENDING = "pending"
    NOT_APPLICABLE = "not_applicable"


class ReleaseConditionDetail(BaseModel):
    """Detail of a single release condition"""
    name: str
    label: str
    status: ReleaseConditionStatus
    is_required: bool
    checked_at: Optional[datetime] = None
    details: Optional[str] = None
    
    model_config = ConfigDict(from_attributes=True)


class ReleaseGateCheckRequest(BaseModel):
    """Request schema for checking release gate"""
    order_id: UUID
    
    model_config = ConfigDict(
        json_schema_extra={
            "example": {
                "order_id": "123e4567-e89b-12d3-a456-426614174000"
            }
        }
    )


class ReleaseGateResponse(BaseModel):
    """Response schema for release gate check"""
    order_id: UUID
    escrow_id: Optional[UUID] = None
    
    # Overall status
    can_release: bool
    all_conditions_met: bool
    
    # Conditions breakdown
    conditions: List[ReleaseConditionDetail]
    required_conditions_met: int
    required_conditions_total: int
    
    # Additional info
    escrow_status: str
    escrow_amount: float
    currency: str
    
    # Timestamps
    checked_at: datetime
    
    # Reasons if cannot release
    blocking_reasons: List[str]
    
    model_config = ConfigDict(
        json_schema_extra={
            "example": {
                "order_id": "123e4567-e89b-12d3-a456-426614174000",
                "can_release": True,
                "all_conditions_met": True
            }
        }
    )


class ManualReleaseRequest(BaseModel):
    """Request schema for manual release override"""
    reason: str = Field(..., min_length=10, description="Reason for manual release")
    override_conditions: List[str] = Field(
        default_factory=list,
        description="List of conditions to override"
    )
    authorization_code: Optional[str] = Field(
        None,
        description="Authorization code for override"
    )
    
    model_config = ConfigDict(
        json_schema_extra={
            "example": {
                "reason": "Customer verified delivery via phone call, documentation received",
                "override_conditions": ["buyer_confirmed"],
                "authorization_code": "AUTH-12345"
            }
        }
    )


class AutoReleaseCheckResponse(BaseModel):
    """Response for automatic release check"""
    order_id: UUID
    should_release: bool
    release_triggered: bool
    conditions_summary: Dict[str, bool]
    message: str
    
    model_config = ConfigDict(from_attributes=True)
