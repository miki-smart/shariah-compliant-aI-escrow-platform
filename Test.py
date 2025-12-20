# =========================================================
# test.py
# AI Credit Risk Inference (NO Seller Profile)
# Threshold = 0.5
# =========================================================

import pickle
import numpy as np
import pandas as pd

# -----------------------------
# LOAD MODEL
# -----------------------------
with open("ai_credit_risk_no_seller.pkl", "rb") as f:
    model = pickle.load(f)

# -----------------------------
# CONSTANTS
# -----------------------------
THRESHOLD = 0.5

credit_rating_map = {
    "AAA": 1.0, "AA": 0.9, "A": 0.8, "BBB": 0.7,
    "BB": 0.5, "B": 0.4, "CCC": 0.3,
    "CC": 0.2, "C": 0.1, "D": 0.0
}

# -----------------------------
# FEATURE EXTRACTOR
# -----------------------------
def extract_features(ai_risk_request: dict) -> pd.DataFrame:
    buyer = ai_risk_request["buyer_profile"]
    history = ai_risk_request["buyer_history"]
    order = ai_risk_request["order_details"]

    annual_revenue = buyer["annual_revenue"]
    order_amount = order["total_amount"]
    existing_debt = buyer["existing_debt"]

    features = {
        "buyer_verified": int(ai_risk_request["buyer_verified"]),

        # Buyer history
        "buyer_total_transactions": history["total_transactions"],
        "buyer_success_rate": history["successful_rate"],
        "buyer_avg_amount": history["avg_amount"],
        "buyer_recent_failed_transactions": history["recent_failed_transactions"],
        "buyer_rapid_transactions_24h": history["rapid_transactions_24h"],

        # Buyer profile
        "buyer_years_in_business": buyer["years_in_business"],
        "buyer_annual_revenue": annual_revenue,
        "buyer_monthly_revenue": buyer["monthly_revenue"],
        "buyer_number_of_employees": buyer["number_of_employees"],
        "buyer_business_type": buyer["business_type"],
        "buyer_credit_score": credit_rating_map[buyer["credit_rating"]],
        "buyer_existing_debt_ratio": existing_debt / max(annual_revenue, 1.0),
        "buyer_trust_score": buyer["buyer_trust_score"],

        # Order
        "order_amount": order_amount,
        "order_to_annual_revenue_ratio": order_amount / max(annual_revenue, 1.0),
        "financing_ratio": order["bank_financing_amount"] / max(order_amount, 1.0),
        "contract_type": order["contract_type"],
        "product_category": order["product"]["category"],
        "cross_border": int(order["delivery_address"]["country"] != "MY"),

        # Shariah
        "haram_detected": int(order["shariah_compliance"]["haram_detected"])
    }

    return pd.DataFrame([features])

# -----------------------------
# REASON GENERATOR
# -----------------------------
def generate_reasons(features: dict, prob: float, decision: int) -> list:
    reasons = []

    reasons.append("Buyer account is verified" if features["buyer_verified"] else "Buyer account is NOT verified")

    if features["buyer_years_in_business"] < 2:
        reasons.append("Business is less than 2 years old (higher risk)")
    elif features["buyer_years_in_business"] >= 5:
        reasons.append("Established business (5+ years)")

    if features["buyer_credit_score"] >= 0.7:
        reasons.append("Good credit rating")
    elif features["buyer_credit_score"] < 0.4:
        reasons.append("Poor credit rating")

    if features["buyer_existing_debt_ratio"] > 0.6:
        reasons.append("High debt-to-revenue ratio")
    elif features["buyer_existing_debt_ratio"] < 0.2:
        reasons.append("Low debt burden")

    if features["financing_ratio"] > 0.8:
        reasons.append("High financing ratio (low buyer equity)")
    else:
        reasons.append("Reasonable buyer down payment")

    if features["buyer_success_rate"] < 0.7:
        reasons.append("Low historical transaction success rate")
    elif features["buyer_success_rate"] > 0.9:
        reasons.append("Strong transaction success history")

    if features["haram_detected"] == 1:
        reasons.append("⚠ Haram product detected (Shariah violation)")

    reasons.append(f"Decision = {decision}")

    return reasons

# -----------------------------
# SAMPLE REQUEST
# -----------------------------
ai_risk_request = {
    "buyer_verified": True,
    "buyer_history": {
        "total_transactions": 28,
        "successful_rate": 0.93,
        "avg_amount": 12500.00,
        "recent_failed_transactions": 0,
        "rapid_transactions_24h": 0
    },
    "buyer_profile": {
        "business_type": "retailer",
        "years_in_business": 5,
        "annual_revenue": 850000.00,
        "monthly_revenue": 72000.00,
        "number_of_employees": 12,
        "credit_rating": "BBB",
        "existing_debt": 150000.00,
        "buyer_trust_score": 0.92
    },
    "order_details": {
        "total_amount": 15000.00,
        "bank_financing_amount": 12000.00,
        "contract_type": "murabaha",
        "product": {"category": "food_beverage"},
        "delivery_address": {"country": "MY"},
        "shariah_compliance": {"haram_detected": False}
    }
}

# -----------------------------
# RUN INFERENCE
# -----------------------------
X = extract_features(ai_risk_request)
prob = model.predict_proba(X)[0, 1]

# ✅ HARD THRESHOLD
decision = 1 if prob >= THRESHOLD else 0

reasons = generate_reasons(X.iloc[0].to_dict(), prob, decision)

# -----------------------------
# OUTPUT
# -----------------------------
print("\n===== AI CREDIT RISK RESULT =====")
print("Decision (0 = No Default, 1 = Default):", decision)
# print("Probability:", round(prob, 4))
print("\nReasons:")
for r in reasons:
    print("-", r)
