"""
Shariah Result Model
Shariah compliance validation records
"""
from sqlalchemy import Column, String, Text, Numeric, Boolean, Index, ForeignKey
from sqlalchemy import Enum as SQLEnum
from sqlalchemy.dialects.postgresql import UUID, JSONB, ARRAY
from sqlalchemy.orm import Mapped, mapped_column, relationship
from typing import Optional, List, TYPE_CHECKING
import uuid
import enum
from datetime import datetime, timezone

from app.models.base import BaseModel, AuditMixin

if TYPE_CHECKING:
    from app.models.order import Order


class ShariahComplianceStatus(str, enum.Enum):
    """Shariah compliance validation result"""
    PENDING = "pending"
    COMPLIANT = "compliant"
    NON_COMPLIANT = "non_compliant"
    REQUIRES_REVIEW = "requires_review"
    VIOLATION_DETECTED = "violation_detected"


class ViolationType(str, enum.Enum):
    """Types of Shariah violations"""
    RIBA = "riba"  # Interest
    GHARAR = "gharar"  # Excessive uncertainty
    MAISIR = "maisir"  # Gambling
    HARAM_PRODUCT = "haram_product"  # Prohibited product
    HARAM_SERVICE = "haram_service"  # Prohibited service
    CONTRACT_VIOLATION = "contract_violation"  # Non-compliant contract structure
    OTHER = "other"


class ShariahResult(BaseModel, AuditMixin):
    """
    Shariah compliance validation result for an order.
    Records validation outcome and any violations detected.
    """
    __tablename__ = "shariah_results"
    
    # Link to order (one-to-one)
    order_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("orders.id"),
        unique=True,
        nullable=False,
        index=True,
    )
    
    # Validation result
    status: Mapped[ShariahComplianceStatus] = mapped_column(
        SQLEnum(ShariahComplianceStatus),
        nullable=False,
        default=ShariahComplianceStatus.PENDING,
    )
    
    # Overall compliance score (0-100)
    compliance_score: Mapped[Optional[float]] = mapped_column(nullable=True)
    
    # Product validation
    product_is_halal: Mapped[bool] = mapped_column(default=True, nullable=False)
    product_category_compliant: Mapped[bool] = mapped_column(default=True, nullable=False)
    haram_products_detected: Mapped[bool] = mapped_column(default=False, nullable=False)
    haram_indicators: Mapped[Optional[dict]] = mapped_column(
        JSONB,
        nullable=True,
        comment="Detected haram indicators with confidence"
    )
    
    # Transaction structure validation
    transaction_compliant: Mapped[bool] = mapped_column(default=True, nullable=False)
    contract_type_valid: Mapped[bool] = mapped_column(default=True, nullable=False)
    no_riba_detected: Mapped[bool] = mapped_column(default=True, nullable=False)
    no_gharar_detected: Mapped[bool] = mapped_column(default=True, nullable=False)
    no_maisir_detected: Mapped[bool] = mapped_column(default=True, nullable=False)
    
    # Violations
    violations: Mapped[Optional[List[dict]]] = mapped_column(
        JSONB,
        nullable=True,
        comment="List of violations with type, description, severity"
    )
    violation_count: Mapped[int] = mapped_column(default=0, nullable=False)
    primary_violation_type: Mapped[Optional[ViolationType]] = mapped_column(
        SQLEnum(ViolationType),
        nullable=True,
    )
    
    # Principles validated
    principles_validated: Mapped[Optional[List[str]]] = mapped_column(
        ARRAY(String),
        nullable=True,
        comment="List of Shariah principles checked"
    )
    
    # Validation details
    validation_method: Mapped[str] = mapped_column(
        String(50),
        default="rule_based",
        nullable=False,
    )  # rule_based, ai_assisted, manual
    rules_applied: Mapped[Optional[List[str]]] = mapped_column(ARRAY(String), nullable=True)
    
    # Review info (for REQUIRES_REVIEW status)
    requires_manual_review: Mapped[bool] = mapped_column(default=False, nullable=False)
    review_reason: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    reviewed_by: Mapped[Optional[uuid.UUID]] = mapped_column(UUID(as_uuid=True), nullable=True)
    reviewed_at: Mapped[Optional[datetime]] = mapped_column(nullable=True)
    review_notes: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    review_decision: Mapped[Optional[str]] = mapped_column(String(50), nullable=True)
    
    # Explanation
    explanation: Mapped[Optional[str]] = mapped_column(
        Text,
        nullable=True,
        comment="Human-readable explanation of the validation result"
    )
    detailed_report: Mapped[Optional[dict]] = mapped_column(
        JSONB,
        nullable=True,
        comment="Detailed validation report"
    )
    
    # Timestamps
    validated_at: Mapped[datetime] = mapped_column(
        default=lambda: datetime.now(timezone.utc),
        nullable=False,
    )
    
    # Post-approval monitoring
    post_approval_check_at: Mapped[Optional[datetime]] = mapped_column(nullable=True)
    post_approval_status: Mapped[Optional[str]] = mapped_column(String(50), nullable=True)
    
    # Relationships
    order: Mapped["Order"] = relationship("Order", back_populates="shariah_result")
    
    # Indexes
    __table_args__ = (
        Index("ix_shariah_results_status", "status"),
        Index("ix_shariah_results_validated", "validated_at"),
    )
    
    @property
    def is_compliant(self) -> bool:
        return self.status == ShariahComplianceStatus.COMPLIANT
    
    @property
    def is_non_compliant(self) -> bool:
        return self.status == ShariahComplianceStatus.NON_COMPLIANT
    
    @property
    def needs_review(self) -> bool:
        return self.status == ShariahComplianceStatus.REQUIRES_REVIEW
    
    @property
    def has_violations(self) -> bool:
        return self.violation_count > 0 or self.haram_products_detected
    
    def add_violation(
        self,
        violation_type: ViolationType,
        description: str,
        severity: str = "high"
    ) -> None:
        """Add a violation to the result"""
        if self.violations is None:
            self.violations = []
        
        self.violations.append({
            "type": violation_type.value,
            "description": description,
            "severity": severity,
            "detected_at": datetime.now(timezone.utc).isoformat(),
        })
        self.violation_count = len(self.violations)
        
        if self.primary_violation_type is None:
            self.primary_violation_type = violation_type
    
    def mark_compliant(self, explanation: str = None) -> None:
        """Mark as compliant"""
        self.status = ShariahComplianceStatus.COMPLIANT
        self.explanation = explanation or "Order meets all Shariah compliance requirements"
        self.validated_at = datetime.now(timezone.utc)
    
    def mark_non_compliant(self, explanation: str) -> None:
        """Mark as non-compliant"""
        self.status = ShariahComplianceStatus.NON_COMPLIANT
        self.explanation = explanation
        self.validated_at = datetime.now(timezone.utc)
    
    def mark_for_review(self, reason: str) -> None:
        """Mark for manual review"""
        self.status = ShariahComplianceStatus.REQUIRES_REVIEW
        self.requires_manual_review = True
        self.review_reason = reason
        self.validated_at = datetime.now(timezone.utc)
    
    def complete_review(
        self,
        reviewer_id: uuid.UUID,
        decision: str,
        notes: str = None
    ) -> None:
        """Complete manual review"""
        self.reviewed_by = reviewer_id
        self.reviewed_at = datetime.now(timezone.utc)
        self.review_decision = decision
        self.review_notes = notes
        
        if decision == "approved":
            self.status = ShariahComplianceStatus.COMPLIANT
        elif decision == "rejected":
            self.status = ShariahComplianceStatus.NON_COMPLIANT
    
    def __repr__(self) -> str:
        return f"<ShariahResult(id={self.id}, order_id={self.order_id}, status={self.status})>"


class ShariahRule(BaseModel):
    """
    Shariah compliance rules for validation.
    Used by the rule-based Shariah validation engine.
    """
    __tablename__ = "shariah_rules"
    
    # Rule identification
    rule_code: Mapped[str] = mapped_column(String(50), unique=True, nullable=False)
    rule_name: Mapped[str] = mapped_column(String(255), nullable=False)
    rule_category: Mapped[str] = mapped_column(String(50), nullable=False)  # product, transaction, contract
    
    # Rule definition
    description: Mapped[str] = mapped_column(Text, nullable=False)
    condition: Mapped[str] = mapped_column(Text, nullable=False)  # JSON or expression
    violation_type: Mapped[ViolationType] = mapped_column(
        SQLEnum(ViolationType),
        nullable=False,
    )
    severity: Mapped[str] = mapped_column(String(20), default="high", nullable=False)
    
    # Applicability
    applies_to_products: Mapped[bool] = mapped_column(default=True, nullable=False)
    applies_to_transactions: Mapped[bool] = mapped_column(default=True, nullable=False)
    product_categories: Mapped[Optional[List[str]]] = mapped_column(ARRAY(String), nullable=True)
    
    # Status
    is_active: Mapped[bool] = mapped_column(default=True, nullable=False)
    
    # References
    shariah_reference: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    scholarly_opinion: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    
    # Indexes
    __table_args__ = (
        Index("ix_shariah_rules_category", "rule_category"),
        Index("ix_shariah_rules_active", "is_active"),
    )
