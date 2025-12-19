"""
AI Governance Service
Ethical credit risk scoring, fraud detection, and delivery reliability validation
Uses rule-based logic for explainable AI decisions
"""
from sqlalchemy.orm import Session
from app.models.ai_decision import AIDecision
from app.models.order import Order, OrderStatus
from app.models.user import User
from app.models.product import Product
from app.models.delivery import Delivery
from app.models.shariah_result import ShariahResult
from app.services.ai_governance_rules import RuleEngine
from app.services.ai_mock_data import MockDataGenerator
from app.core.logging import get_logger
from typing import Dict, Optional, Tuple, List
from uuid import UUID
from datetime import datetime, timedelta
from decimal import Decimal

logger = get_logger(__name__)


class AIService:
    """AI Governance service with explainable rule-based decisions"""
    
    @staticmethod
    def evaluate_order(db: Session, order_id: UUID) -> AIDecision:
        """
        Evaluate order using AI governance
        Performs:
        - Ethical credit risk scoring (Financial DNA)
        - Fraud & anomaly detection
        - Haram product detection support
        - Delivery reliability validation
        - Escrow decision recommendations
        
        Returns: AIDecision with ALLOW/BLOCK/REVIEW decision
        """
        order = db.query(Order).filter(Order.id == order_id).first()
        if not order:
            raise ValueError(f"Order {order_id} not found")
        
        buyer = db.query(User).filter(User.id == order.buyer_id).first()
        seller = db.query(User).filter(User.id == order.seller_id).first()
        product = db.query(Product).filter(Product.id == order.product_id).first()
        
        if not buyer or not seller or not product:
            raise ValueError("Buyer, seller, or product not found")
        
        # Get Shariah result if available
        shariah_result = db.query(ShariahResult).filter(
            ShariahResult.order_id == order_id
        ).first()
        
        shariah_data = None
        if shariah_result:
            shariah_data = {
                "haram_detected": shariah_result.haram_products_detected,
                "compliant": shariah_result.compliant,
                "violations": shariah_result.violations
            }
        
        # Gather transaction history (mock for MVP, real data in production)
        buyer_history = AIService._get_buyer_history(db, buyer.id, order)
        delivery_provider_history = AIService._get_delivery_provider_history(db, order)
        buyer_seller_history = AIService._get_buyer_seller_history(db, buyer.id, seller.id)
        delivery_history = AIService._get_delivery_history(db, order)
        
        # 1. Credit Risk Scoring (Financial DNA)
        credit_risk, credit_explanations = RuleEngine.evaluate_credit_risk(
            buyer_verified=buyer.verified,
            order_amount=float(order.total_amount),
            buyer_history=buyer_history
        )
        
        # 2. Fraud Detection
        fraud_detected, fraud_score, fraud_reasons = RuleEngine.detect_fraud(
            buyer_id=str(buyer.id),
            seller_id=str(seller.id),
            order_amount=float(order.total_amount),
            buyer_verified=buyer.verified,
            seller_verified=seller.verified,
            transaction_history=buyer_history
        )
        
        # 3. Haram Product Detection Support
        haram_detected, haram_confidence, haram_reasons = RuleEngine.detect_haram_products(
            product_category=product.category,
            product_name=product.name,
            product_description=product.description,
            shariah_result=shariah_data
        )
        
        # 4. Delivery Reliability Evaluation
        delivery_reliability, delivery_explanations = RuleEngine.evaluate_delivery_reliability(
            delivery_provider_id=str(order.delivery.provider_id) if order.delivery else None,
            provider_history=delivery_provider_history,
            order_amount=float(order.total_amount)
        )
        
        # 5. Delivery Fraud Detection
        delivery_data = AIService._get_delivery_data(order)
        delivery_fraud_detected, delivery_fraud_score, delivery_fraud_reasons = RuleEngine.detect_delivery_fraud(
            delivery=delivery_data,
            order=AIService._get_order_data(order),
            delivery_history=delivery_history,
            buyer_seller_history=buyer_seller_history
        )
        
        # 6. Calculate Overall Risk Score (0-1)
        overall_risk = RuleEngine.calculate_overall_risk(
            credit_risk=credit_risk,
            fraud_score=fraud_score,
            haram_confidence=haram_confidence,
            delivery_reliability=delivery_reliability,
            delivery_fraud_score=delivery_fraud_score
        )
        
        # 7. Make Decision
        decision, confidence = RuleEngine.make_decision(
            overall_risk=overall_risk,
            fraud_detected=fraud_detected,
            haram_detected=haram_detected,
            delivery_fraud_detected=delivery_fraud_detected
        )
        
        # 8. Generate Explanation
        explanation = RuleEngine.generate_explanation(
            decision=decision,
            overall_risk=overall_risk,
            credit_risk=credit_risk,
            fraud_detected=fraud_detected,
            fraud_reasons=fraud_reasons,
            haram_detected=haram_detected,
            haram_reasons=haram_reasons,
            delivery_reliability=delivery_reliability,
            delivery_fraud_detected=delivery_fraud_detected,
            delivery_fraud_reasons=delivery_fraud_reasons,
            credit_explanations=credit_explanations
        )
        
        # Build Financial DNA data
        financial_dna = {
            "credit_risk_score": float(credit_risk),
            "credit_risk_level": AIService._get_risk_level(credit_risk),
            "fraud_detected": fraud_detected,
            "fraud_score": float(fraud_score),
            "fraud_indicators": fraud_reasons,
            "haram_detected": haram_detected,
            "haram_confidence": float(haram_confidence),
            "delivery_reliability": float(delivery_reliability),
            "delivery_fraud_detected": delivery_fraud_detected,
            "delivery_fraud_score": float(delivery_fraud_score),
            "buyer_verification_status": buyer.verified,
            "seller_verification_status": seller.verified,
            "order_amount": float(order.total_amount),
            "overall_risk_score": float(overall_risk),
            "decision": decision,
            "confidence": float(confidence),
            "evaluation_timestamp": datetime.utcnow().isoformat()
        }
        
        # Create or update AI decision
        ai_decision = db.query(AIDecision).filter(
            AIDecision.order_id == order_id
        ).first()
        
        if ai_decision:
            ai_decision.risk_score = Decimal(str(overall_risk))
            ai_decision.decision = decision
            ai_decision.confidence = Decimal(str(confidence))
            ai_decision.explanation = explanation
            ai_decision.reason = explanation  # Legacy field
            ai_decision.fraud_detected = fraud_detected
            ai_decision.credit_risk_level = AIService._get_risk_level(credit_risk)
            ai_decision.credit_risk_score = Decimal(str(credit_risk))
            ai_decision.delivery_reliability_score = Decimal(str(delivery_reliability))
            ai_decision.financial_dna_data = financial_dna
            ai_decision.updated_at = datetime.utcnow()
        else:
            ai_decision = AIDecision(
                order_id=order_id,
                risk_score=Decimal(str(overall_risk)),
                decision=decision,
                confidence=Decimal(str(confidence)),
                explanation=explanation,
                reason=explanation,  # Legacy field
                fraud_detected=fraud_detected,
                credit_risk_level=AIService._get_risk_level(credit_risk),
                credit_risk_score=Decimal(str(credit_risk)),
                delivery_reliability_score=Decimal(str(delivery_reliability)),
                financial_dna_data=financial_dna
            )
            db.add(ai_decision)
        
        # Update order status based on decision
        if decision == "ALLOW":
            order.status = OrderStatus.AI_APPROVED
        elif decision == "BLOCK":
            order.status = OrderStatus.AI_REJECTED
        else:  # REVIEW
            order.status = OrderStatus.AI_PENDING
        
        db.commit()
        db.refresh(ai_decision)
        
        logger.info(
            f"AI evaluation completed for order {order_id}: "
            f"decision={decision}, risk_score={overall_risk:.2%}, confidence={confidence:.2%}, "
            f"fraud={fraud_detected}, haram={haram_detected}"
        )
        
        return ai_decision
    
    @staticmethod
    def _get_risk_level(score: float) -> str:
        """Convert risk score (0-1) to risk level"""
        if score < RuleEngine.LOW_RISK_THRESHOLD:
            return "LOW"
        elif score < RuleEngine.MEDIUM_RISK_THRESHOLD:
            return "MEDIUM"
        else:
            return "HIGH"
    
    @staticmethod
    def _get_buyer_history(db: Session, buyer_id: UUID, order: Order) -> Optional[Dict]:
        """
        Get buyer transaction history
        For MVP: Returns mock data. In production, query actual transaction history.
        """
        # Query actual order history
        past_orders = db.query(Order).filter(
            Order.buyer_id == buyer_id,
            Order.id != order.id
        ).all()
        
        if len(past_orders) == 0:
            return None
        
        total_transactions = len(past_orders)
        successful_orders = [o for o in past_orders if o.status.value in [
            "ESCROW_RELEASED", "DELIVERED"
        ]]
        successful_transactions = len(successful_orders)
        successful_rate = successful_transactions / total_transactions if total_transactions > 0 else 0.0
        
        amounts = [float(o.total_amount) for o in past_orders]
        avg_amount = sum(amounts) / len(amounts) if amounts else 0.0
        
        # Check for recent failures
        recent_failed = len([o for o in past_orders 
                           if o.status.value in ["AI_REJECTED", "BANK_REJECTED", "DELIVERY_FAILED"]
                           and (datetime.utcnow() - o.created_at).days < 30])
        
        return {
            "total_transactions": total_transactions,
            "successful_transactions": successful_transactions,
            "successful_rate": successful_rate,
            "avg_amount": avg_amount,
            "recent_failed_transactions": recent_failed,
            "rapid_transactions_24h": 0  # Would need timestamp analysis
        }
    
    @staticmethod
    def _get_delivery_provider_history(db: Session, order: Order) -> Optional[Dict]:
        """
        Get delivery provider history
        For MVP: Returns mock data. In production, query actual delivery history.
        """
        if not order.delivery:
            return None
        
        provider_id = order.delivery.provider_id
        
        # Query actual delivery history
        provider_deliveries = db.query(Delivery).filter(
            Delivery.provider_id == provider_id
        ).all()
        
        if len(provider_deliveries) == 0:
            return None
        
        total_deliveries = len(provider_deliveries)
        successful_deliveries = [d for d in provider_deliveries 
                                if d.status.value == "DELIVERED"]
        delivery_success_rate = len(successful_deliveries) / total_deliveries if total_deliveries > 0 else 0.0
        failed_deliveries = total_deliveries - len(successful_deliveries)
        
        # Calculate average delivery time (simplified)
        avg_delivery_time = 48.0  # Would need actual calculation from timestamps
        
        recent_failed = len([d for d in provider_deliveries 
                            if d.status.value == "FAILED"
                            and (datetime.utcnow() - d.created_at).days < 30])
        
        return {
            "provider_id": str(provider_id),
            "total_deliveries": total_deliveries,
            "delivery_success_rate": delivery_success_rate,
            "failed_deliveries": failed_deliveries,
            "avg_delivery_time_hours": avg_delivery_time,
            "recent_failed_deliveries": recent_failed
        }
    
    @staticmethod
    def _get_buyer_seller_history(db: Session, buyer_id: UUID, seller_id: UUID) -> Optional[Dict]:
        """
        Get buyer-seller transaction history (for collusion detection)
        """
        # Query orders between same buyer-seller
        orders = db.query(Order).filter(
            Order.buyer_id == buyer_id,
            Order.seller_id == seller_id
        ).all()
        
        if len(orders) == 0:
            return None
        
        # Check for same-day transactions
        same_day_transactions = 0
        rapid_confirmations = 0
        
        # Group by date
        from collections import defaultdict
        by_date = defaultdict(int)
        for order in orders:
            date_key = order.created_at.date()
            by_date[date_key] += 1
        
        same_day_transactions = sum(1 for count in by_date.values() if count > 1)
        
        return {
            "buyer_id": str(buyer_id),
            "seller_id": str(seller_id),
            "same_day_transactions": same_day_transactions,
            "rapid_confirmations": rapid_confirmations
        }
    
    @staticmethod
    def _get_delivery_history(db: Session, order: Order) -> Optional[Dict]:
        """Get delivery history for fraud detection"""
        if not order.delivery:
            return None
        
        provider_id = order.delivery.provider_id
        
        # Query recent deliveries
        recent_deliveries = db.query(Delivery).filter(
            Delivery.provider_id == provider_id,
            Delivery.created_at >= datetime.utcnow() - timedelta(days=30)
        ).all()
        
        if len(recent_deliveries) == 0:
            return None
        
        failed = [d for d in recent_deliveries if d.status.value == "FAILED"]
        failure_rate = len(failed) / len(recent_deliveries) if recent_deliveries else 0.0
        
        return {
            "provider_id": str(provider_id),
            "recent_failed_deliveries": len(failed),
            "failure_rate": failure_rate
        }
    
    @staticmethod
    def _get_delivery_data(order: Order) -> Dict:
        """Extract delivery data for fraud detection"""
        if not order.delivery:
            return {}
        
        delivery = order.delivery
        return {
            "status": delivery.status.value,
            "estimated_delivery": delivery.estimated_delivery.isoformat() if delivery.estimated_delivery else None,
            "delivered_at": delivery.delivered_at.isoformat() if delivery.delivered_at else None,
            "buyer_confirmed": delivery.buyer_confirmed == "True"
        }
    
    @staticmethod
    def _get_order_data(order: Order) -> Dict:
        """Extract order data for analysis"""
        return {
            "id": str(order.id),
            "buyer_id": str(order.buyer_id),
            "seller_id": str(order.seller_id),
            "total_amount": float(order.total_amount),
            "created_at": order.created_at.isoformat()
        }
    
    @staticmethod
    def validate_delivery(db: Session, order_id: UUID) -> bool:
        """
        Validate delivery legitimacy using AI
        Detects abnormal timing, repeated failures, and collusion patterns
        Returns True if delivery is legitimate
        """
        order = db.query(Order).filter(Order.id == order_id).first()
        if not order:
            raise ValueError(f"Order {order_id} not found")
        
        delivery = order.delivery
        if not delivery:
            return False
        
        if delivery.status.value != "DELIVERED":
            return False
        
        if not delivery.delivered_at:
            return False
        
        # Use rule engine to detect delivery fraud
        delivery_data = AIService._get_delivery_data(order)
        delivery_history = AIService._get_delivery_history(db, order)
        buyer_seller_history = AIService._get_buyer_seller_history(db, order.buyer_id, order.seller_id)
        
        delivery_fraud_detected, delivery_fraud_score, _ = RuleEngine.detect_delivery_fraud(
            delivery=delivery_data,
            order=AIService._get_order_data(order),
            delivery_history=delivery_history,
            buyer_seller_history=buyer_seller_history
        )
        
        # Delivery is legitimate if fraud score is low
        return not delivery_fraud_detected and delivery_fraud_score < 0.4
    
    @staticmethod
    def get_ai_decision(db: Session, order_id: UUID) -> AIDecision:
        """Get AI decision for an order"""
        decision = db.query(AIDecision).filter(
            AIDecision.order_id == order_id
        ).first()
        
        if not decision:
            raise ValueError(f"AI decision not found for order {order_id}")
        
        return decision
    
    @staticmethod
    def run_evaluation(
        num_samples: int = 100,
        fraud_ratio: float = 0.2,
        haram_ratio: float = 0.1
    ) -> Dict:
        """
        Run AI model evaluation using mock datasets
        Returns evaluation metrics and report
        """
        from app.services.ai_evaluation import AIEvaluator
        
        metrics = AIEvaluator.run_evaluation(
            num_samples=num_samples,
            fraud_ratio=fraud_ratio,
            haram_ratio=haram_ratio
        )
        
        report_text = AIEvaluator.generate_evaluation_report(metrics)
        metrics["report_text"] = report_text
        
        return metrics
