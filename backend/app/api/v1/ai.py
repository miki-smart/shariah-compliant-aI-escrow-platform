"""
AI Governance API endpoints
"""
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from uuid import UUID

from app.core.dependencies import (
    get_database_session,
    get_authenticated_user
)
from app.schemas.ai import AIEvaluationRequest, AIDecisionResponse, AIEvaluationReport
from app.services.ai_service import AIService
from app.services.orchestration_service import OrchestrationService
from pydantic import BaseModel
from typing import Optional

router = APIRouter()


class EvaluationRequest(BaseModel):
    """Request schema for AI evaluation"""
    num_samples: Optional[int] = 100
    fraud_ratio: Optional[float] = 0.2
    haram_ratio: Optional[float] = 0.1


@router.post("/evaluate", response_model=AIDecisionResponse)
async def evaluate_ai_risk(
    request: AIEvaluationRequest,
    db: Session = Depends(get_database_session),
    user: dict = Depends(get_authenticated_user)
):
    """
    Evaluate order using AI governance
    Performs credit risk scoring, fraud detection, and delivery reliability validation
    Returns: ALLOW, BLOCK, or REVIEW decision with risk score (0-1) and explanation
    """
    try:
        decision = AIService.evaluate_order(db, request.order_id)
        
        # If ALLOW, automatically move to bank pending
        if decision.decision == "ALLOW":
            order = OrchestrationService.get_order(db, request.order_id)
            if order.status.value == "AI_APPROVED":
                order.status = OrchestrationService.evaluate_ai_risk(
                    db, request.order_id
                ).status
        
        return AIDecisionResponse.model_validate(decision)
        
    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e)
        )


@router.get("/order/{order_id}", response_model=AIDecisionResponse)
async def get_ai_decision(
    order_id: UUID,
    db: Session = Depends(get_database_session),
    user: dict = Depends(get_authenticated_user)
):
    """
    Get AI decision for an order
    """
    try:
        decision = AIService.get_ai_decision(db, order_id)
        return AIDecisionResponse.model_validate(decision)
        
    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=str(e)
        )


@router.post("/validate-delivery", response_model=dict)
async def validate_delivery_ai(
    order_id: UUID,
    db: Session = Depends(get_database_session),
    user: dict = Depends(get_authenticated_user)
):
    """
    Validate delivery legitimacy using AI
    Detects abnormal timing, repeated failures, and collusion patterns
    """
    try:
        validated = AIService.validate_delivery(db, order_id)
        
        return {
            "order_id": str(order_id),
            "ai_validated": validated,
            "message": "Delivery validated by AI" if validated else "Delivery validation failed - fraud indicators detected"
        }
        
    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e)
        )


@router.post("/evaluate-model", response_model=dict)
async def evaluate_ai_model(
    request: EvaluationRequest,
    db: Session = Depends(get_database_session),
    user: dict = Depends(get_authenticated_user)
):
    """
    Run AI model evaluation using mock datasets
    Generates synthetic data and evaluates model performance
    Returns accuracy metrics and evaluation report
    """
    try:
        metrics = AIService.run_evaluation(
            num_samples=request.num_samples,
            fraud_ratio=request.fraud_ratio,
            haram_ratio=request.haram_ratio
        )
        
        return {
            "accuracy": metrics["accuracy"],
            "total_samples": metrics["total_samples"],
            "correct_predictions": metrics["correct_predictions"],
            "decision_distribution": metrics["decision_distribution"],
            "expected_distribution": metrics["expected_distribution"],
            "scenario_accuracy": metrics["scenario_accuracy"],
            "report": metrics["report_text"]
        }
        
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Evaluation failed: {str(e)}"
        )

