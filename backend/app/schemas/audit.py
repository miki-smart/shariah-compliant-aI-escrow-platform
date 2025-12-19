"""
Audit Schemas
Pydantic schemas for audit log API
"""
from pydantic import BaseModel, Field, ConfigDict
from typing import Optional, List, Dict, Any
from datetime import datetime
from uuid import UUID
from enum import Enum


class AuditActionEnum(str, Enum):
    """Types of auditable actions"""
    # User actions
    USER_CREATED = "user_created"
    USER_UPDATED = "user_updated"
    USER_LOGIN = "user_login"
    USER_LOGOUT = "user_logout"
    
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


class EntityTypeEnum(str, Enum):
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


class ActorTypeEnum(str, Enum):
    """Types of actors performing actions"""
    USER = "user"
    SYSTEM = "system"
    AI = "ai"
    BANK = "bank"
    ADMIN = "admin"
    SCHEDULER = "scheduler"


class AuditLogResponse(BaseModel):
    """Response schema for a single audit log entry"""
    id: UUID
    action: AuditActionEnum
    entity_type: EntityTypeEnum
    entity_id: UUID
    actor_type: ActorTypeEnum
    actor_id: Optional[UUID] = None
    actor_name: Optional[str] = None
    
    old_values: Optional[Dict[str, Any]] = None
    new_values: Optional[Dict[str, Any]] = None
    changes: Optional[Dict[str, Any]] = None
    
    description: str
    reason: Optional[str] = None
    correlation_id: Optional[str] = None
    
    success: bool
    error_message: Optional[str] = None
    
    ip_address: Optional[str] = None
    
    created_at: datetime
    
    model_config = ConfigDict(from_attributes=True)


class AuditLogListResponse(BaseModel):
    """Response schema for paginated audit logs"""
    logs: List[AuditLogResponse]
    total: int
    page: int
    page_size: int
    total_pages: int
    
    model_config = ConfigDict(from_attributes=True)


class AuditLogSummary(BaseModel):
    """Summary statistics for audit logs"""
    total_logs: int
    logs_by_action: Dict[str, int]
    logs_by_entity: Dict[str, int]
    logs_by_actor_type: Dict[str, int]
    success_rate: float
    recent_errors: List[AuditLogResponse]
    time_range: Dict[str, Optional[datetime]]
    
    model_config = ConfigDict(from_attributes=True)


class OrderAuditTrail(BaseModel):
    """Complete audit trail for an order"""
    order_id: UUID
    events: List[AuditLogResponse]
    timeline: List[Dict[str, Any]]
    participants: List[Dict[str, Any]]
    compliance_summary: Dict[str, Any]
    
    model_config = ConfigDict(from_attributes=True)


class ComplianceReport(BaseModel):
    """Compliance report for regulatory purposes"""
    report_id: str
    generated_at: datetime
    period_start: datetime
    period_end: datetime
    
    # Summary
    total_transactions: int
    total_escrow_volume: float
    currency: str
    
    # Compliance metrics
    shariah_compliance_rate: float
    ai_approval_rate: float
    dispute_rate: float
    
    # Flagged items
    flagged_orders: List[Dict[str, Any]]
    shariah_violations: List[Dict[str, Any]]
    ai_blocks: List[Dict[str, Any]]
    
    model_config = ConfigDict(from_attributes=True)
