# =========================================================
# main.py
# AI Credit Risk Inference API (NO Seller Profile)
# Inference = Training Features (1:1)
# =========================================================

import pickle
import pandas as pd
from fastapi import FastAPI
from pydantic import BaseModel
from typing import List

# -----------------------------
# LOAD MODEL (Pipeline)
# -----------------------------
with open("ai_credit_risk_no_seller.pkl", "rb") as f:
    model = pickle.load(f)

THRESHOLD = 0.5

# -----------------------------
# FASTAPI APP
# -----------------------------
app = FastAPI(
    title="AI Credit Risk Service",
    description="Inference API using training-ready features",
    version="2.0.0"
)

# -----------------------------
# REQUEST SCHEMA
# (MATCHES TRAINING FEATURES EXACTLY)
# -----------------------------
class AIRiskRequest(BaseModel):
    buyer_verified: int

    buyer_total_transactions: int
    buyer_success_rate: float
    buyer_avg_amount: float
    buyer_recent_failed_transactions: int
    buyer_rapid_transactions_24h: int

    buyer_years_in_business: int
    buyer_annual_revenue: float
    buyer_monthly_revenue: float
    buyer_number_of_employees: int
    buyer_business_type: str
    buyer_credit_score: float
    buyer_existing_debt_ratio: float
    buyer_trust_score: float

    order_amount: float
    order_to_annual_revenue_ratio: float
    financing_ratio: float
    contract_type: str
    product_category: str
    cross_border: int


# -----------------------------
# EXPLANATION ENGINE
# -----------------------------
def generate_reasons(features: dict, decision: int) -> List[str]:
    reasons = []

    reasons.append(
        "Buyer account is verified"
        if features["buyer_verified"] == 1
        else "Buyer account is NOT verified"
    )

    if features["buyer_years_in_business"] < 2:
        reasons.append("Business is newly established (higher risk)")
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
        reasons.append("High financing exposure")
    else:
        reasons.append("Reasonable buyer equity contribution")

    if features["buyer_success_rate"] > 0.9:
        reasons.append("Strong transaction success history")
    elif features["buyer_success_rate"] < 0.7:
        reasons.append("Weak transaction success history")

    reasons.append(
        "Final decision: HIGH RISK (Default likely)"
        if decision == 1
        else "Final decision: LOW RISK (No default expected)"
    )

    return reasons


# -----------------------------
# INFERENCE ENDPOINT
# -----------------------------
@app.post("/evaluate-credit-risk")
def evaluate_credit_risk(request: AIRiskRequest):
    # Convert request directly into DataFrame
    X = pd.DataFrame([request.dict()])

    # Predict probability
    prob = model.predict_proba(X)[0, 1]

    decision = int(prob >= THRESHOLD)
    reasons = generate_reasons(X.iloc[0].to_dict(), decision)

    return {
        "probability_of_default": round(float(prob), 4),
        "decision": decision,  # 0 = low risk, 1 = high risk
        "reasons": reasons
    }
