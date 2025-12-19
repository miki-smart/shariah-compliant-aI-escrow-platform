"""
AI Model Evaluation Logic
Evaluates AI decision performance using mock datasets
"""
from typing import Dict, List, Tuple
from app.services.ai_governance_rules import RuleEngine
from app.services.ai_mock_data import MockDataGenerator
import json


class AIEvaluator:
    """Evaluate AI model performance"""
    
    @staticmethod
    def evaluate_scenario(scenario: Dict) -> Dict:
        """
        Evaluate a single scenario using the rule engine
        Returns evaluation result with decision, risk score, and explanation
        """
        order = scenario["order"]
        buyer = scenario["buyer"]
        seller = scenario["seller"]
        product = scenario["product"]
        provider_history = scenario["delivery_provider"]["history"]
        buyer_seller_history = scenario["buyer_seller_history"]
        delivery_history = scenario["delivery_history"]
        
        # 1. Credit Risk Evaluation
        credit_risk, credit_explanations = RuleEngine.evaluate_credit_risk(
            buyer_verified=buyer["verified"],
            order_amount=order["order_amount"],
            buyer_history=buyer.get("history")
        )
        
        # 2. Fraud Detection
        fraud_detected, fraud_score, fraud_reasons = RuleEngine.detect_fraud(
            buyer_id=buyer["id"],
            seller_id=seller["id"],
            order_amount=order["order_amount"],
            buyer_verified=buyer["verified"],
            seller_verified=seller["verified"],
            transaction_history=buyer.get("history")
        )
        
        # 3. Haram Product Detection
        haram_detected, haram_confidence, haram_reasons = RuleEngine.detect_haram_products(
            product_category=product["category"],
            product_name=product["name"],
            product_description=product.get("description")
        )
        
        # 4. Delivery Reliability
        delivery_reliability, delivery_explanations = RuleEngine.evaluate_delivery_reliability(
            delivery_provider_id=scenario["delivery_provider"]["id"],
            provider_history=provider_history,
            order_amount=order["order_amount"]
        )
        
        # 5. Delivery Fraud Detection
        delivery_fraud_detected, delivery_fraud_score, delivery_fraud_reasons = RuleEngine.detect_delivery_fraud(
            delivery={},  # Mock delivery (not in scenario)
            order=order,
            delivery_history=delivery_history,
            buyer_seller_history=buyer_seller_history
        )
        
        # 6. Overall Risk
        overall_risk = RuleEngine.calculate_overall_risk(
            credit_risk=credit_risk,
            fraud_score=fraud_score,
            haram_confidence=haram_confidence,
            delivery_reliability=delivery_reliability,
            delivery_fraud_score=delivery_fraud_score
        )
        
        # 7. Decision
        decision, confidence = RuleEngine.make_decision(
            overall_risk=overall_risk,
            fraud_detected=fraud_detected,
            haram_detected=haram_detected,
            delivery_fraud_detected=delivery_fraud_detected
        )
        
        # 8. Explanation
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
        
        return {
            "scenario_id": scenario.get("scenario_type", "unknown"),
            "decision": decision,
            "risk_score": overall_risk,
            "confidence": confidence,
            "explanation": explanation,
            "expected_decision": scenario.get("expected_decision", "UNKNOWN"),
            "correct": decision == scenario.get("expected_decision", "UNKNOWN"),
            "details": {
                "credit_risk": credit_risk,
                "fraud_detected": fraud_detected,
                "fraud_score": fraud_score,
                "haram_detected": haram_detected,
                "haram_confidence": haram_confidence,
                "delivery_reliability": delivery_reliability,
                "delivery_fraud_detected": delivery_fraud_detected,
                "delivery_fraud_score": delivery_fraud_score
            }
        }
    
    @staticmethod
    def evaluate_dataset(dataset: List[Dict]) -> Dict:
        """
        Evaluate a dataset and return performance metrics
        """
        results = []
        correct_count = 0
        total_count = len(dataset)
        
        decision_counts = {"ALLOW": 0, "BLOCK": 0, "REVIEW": 0}
        expected_counts = {"ALLOW": 0, "BLOCK": 0, "REVIEW": 0}
        
        for scenario in dataset:
            result = AIEvaluator.evaluate_scenario(scenario)
            results.append(result)
            
            if result["correct"]:
                correct_count += 1
            
            decision_counts[result["decision"]] = decision_counts.get(result["decision"], 0) + 1
            expected_counts[result["expected_decision"]] = expected_counts.get(result["expected_decision"], 0) + 1
        
        accuracy = correct_count / total_count if total_count > 0 else 0.0
        
        # Calculate precision and recall for each decision type
        metrics = {
            "accuracy": accuracy,
            "total_samples": total_count,
            "correct_predictions": correct_count,
            "decision_distribution": decision_counts,
            "expected_distribution": expected_counts,
            "results": results
        }
        
        return metrics
    
    @staticmethod
    def run_evaluation(
        num_samples: int = 100,
        fraud_ratio: float = 0.2,
        haram_ratio: float = 0.1
    ) -> Dict:
        """
        Run complete evaluation pipeline
        """
        # Generate dataset
        dataset = MockDataGenerator.generate_training_dataset(
            num_samples=num_samples,
            fraud_ratio=fraud_ratio,
            haram_ratio=haram_ratio
        )
        
        # Evaluate
        metrics = AIEvaluator.evaluate_dataset(dataset)
        
        # Calculate additional metrics
        by_scenario = {}
        for result in metrics["results"]:
            scenario_type = result["scenario_id"]
            if scenario_type not in by_scenario:
                by_scenario[scenario_type] = {"correct": 0, "total": 0}
            by_scenario[scenario_type]["total"] += 1
            if result["correct"]:
                by_scenario[scenario_type]["correct"] += 1
        
        scenario_accuracy = {
            scenario: data["correct"] / data["total"] if data["total"] > 0 else 0.0
            for scenario, data in by_scenario.items()
        }
        
        metrics["scenario_accuracy"] = scenario_accuracy
        metrics["scenario_breakdown"] = by_scenario
        
        return metrics
    
    @staticmethod
    def generate_evaluation_report(metrics: Dict) -> str:
        """
        Generate human-readable evaluation report
        """
        report = []
        report.append("=" * 60)
        report.append("AI GOVERNANCE SERVICE - EVALUATION REPORT")
        report.append("=" * 60)
        report.append("")
        
        report.append(f"Overall Accuracy: {metrics['accuracy']:.2%}")
        report.append(f"Total Samples: {metrics['total_samples']}")
        report.append(f"Correct Predictions: {metrics['correct_predictions']}")
        report.append("")
        
        report.append("Decision Distribution:")
        for decision, count in metrics["decision_distribution"].items():
            report.append(f"  {decision}: {count}")
        report.append("")
        
        report.append("Expected Distribution:")
        for decision, count in metrics["expected_distribution"].items():
            report.append(f"  {decision}: {count}")
        report.append("")
        
        report.append("Accuracy by Scenario Type:")
        for scenario, accuracy in metrics["scenario_accuracy"].items():
            report.append(f"  {scenario}: {accuracy:.2%}")
        report.append("")
        
        report.append("=" * 60)
        
        return "\n".join(report)


