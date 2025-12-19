"""
AI Decision model
"""
from sqlalchemy import Column, String, Text, DateTime, ForeignKey, Numeric, Boolean
from sqlalchemy.dialects.postgresql import UUID, JSONB
from sqlalchemy.orm import relationship
from app.core.database import Base
import uuid
from datetime import datetime


class AIDecision(Base):
    """AI Governance Decision model"""
    __tablename__ = "ai_decisions"
    
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    order_id = Column(UUID(as_uuid=True), ForeignKey("orders.id"), unique=True, nullable=False, index=True)
    risk_score = Column(Numeric(5, 4), nullable=False)  # 0-1 (normalized)
    decision = Column(String, nullable=False)  # ALLOW, BLOCK, REVIEW
    confidence = Column(Numeric(5, 4), nullable=False)  # 0-1 confidence level
    explanation = Column(Text, nullable=True)  # Human-readable explanation
    reason = Column(Text, nullable=True)  # Legacy field for backward compatibility
    fraud_detected = Column(Boolean, default=False, nullable=False)
    credit_risk_level = Column(String, nullable=True)  # LOW, MEDIUM, HIGH
    credit_risk_score = Column(Numeric(5, 4), nullable=True)  # 0-1
    delivery_reliability_score = Column(Numeric(5, 4), nullable=True)  # 0-1
    financial_dna_data = Column(JSONB, nullable=True)  # Store AI analysis data
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    # Relationships
    order = relationship("Order", back_populates="ai_decision")
    
    def __repr__(self):
        return f"<AIDecision(id={self.id}, order_id={self.order_id}, decision={self.decision}, risk_score={self.risk_score})>"

