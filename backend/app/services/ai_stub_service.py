"""
AI Stub Service
Configurable AI service stub for testing different scenarios
"""
from typing import Optional, Dict, Any, Tuple
from uuid import UUID
from datetime import datetime, timezone
from decimal import Decimal
import os
import random

from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from app.models.order import Order, AIApprovalStatus
from app.models.ai_decision import AIDecision
from app.core.logging import get_logger

logger = get_logger(__name__)


# Default AI response configuration
# Can be overridden by environment variables or request headers
DEFAULT_AI_CONFIG = {
    "response": "APPROVED",  # APPROVED, REJECTED, PENDING_REVIEW
    "confidence": 0.85,
    "risk_score": 0.15,
    "fraud_detected": False,
    "delivery_reliability": 0.90,
}

# Mock scenarios for different products/orders
MOCK_SCENARIOS = {
    "high_risk": {
        "response": "REJECTED",
        "confidence": 0.92,
        "risk_score": 0.85,
        "fraud_detected": True,
        "delivery_reliability": 0.30,
        "explanation": "High fraud risk detected. Multiple risk indicators present.",
    },
    "review_needed": {
        "response": "PENDING_REVIEW",
        "confidence": 0.65,
        "risk_score": 0.45,
        "fraud_detected": False,
        "delivery_reliability": 0.60,
        "explanation": "Borderline case requiring human review. Risk score is moderate.",
    },
    "approved": {
        "response": "APPROVED",
        "confidence": 0.95,
        "risk_score": 0.10,
        "fraud_detected": False,
        "delivery_reliability": 0.95,
        "explanation": "Transaction approved. All risk indicators within acceptable limits.",
    },
}


class AIStubService:
    """
    Configurable AI service stub for testing.
    
    Response can be controlled via:
    1. Environment variable: AI_MOCK_RESPONSE (APPROVED, REJECTED, PENDING_REVIEW)
    2. Request header: X-AI-Mock-Response
    3. Request header: X-AI-Mock-Scenario (high_risk, review_needed, approved)
    4. Default configuration
    """
    
    def __init__(self, db: AsyncSession):
        self.db = db
    
    def get_mock_config(
        self,
        header_response: Optional[str] = None,
        header_scenario: Optional[str] = None,
    ) -> Dict[str, Any]:
        """
        Get mock configuration based on environment and headers.
        
        Priority:
        1. Scenario header (if valid)
        2. Response header
        3. Environment variable
        4. Default config
        """
        # Check scenario header first
        if header_scenario and header_scenario.lower() in MOCK_SCENARIOS:
            return MOCK_SCENARIOS[header_scenario.lower()]
        
        # Check response header
        if header_response:
            response = header_response.upper()
            if response in ["APPROVED", "REJECTED", "PENDING_REVIEW"]:
                config = DEFAULT_AI_CONFIG.copy()
                config["response"] = response
                if response == "REJECTED":
                    config["risk_score"] = 0.75
                    config["fraud_detected"] = True
                    config["explanation"] = "Transaction rejected via mock override."
                elif response == "PENDING_REVIEW":
                    config["risk_score"] = 0.50
                    config["explanation"] = "Transaction flagged for review via mock override."
                else:
                    config["explanation"] = "Transaction approved via mock override."
                return config
        
        # Check environment variable
        env_response = os.environ.get("AI_MOCK_RESPONSE", "").upper()
        if env_response in ["APPROVED", "REJECTED", "PENDING_REVIEW"]:
            config = DEFAULT_AI_CONFIG.copy()
            config["response"] = env_response
            config["explanation"] = f"Transaction {env_response.lower()} via environment configuration."
            return config
        
        # Return default
        config = DEFAULT_AI_CONFIG.copy()
        config["explanation"] = "Transaction approved. Standard evaluation passed."
        return config
    
    async def evaluate_order(
        self,
        order_id: UUID,
        header_response: Optional[str] = None,
        header_scenario: Optional[str] = None,
    ) -> Tuple[AIDecision, Dict[str, Any]]:
        """
        Evaluate an order using mock AI logic.
        
        Returns (AIDecision, evaluation_details)
        """
        # Get order
        result = await self.db.execute(
            select(Order).where(Order.id == order_id)
        )
        order = result.scalar_one_or_none()
        
        if not order:
            raise ValueError(f"Order {order_id} not found")
        
        # Get mock config
        config = self.get_mock_config(header_response, header_scenario)
        
        # Map response to AIApprovalStatus
        status_map = {
            "APPROVED": AIApprovalStatus.APPROVED,
            "REJECTED": AIApprovalStatus.REJECTED,
            "PENDING_REVIEW": AIApprovalStatus.PENDING_REVIEW,
        }
        ai_status = status_map.get(config["response"], AIApprovalStatus.PENDING)
        
        # Check if AI decision already exists
        existing_result = await self.db.execute(
            select(AIDecision).where(AIDecision.order_id == order_id)
        )
        ai_decision = existing_result.scalar_one_or_none()
        
        now = datetime.now(timezone.utc)
        
        if ai_decision:
            # Update existing decision
            ai_decision.decision = config["response"]
            ai_decision.risk_score = config["risk_score"]
            ai_decision.confidence = config["confidence"]
            ai_decision.fraud_detected = config["fraud_detected"]
            ai_decision.delivery_reliability_score = config["delivery_reliability"]
            ai_decision.explanation = config.get("explanation", "")
            ai_decision.evaluated_at = now
        else:
            # Create new decision
            ai_decision = AIDecision(
                order_id=order_id,
                decision=config["response"],
                risk_score=config["risk_score"],
                confidence=config["confidence"],
                fraud_detected=config["fraud_detected"],
                delivery_reliability_score=config["delivery_reliability"],
                explanation=config.get("explanation", ""),
                credit_risk_level="low" if config["risk_score"] < 0.3 else ("medium" if config["risk_score"] < 0.6 else "high"),
                credit_risk_score=1 - config["risk_score"],
                model_version="stub-v1.0",
                evaluated_at=now,
            )
            self.db.add(ai_decision)
        
        # Update order AI status
        order.ai_approval_status = ai_status
        order.ai_evaluated_at = now
        
        # Update escrow release condition if escrow exists
        from app.models.escrow import Escrow
        escrow_result = await self.db.execute(
            select(Escrow).where(Escrow.order_id == order_id, Escrow.is_deleted == False)
        )
        escrow = escrow_result.scalar_one_or_none()
        if escrow:
            is_approved = ai_status == AIApprovalStatus.APPROVED
            escrow.update_release_condition("ai_approved", is_approved)
        
        await self.db.commit()
        await self.db.refresh(ai_decision)
        
        logger.info(
            f"AI evaluation completed for order {order_id}: {config['response']}",
            extra={
                "order_id": str(order_id),
                "decision": config["response"],
                "risk_score": config["risk_score"],
                "is_mock": True,
            }
        )
        
        evaluation_details = {
            "decision": config["response"],
            "risk_score": config["risk_score"],
            "confidence": config["confidence"],
            "fraud_detected": config["fraud_detected"],
            "delivery_reliability": config["delivery_reliability"],
            "explanation": config.get("explanation", ""),
            "is_mock": True,
            "mock_scenario": header_scenario,
        }
        
        return ai_decision, evaluation_details
    
    async def get_decision(self, order_id: UUID) -> Optional[AIDecision]:
        """Get existing AI decision for an order"""
        result = await self.db.execute(
            select(AIDecision).where(AIDecision.order_id == order_id)
        )
        return result.scalar_one_or_none()
    
    async def get_approval_status(self, order_id: UUID) -> Dict[str, Any]:
        """Get AI approval status for release gate check"""
        decision = await self.get_decision(order_id)
        
        if not decision:
            return {
                "is_approved": False,
                "status": "PENDING",
                "reason": "AI evaluation not yet performed",
            }
        
        is_approved = decision.decision == "APPROVED"
        
        return {
            "is_approved": is_approved,
            "status": decision.decision,
            "reason": decision.explanation or "",
            "risk_score": decision.risk_score,
            "confidence": decision.confidence,
            "evaluated_at": decision.evaluated_at.isoformat() if decision.evaluated_at else None,
        }


async def get_ai_stub_service(db: AsyncSession) -> AIStubService:
    """Dependency for getting AIStubService"""
    return AIStubService(db)
