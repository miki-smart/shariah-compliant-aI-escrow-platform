"""
AI Governance Rule Engine
Rule-based logic for explainable AI decisions
"""
from typing import Dict, List, Tuple, Optional
from datetime import datetime, timedelta
from decimal import Decimal
import json


class RuleEngine:
    """Rule-based engine for explainable AI decisions"""
    
    # Risk thresholds
    LOW_RISK_THRESHOLD = 0.3
    MEDIUM_RISK_THRESHOLD = 0.6
    HIGH_RISK_THRESHOLD = 0.8
    
    # Decision thresholds
    ALLOW_THRESHOLD = 0.3
    REVIEW_THRESHOLD = 0.6
    BLOCK_THRESHOLD = 0.8
    
    @staticmethod
    def evaluate_credit_risk(
        buyer_verified: bool,
        order_amount: float,
        buyer_history: Optional[Dict] = None
    ) -> Tuple[float, List[str]]:
        """
        Evaluate credit risk using Financial DNA analysis
        Returns: (risk_score_0_to_1, explanations)
        """
        risk_score = 0.5  # Base risk
        explanations = []
        
        # Rule 1: Verification status
        if not buyer_verified:
            risk_score += 0.25
            explanations.append("Buyer account not verified")
        else:
            risk_score -= 0.15
            explanations.append("Buyer account verified")
        
        # Rule 2: Order amount analysis
        if order_amount > 50000:
            risk_score += 0.20
            explanations.append(f"High order amount: ${order_amount:,.2f}")
        elif order_amount > 20000:
            risk_score += 0.10
            explanations.append(f"Moderate order amount: ${order_amount:,.2f}")
        elif order_amount < 1000:
            risk_score -= 0.10
            explanations.append(f"Low order amount: ${order_amount:,.2f}")
        
        # Rule 3: Transaction history (if available)
        if buyer_history:
            total_transactions = buyer_history.get("total_transactions", 0)
            successful_rate = buyer_history.get("successful_rate", 0.0)
            avg_amount = buyer_history.get("avg_amount", 0.0)
            
            if total_transactions == 0:
                risk_score += 0.15
                explanations.append("No transaction history")
            elif total_transactions < 3:
                risk_score += 0.10
                explanations.append(f"Limited transaction history: {total_transactions} transactions")
            else:
                risk_score -= 0.10
                explanations.append(f"Established buyer: {total_transactions} transactions")
            
            if successful_rate < 0.7:
                risk_score += 0.15
                explanations.append(f"Low success rate: {successful_rate:.1%}")
            elif successful_rate > 0.95:
                risk_score -= 0.10
                explanations.append(f"Excellent success rate: {successful_rate:.1%}")
            
            if avg_amount > 0 and order_amount > avg_amount * 3:
                risk_score += 0.10
                explanations.append(f"Order amount significantly higher than average")
        
        # Normalize to 0-1 range
        risk_score = max(0.0, min(1.0, risk_score))
        
        return risk_score, explanations
    
    @staticmethod
    def detect_fraud(
        buyer_id: str,
        seller_id: str,
        order_amount: float,
        buyer_verified: bool,
        seller_verified: bool,
        transaction_history: Optional[Dict] = None
    ) -> Tuple[bool, float, List[str]]:
        """
        Detect fraudulent transaction patterns
        Returns: (fraud_detected, fraud_score_0_to_1, reasons)
        """
        fraud_score = 0.0
        reasons = []
        
        # Rule 1: Self-dealing detection
        if buyer_id == seller_id:
            fraud_score = 1.0
            reasons.append("CRITICAL: Buyer and seller are the same (self-dealing)")
            return True, fraud_score, reasons
        
        # Rule 2: Verification status
        if not buyer_verified:
            fraud_score += 0.30
            reasons.append("Buyer account not verified")
        
        if not seller_verified:
            fraud_score += 0.30
            reasons.append("Seller account not verified")
        
        # Rule 3: Unusually high amounts
        if order_amount > 100000:
            fraud_score += 0.25
            reasons.append(f"Extremely high order amount: ${order_amount:,.2f}")
        elif order_amount > 50000:
            fraud_score += 0.15
            reasons.append(f"Very high order amount: ${order_amount:,.2f}")
        
        # Rule 4: Transaction pattern analysis
        if transaction_history:
            recent_failed = transaction_history.get("recent_failed_transactions", 0)
            if recent_failed > 3:
                fraud_score += 0.20
                reasons.append(f"Multiple recent failed transactions: {recent_failed}")
            
            # Check for rapid transactions (potential money laundering)
            rapid_transactions = transaction_history.get("rapid_transactions_24h", 0)
            if rapid_transactions > 10:
                fraud_score += 0.25
                reasons.append(f"Suspicious: {rapid_transactions} transactions in 24 hours")
        
        # Rule 5: Round number amounts (potential fraud indicator)
        if order_amount % 1000 == 0 and order_amount > 10000:
            fraud_score += 0.10
            reasons.append("Round number amount (potential structuring)")
        
        fraud_detected = fraud_score >= 0.5
        fraud_score = max(0.0, min(1.0, fraud_score))
        
        return fraud_detected, fraud_score, reasons
    
    @staticmethod
    def detect_haram_products(
        product_category: str,
        product_name: str,
        product_description: Optional[str] = None,
        shariah_result: Optional[Dict] = None
    ) -> Tuple[bool, float, List[str]]:
        """
        Support Shariah service in detecting haram products
        Returns: (haram_detected, confidence_0_to_1, reasons)
        """
        confidence = 0.0
        reasons = []
        
        # If Shariah service already flagged it, trust that
        if shariah_result and shariah_result.get("haram_detected", False):
            confidence = 0.95
            reasons.append("Shariah service detected haram products")
            return True, confidence, reasons
        
        # AI support: Additional pattern detection
        search_text = f"{product_category} {product_name} {product_description or ''}".lower()
        
        haram_keywords = [
            "alcohol", "wine", "beer", "liquor", "spirits", "whiskey", "vodka",
            "pork", "bacon", "ham", "swine",
            "gambling", "casino", "betting", "lottery",
            "riba", "interest", "usury"
        ]
        
        for keyword in haram_keywords:
            if keyword in search_text:
                confidence += 0.20
                reasons.append(f"Potential haram keyword detected: {keyword}")
        
        haram_detected = confidence >= 0.3
        confidence = max(0.0, min(1.0, confidence))
        
        return haram_detected, confidence, reasons
    
    @staticmethod
    def evaluate_delivery_reliability(
        delivery_provider_id: Optional[str] = None,
        provider_history: Optional[Dict] = None,
        order_amount: float = 0.0
    ) -> Tuple[float, List[str]]:
        """
        Evaluate delivery provider reliability
        Returns: (reliability_score_0_to_1, explanations)
        """
        reliability = 0.7  # Base reliability
        explanations = []
        
        if provider_history:
            success_rate = provider_history.get("delivery_success_rate", 0.0)
            total_deliveries = provider_history.get("total_deliveries", 0)
            avg_delivery_time = provider_history.get("avg_delivery_time_hours", 0.0)
            failed_deliveries = provider_history.get("failed_deliveries", 0)
            
            # Rule 1: Success rate
            if success_rate > 0.95:
                reliability += 0.15
                explanations.append(f"Excellent delivery success rate: {success_rate:.1%}")
            elif success_rate > 0.85:
                reliability += 0.05
                explanations.append(f"Good delivery success rate: {success_rate:.1%}")
            elif success_rate < 0.70:
                reliability -= 0.20
                explanations.append(f"Low delivery success rate: {success_rate:.1%}")
            
            # Rule 2: Experience
            if total_deliveries > 100:
                reliability += 0.10
                explanations.append(f"Experienced provider: {total_deliveries} deliveries")
            elif total_deliveries < 10:
                reliability -= 0.10
                explanations.append(f"New provider: {total_deliveries} deliveries")
            
            # Rule 3: Delivery time
            if avg_delivery_time > 0:
                if avg_delivery_time < 24:
                    reliability += 0.05
                    explanations.append(f"Fast delivery: {avg_delivery_time:.1f} hours average")
                elif avg_delivery_time > 72:
                    reliability -= 0.10
                    explanations.append(f"Slow delivery: {avg_delivery_time:.1f} hours average")
            
            # Rule 4: Recent failures
            if failed_deliveries > 5:
                reliability -= 0.15
                explanations.append(f"Multiple failed deliveries: {failed_deliveries}")
        else:
            reliability -= 0.10
            explanations.append("No delivery provider history available")
        
        # Rule 5: Order value (higher value = more reliable tracking expected)
        if order_amount > 10000:
            reliability += 0.05
            explanations.append("High-value order (better tracking expected)")
        
        reliability = max(0.0, min(1.0, reliability))
        
        return reliability, explanations
    
    @staticmethod
    def detect_delivery_fraud(
        delivery: Dict,
        order: Dict,
        delivery_history: Optional[Dict] = None,
        buyer_seller_history: Optional[Dict] = None
    ) -> Tuple[bool, float, List[str]]:
        """
        Detect delivery fraud and anomalies
        Returns: (fraud_detected, fraud_score_0_to_1, reasons)
        """
        fraud_score = 0.0
        reasons = []
        
        if not delivery:
            return False, 0.0, []
        
        # Rule 1: Abnormal delivery timing
        if delivery.get("delivered_at") and delivery.get("estimated_delivery"):
            delivered_at = datetime.fromisoformat(delivery["delivered_at"].replace("Z", "+00:00"))
            estimated = datetime.fromisoformat(delivery["estimated_delivery"].replace("Z", "+00:00"))
            
            time_diff = abs((delivered_at - estimated).total_seconds() / 3600)
            
            # Too early (suspicious)
            if delivered_at < estimated - timedelta(hours=12):
                fraud_score += 0.30
                reasons.append(f"Delivery completed unusually early: {time_diff:.1f} hours before estimate")
            
            # Too late (potential issue)
            if delivered_at > estimated + timedelta(hours=48):
                fraud_score += 0.20
                reasons.append(f"Delivery significantly delayed: {time_diff:.1f} hours after estimate")
        
        # Rule 2: Repeated failed deliveries
        if delivery_history:
            recent_failures = delivery_history.get("recent_failed_deliveries", 0)
            if recent_failures > 2:
                fraud_score += 0.25
                reasons.append(f"Multiple recent delivery failures: {recent_failures}")
            
            failure_rate = delivery_history.get("failure_rate", 0.0)
            if failure_rate > 0.3:
                fraud_score += 0.20
                reasons.append(f"High delivery failure rate: {failure_rate:.1%}")
        
        # Rule 3: Buyer-seller collusion patterns
        if buyer_seller_history:
            same_day_transactions = buyer_seller_history.get("same_day_transactions", 0)
            if same_day_transactions > 5:
                fraud_score += 0.30
                reasons.append(f"Suspicious: {same_day_transactions} transactions between same buyer-seller on same day")
            
            rapid_confirmations = buyer_seller_history.get("rapid_confirmations", 0)
            if rapid_confirmations > 3:
                fraud_score += 0.25
                reasons.append(f"Pattern detected: {rapid_confirmations} rapid delivery confirmations")
        
        # Rule 4: Delivery status inconsistencies
        if delivery.get("status") == "DELIVERED" and not delivery.get("delivered_at"):
            fraud_score += 0.40
            reasons.append("Delivery marked as delivered but no delivery timestamp")
        
        if delivery.get("status") == "DELIVERED" and not delivery.get("buyer_confirmed"):
            fraud_score += 0.15
            reasons.append("Delivery completed but buyer not confirmed")
        
        fraud_detected = fraud_score >= 0.4
        fraud_score = max(0.0, min(1.0, fraud_score))
        
        return fraud_detected, fraud_score, reasons
    
    @staticmethod
    def calculate_overall_risk(
        credit_risk: float,
        fraud_score: float,
        haram_confidence: float,
        delivery_reliability: float,
        delivery_fraud_score: float
    ) -> float:
        """
        Calculate overall risk score (0-1)
        Weighted combination of all risk factors
        """
        # Weighted combination
        overall_risk = (
            credit_risk * 0.25 +           # 25% weight
            fraud_score * 0.30 +           # 30% weight (highest)
            haram_confidence * 0.20 +      # 20% weight
            (1.0 - delivery_reliability) * 0.10 +  # 10% weight (inverse)
            delivery_fraud_score * 0.15    # 15% weight
        )
        
        return max(0.0, min(1.0, overall_risk))
    
    @staticmethod
    def make_decision(
        overall_risk: float,
        fraud_detected: bool,
        haram_detected: bool,
        delivery_fraud_detected: bool
    ) -> Tuple[str, float]:
        """
        Make AI decision based on evaluation
        Returns: (decision, confidence)
        Decision: ALLOW, BLOCK, or REVIEW
        """
        # Hard blocks
        if fraud_detected or haram_detected:
            return "BLOCK", 0.95
        
        if delivery_fraud_detected and overall_risk > 0.7:
            return "BLOCK", 0.90
        
        # Decision based on risk score
        if overall_risk >= RuleEngine.BLOCK_THRESHOLD:
            return "BLOCK", 0.85
        elif overall_risk >= RuleEngine.REVIEW_THRESHOLD:
            return "REVIEW", 0.75
        elif overall_risk <= RuleEngine.ALLOW_THRESHOLD:
            return "ALLOW", 0.80
        else:
            return "REVIEW", 0.70
    
    @staticmethod
    def generate_explanation(
        decision: str,
        overall_risk: float,
        credit_risk: float,
        fraud_detected: bool,
        fraud_reasons: List[str],
        haram_detected: bool,
        haram_reasons: List[str],
        delivery_reliability: float,
        delivery_fraud_detected: bool,
        delivery_fraud_reasons: List[str],
        credit_explanations: List[str]
    ) -> str:
        """
        Generate human-readable explanation for the decision
        """
        explanation_parts = []
        
        explanation_parts.append(f"AI Decision: {decision}")
        explanation_parts.append(f"Overall Risk Score: {overall_risk:.2%}")
        
        # Credit risk
        explanation_parts.append(f"\nCredit Risk Analysis ({credit_risk:.2%}):")
        for exp in credit_explanations:
            explanation_parts.append(f"  • {exp}")
        
        # Fraud detection
        if fraud_detected:
            explanation_parts.append(f"\nFraud Detection: ALERT")
            for reason in fraud_reasons:
                explanation_parts.append(f"  • {reason}")
        else:
            explanation_parts.append("\nFraud Detection: No fraud indicators")
        
        # Haram detection
        if haram_detected:
            explanation_parts.append(f"\nShariah Compliance: HARAM DETECTED")
            for reason in haram_reasons:
                explanation_parts.append(f"  • {reason}")
        else:
            explanation_parts.append("\nShariah Compliance: No haram products detected")
        
        # Delivery analysis
        explanation_parts.append(f"\nDelivery Reliability: {delivery_reliability:.2%}")
        if delivery_fraud_detected:
            explanation_parts.append("Delivery Fraud: ALERT")
            for reason in delivery_fraud_reasons:
                explanation_parts.append(f"  • {reason}")
        
        # Decision rationale
        explanation_parts.append(f"\nDecision Rationale:")
        if decision == "BLOCK":
            explanation_parts.append("  Transaction blocked due to high risk or policy violations")
        elif decision == "REVIEW":
            explanation_parts.append("  Transaction requires manual review for risk assessment")
        else:
            explanation_parts.append("  Transaction approved based on risk assessment")
        
        return "\n".join(explanation_parts)


