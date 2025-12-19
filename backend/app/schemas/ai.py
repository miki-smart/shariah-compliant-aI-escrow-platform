"""
AI Governance schemas
"""
from pydantic import BaseModel
from typing import Optional, Dict
from datetime import datetime
from uuid import UUID


class AIEvaluationRequest(BaseModel):
    """Schema for AI evaluation request"""
    order_id: UUID


class AIDecisionResponse(BaseModel):
    """Schema for AI decision response"""
    id: UUID
    order_id: UUID
    risk_score: float  # 0-1 normalized
    decision: str  # ALLOW, BLOCK, REVIEW
    confidence: float  # 0-1 confidence level
    explanation: Optional[str] = None  # Human-readable explanation
    reason: Optional[str] = None  # Legacy field
    fraud_detected: bool
    credit_risk_level: Optional[str] = None
    credit_risk_score: Optional[float] = None  # 0-1
    delivery_reliability_score: Optional[float] = None  # 0-1
    financial_dna_data: Optional[Dict] = None
    created_at: datetime
    updated_at: datetime
    
    class Config:
        from_attributes = True


class AIEvaluationReport(BaseModel):
    """Schema for AI evaluation report"""
    accuracy: float
    total_samples: int
    correct_predictions: int
    decision_distribution: Dict[str, int]
    expected_distribution: Dict[str, int]
    scenario_accuracy: Dict[str, float]
    report_text: str

