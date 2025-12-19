"""
AI Decision model
Records AI governance decisions for orders
"""
from sqlalchemy import Column, String, Text, ForeignKey, Numeric, Boolean, Index
from sqlalchemy import Enum as SQLEnum
from sqlalchemy.dialects.postgresql import UUID, JSONB
from sqlalchemy.orm import Mapped, mapped_column, relationship
from typing import Optional, TYPE_CHECKING
import uuid
import enum
from decimal import Decimal

from app.models.base import BaseModel, AuditMixin

if TYPE_CHECKING:
    from app.models.order import Order


class AIDecisionType(str, enum.Enum):
    """AI decision outcomes"""
    ALLOW = "allow"
    BLOCK = "block"
    REVIEW = "review"


class CreditRiskLevel(str, enum.Enum):
    """Credit risk classification"""
    LOW = "low"
    MEDIUM = "medium"
    HIGH = "high"


class AIDecision(BaseModel, AuditMixin):
    """
    AI Governance Decision model.
    Records risk assessments, fraud detection, and delivery validation results.
    """
    __tablename__ = "ai_decisions"
    
    # Link to order (one-to-one)
    order_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("orders.id"),
        unique=True,
        nullable=False,
        index=True,
    )
    
    # Risk assessment
    risk_score: Mapped[Decimal] = mapped_column(
        Numeric(5, 4),
        nullable=False,
        comment="Overall risk score 0-1 (normalized)"
    )
    decision: Mapped[AIDecisionType] = mapped_column(
        SQLEnum(AIDecisionType),
        nullable=False,
    )
    confidence: Mapped[Decimal] = mapped_column(
        Numeric(5, 4),
        nullable=False,
        comment="Confidence level 0-1"
    )
    
    # Explanation
    explanation: Mapped[Optional[str]] = mapped_column(
        Text,
        nullable=True,
        comment="Human-readable explanation of decision"
    )
    reason: Mapped[Optional[str]] = mapped_column(
        Text,
        nullable=True,
        comment="Legacy field for backward compatibility"
    )
    
    # Fraud detection
    fraud_detected: Mapped[bool] = mapped_column(default=False, nullable=False)
    fraud_indicators: Mapped[Optional[dict]] = mapped_column(
        JSONB,
        nullable=True,
        comment="Detected fraud patterns and indicators"
    )
    fraud_score: Mapped[Optional[Decimal]] = mapped_column(Numeric(5, 4), nullable=True)
    
    # Credit risk assessment
    credit_risk_level: Mapped[Optional[CreditRiskLevel]] = mapped_column(
        SQLEnum(CreditRiskLevel),
        nullable=True,
    )
    credit_risk_score: Mapped[Optional[Decimal]] = mapped_column(
        Numeric(5, 4),
        nullable=True,
        comment="Credit risk score 0-1"
    )
    
    # Delivery risk assessment
    delivery_reliability_score: Mapped[Optional[Decimal]] = mapped_column(
        Numeric(5, 4),
        nullable=True,
        comment="Delivery reliability score 0-1"
    )
    delivery_risk_factors: Mapped[Optional[dict]] = mapped_column(
        JSONB,
        nullable=True,
        comment="Factors affecting delivery risk"
    )
    
    # Financial DNA analysis
    financial_dna_data: Mapped[Optional[dict]] = mapped_column(
        JSONB,
        nullable=True,
        comment="Buyer financial DNA analysis data"
    )
    
    # Model metadata
    model_version: Mapped[Optional[str]] = mapped_column(String(50), nullable=True)
    evaluation_method: Mapped[str] = mapped_column(
        String(50),
        default="rule_based",
        nullable=False,
    )  # rule_based, ml_model, hybrid
    
    # Override info
    was_overridden: Mapped[bool] = mapped_column(default=False, nullable=False)
    override_by: Mapped[Optional[uuid.UUID]] = mapped_column(UUID(as_uuid=True), nullable=True)
    override_reason: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    original_decision: Mapped[Optional[str]] = mapped_column(String(20), nullable=True)
    
    # Detailed report
    detailed_report: Mapped[Optional[dict]] = mapped_column(
        JSONB,
        nullable=True,
        comment="Full AI evaluation report"
    )
    
    # Relationships
    order: Mapped["Order"] = relationship("Order", back_populates="ai_decision")
    
    # Indexes
    __table_args__ = (
        Index("ix_ai_decisions_decision", "decision"),
        Index("ix_ai_decisions_risk", "risk_score"),
    )
    
    @property
    def is_approved(self) -> bool:
        return self.decision == AIDecisionType.ALLOW
    
    @property
    def is_rejected(self) -> bool:
        return self.decision == AIDecisionType.BLOCK
    
    @property
    def needs_review(self) -> bool:
        return self.decision == AIDecisionType.REVIEW
    
    def override(
        self,
        new_decision: AIDecisionType,
        overrider_id: uuid.UUID,
        reason: str
    ) -> None:
        """Override AI decision (by bank or admin)"""
        self.original_decision = self.decision.value
        self.decision = new_decision
        self.was_overridden = True
        self.override_by = overrider_id
        self.override_reason = reason
    
    def __repr__(self) -> str:
        return f"<AIDecision(id={self.id}, order_id={self.order_id}, decision={self.decision}, risk_score={self.risk_score})>"

