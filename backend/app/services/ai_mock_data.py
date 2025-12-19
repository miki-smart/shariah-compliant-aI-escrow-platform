"""
Mock Data Generator for AI Training and Evaluation
Generates synthetic datasets for fraud detection, credit risk, and delivery patterns
"""
import random
from typing import Dict, List, Optional
from datetime import datetime, timedelta
from decimal import Decimal
import json


class MockDataGenerator:
    """Generate synthetic datasets for AI training and evaluation"""
    
    # Fraud patterns
    FRAUD_PATTERNS = [
        "self_dealing",
        "unverified_accounts",
        "rapid_transactions",
        "round_amounts",
        "high_value_first_transaction"
    ]
    
    # Product categories
    PRODUCT_CATEGORIES = [
        "Electronics", "Clothing", "Food", "Books", "Home & Garden",
        "Sports", "Automotive", "Health & Beauty", "Toys", "Jewelry"
    ]
    
    # Haram categories (for testing)
    HARAM_CATEGORIES = [
        "Alcohol", "Pork Products", "Gambling", "Interest-based Services"
    ]
    
    @staticmethod
    def generate_buyer_history(
        buyer_id: str,
        is_fraudulent: bool = False,
        total_transactions: Optional[int] = None
    ) -> Dict:
        """Generate mock buyer transaction history"""
        if total_transactions is None:
            total_transactions = random.randint(0, 50) if not is_fraudulent else random.randint(0, 5)
        
        successful_transactions = int(total_transactions * random.uniform(0.5, 1.0))
        if is_fraudulent:
            successful_transactions = int(total_transactions * random.uniform(0.3, 0.6))
        
        successful_rate = successful_transactions / total_transactions if total_transactions > 0 else 0.0
        
        # Calculate average amount
        amounts = [random.uniform(100, 5000) for _ in range(total_transactions)]
        avg_amount = sum(amounts) / len(amounts) if amounts else 0.0
        
        # Fraud indicators
        recent_failed = 0
        rapid_transactions_24h = 0
        if is_fraudulent:
            recent_failed = random.randint(3, 10)
            rapid_transactions_24h = random.randint(10, 50)
        
        return {
            "buyer_id": buyer_id,
            "total_transactions": total_transactions,
            "successful_transactions": successful_transactions,
            "successful_rate": successful_rate,
            "avg_amount": avg_amount,
            "recent_failed_transactions": recent_failed,
            "rapid_transactions_24h": rapid_transactions_24h,
            "is_fraudulent": is_fraudulent
        }
    
    @staticmethod
    def generate_delivery_provider_history(
        provider_id: str,
        is_unreliable: bool = False
    ) -> Dict:
        """Generate mock delivery provider history"""
        total_deliveries = random.randint(10, 200)
        
        if is_unreliable:
            success_rate = random.uniform(0.4, 0.7)
            failed_deliveries = int(total_deliveries * (1 - success_rate))
            avg_delivery_time = random.uniform(72, 120)  # 3-5 days
            recent_failed = random.randint(3, 8)
        else:
            success_rate = random.uniform(0.85, 0.98)
            failed_deliveries = int(total_deliveries * (1 - success_rate))
            avg_delivery_time = random.uniform(24, 48)  # 1-2 days
            recent_failed = random.randint(0, 2)
        
        return {
            "provider_id": provider_id,
            "total_deliveries": total_deliveries,
            "delivery_success_rate": success_rate,
            "failed_deliveries": failed_deliveries,
            "avg_delivery_time_hours": avg_delivery_time,
            "recent_failed_deliveries": recent_failed,
            "is_unreliable": is_unreliable
        }
    
    @staticmethod
    def generate_buyer_seller_history(
        buyer_id: str,
        seller_id: str,
        is_collusion: bool = False
    ) -> Dict:
        """Generate mock buyer-seller transaction history"""
        if is_collusion:
            same_day_transactions = random.randint(5, 20)
            rapid_confirmations = random.randint(3, 10)
        else:
            same_day_transactions = random.randint(0, 2)
            rapid_confirmations = random.randint(0, 1)
        
        return {
            "buyer_id": buyer_id,
            "seller_id": seller_id,
            "same_day_transactions": same_day_transactions,
            "rapid_confirmations": rapid_confirmations,
            "is_collusion": is_collusion
        }
    
    @staticmethod
    def generate_delivery_history(
        provider_id: str,
        has_fraud_pattern: bool = False
    ) -> Dict:
        """Generate mock delivery history"""
        if has_fraud_pattern:
            recent_failed = random.randint(3, 8)
            failure_rate = random.uniform(0.3, 0.5)
        else:
            recent_failed = random.randint(0, 2)
            failure_rate = random.uniform(0.05, 0.15)
        
        return {
            "provider_id": provider_id,
            "recent_failed_deliveries": recent_failed,
            "failure_rate": failure_rate,
            "has_fraud_pattern": has_fraud_pattern
        }
    
    @staticmethod
    def generate_mock_order_scenario(
        scenario_type: str = "normal",
        include_fraud: bool = False,
        include_haram: bool = False
    ) -> Dict:
        """
        Generate a complete mock order scenario for testing
        Scenario types: normal, high_value, new_buyer, suspicious, fraudulent
        """
        buyer_id = f"buyer_{random.randint(1000, 9999)}"
        seller_id = f"seller_{random.randint(1000, 9999)}"
        
        # Generate order amount based on scenario
        if scenario_type == "high_value":
            order_amount = random.uniform(50000, 100000)
        elif scenario_type == "suspicious":
            order_amount = random.choice([10000, 20000, 30000, 50000])  # Round numbers
        elif scenario_type == "fraudulent":
            order_amount = random.uniform(80000, 150000)
        else:
            order_amount = random.uniform(100, 10000)
        
        # Generate buyer history
        is_fraudulent = include_fraud or scenario_type == "fraudulent"
        buyer_history = MockDataGenerator.generate_buyer_history(
            buyer_id,
            is_fraudulent=is_fraudulent,
            total_transactions=0 if scenario_type == "new_buyer" else None
        )
        
        # Generate product
        if include_haram:
            category = random.choice(MockDataGenerator.HARAM_CATEGORIES)
            name = f"{category} Product"
        else:
            category = random.choice(MockDataGenerator.PRODUCT_CATEGORIES)
            name = f"{category} Item {random.randint(1, 100)}"
        
        product = {
            "category": category,
            "name": name,
            "description": f"Mock {category.lower()} product for testing"
        }
        
        # Generate delivery provider
        provider_id = f"provider_{random.randint(1000, 9999)}"
        is_unreliable = scenario_type in ["suspicious", "fraudulent"]
        provider_history = MockDataGenerator.generate_delivery_provider_history(
            provider_id,
            is_unreliable=is_unreliable
        )
        
        # Generate buyer-seller history (collusion for fraudulent)
        is_collusion = scenario_type == "fraudulent"
        buyer_seller_history = MockDataGenerator.generate_buyer_seller_history(
            buyer_id,
            seller_id,
            is_collusion=is_collusion
        )
        
        # Generate delivery history
        has_fraud_pattern = scenario_type in ["suspicious", "fraudulent"]
        delivery_history = MockDataGenerator.generate_delivery_history(
            provider_id,
            has_fraud_pattern=has_fraud_pattern
        )
        
        return {
            "order": {
                "buyer_id": buyer_id,
                "seller_id": seller_id,
                "order_amount": order_amount,
                "product": product
            },
            "buyer": {
                "id": buyer_id,
                "verified": not is_fraudulent and random.choice([True, True, True, False]),  # 75% verified
                "history": buyer_history
            },
            "seller": {
                "id": seller_id,
                "verified": not is_fraudulent and random.choice([True, True, True, False])
            },
            "product": product,
            "delivery_provider": {
                "id": provider_id,
                "history": provider_history
            },
            "buyer_seller_history": buyer_seller_history,
            "delivery_history": delivery_history,
            "expected_decision": "BLOCK" if (is_fraudulent or include_haram) else "REVIEW" if scenario_type == "suspicious" else "ALLOW",
            "scenario_type": scenario_type
        }
    
    @staticmethod
    def generate_training_dataset(
        num_samples: int = 100,
        fraud_ratio: float = 0.2,
        haram_ratio: float = 0.1
    ) -> List[Dict]:
        """
        Generate a training dataset with various scenarios
        """
        dataset = []
        
        # Normal transactions (60%)
        normal_count = int(num_samples * 0.6)
        for _ in range(normal_count):
            dataset.append(MockDataGenerator.generate_mock_order_scenario("normal"))
        
        # High value transactions (10%)
        high_value_count = int(num_samples * 0.1)
        for _ in range(high_value_count):
            dataset.append(MockDataGenerator.generate_mock_order_scenario("high_value"))
        
        # New buyer transactions (10%)
        new_buyer_count = int(num_samples * 0.1)
        for _ in range(new_buyer_count):
            dataset.append(MockDataGenerator.generate_mock_order_scenario("new_buyer"))
        
        # Suspicious transactions (10%)
        suspicious_count = int(num_samples * 0.1)
        for _ in range(suspicious_count):
            dataset.append(MockDataGenerator.generate_mock_order_scenario("suspicious"))
        
        # Fraudulent transactions
        fraud_count = int(num_samples * fraud_ratio)
        for _ in range(fraud_count):
            dataset.append(MockDataGenerator.generate_mock_order_scenario("fraudulent", include_fraud=True))
        
        # Haram products
        haram_count = int(num_samples * haram_ratio)
        for _ in range(haram_count):
            dataset.append(MockDataGenerator.generate_mock_order_scenario("normal", include_haram=True))
        
        # Shuffle
        random.shuffle(dataset)
        
        return dataset
    
    @staticmethod
    def generate_delivery_scenario(
        has_anomaly: bool = False,
        has_collusion: bool = False
    ) -> Dict:
        """Generate mock delivery scenario for testing"""
        order_created = datetime.utcnow() - timedelta(days=random.randint(1, 5))
        estimated_delivery = order_created + timedelta(hours=random.randint(24, 72))
        
        if has_anomaly:
            # Abnormal timing
            if random.choice([True, False]):
                # Too early
                delivered_at = estimated_delivery - timedelta(hours=random.randint(12, 24))
            else:
                # Too late
                delivered_at = estimated_delivery + timedelta(hours=random.randint(48, 96))
        else:
            # Normal timing
            delivered_at = estimated_delivery + timedelta(hours=random.randint(-6, 12))
        
        delivery = {
            "status": "DELIVERED",
            "estimated_delivery": estimated_delivery.isoformat(),
            "delivered_at": delivered_at.isoformat(),
            "buyer_confirmed": not has_collusion or random.choice([True, False])
        }
        
        return {
            "delivery": delivery,
            "order": {
                "created_at": order_created.isoformat(),
                "total_amount": random.uniform(1000, 10000)
            },
            "has_anomaly": has_anomaly,
            "has_collusion": has_collusion
        }


