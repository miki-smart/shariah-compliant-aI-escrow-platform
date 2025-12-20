# =========================================================
# AI Risk Training (NO SELLER PROFILE)
# End-to-End: Data Generation → Logistic Regression → Save
# =========================================================

import numpy as np
import pandas as pd
import pickle

from sklearn.model_selection import train_test_split
from sklearn.preprocessing import StandardScaler, OneHotEncoder
from sklearn.compose import ColumnTransformer
from sklearn.pipeline import Pipeline
from sklearn.linear_model import LogisticRegression
from sklearn.metrics import roc_auc_score, classification_report

# -----------------------------
# GLOBAL SETTINGS
# -----------------------------
np.random.seed(42)
N = 40000

credit_rating_map = {
    "AAA": 1.0, "AA": 0.9, "A": 0.8, "BBB": 0.7,
    "BB": 0.5, "B": 0.4, "CCC": 0.3,
    "CC": 0.2, "C": 0.1, "D": 0.0
}

contract_types = ["murabaha", "salam", "istisna", "cash"]
product_categories = ["food_beverage", "electronics", "machinery", "services", "other"]
business_types = ["msme", "retailer", "wholesaler", "manufacturer", "individual"]

records = []

# -----------------------------
# SYNTHETIC DATA GENERATION
# -----------------------------
for _ in range(N):

    # Buyer verification
    buyer_verified = np.random.choice([0, 1], p=[0.15, 0.85])

    # Buyer history
    total_txn = np.random.randint(0, 60)
    success_rate = np.clip(np.random.normal(0.88, 0.12), 0, 1)
    avg_amount = np.random.lognormal(9.2, 0.7)
    recent_failed = np.random.poisson(0.4)
    rapid_txn_24h = np.random.choice([0, 1], p=[0.9, 0.1])

    # Buyer profile
    years_in_business = np.random.randint(0, 15)
    annual_revenue = np.random.lognormal(13, 0.8)
    monthly_revenue = annual_revenue / 12
    employees = np.random.randint(1, 70)
    business_type = np.random.choice(business_types)

    credit_rating = np.random.choice(
        list(credit_rating_map.keys()),
        p=[0.05,0.10,0.20,0.25,0.15,0.10,0.08,0.04,0.02,0.01]
    )
    credit_score = credit_rating_map[credit_rating]

    existing_debt = annual_revenue * np.random.uniform(0.05, 0.9)
    debt_ratio = existing_debt / annual_revenue
    buyer_trust = np.random.uniform(0.35, 1.0)

    # Order details
    order_amount = np.random.lognormal(9.5, 0.85)
    contract_type = np.random.choice(contract_types, p=[0.55, 0.20, 0.15, 0.10])
    financing_ratio = np.random.uniform(0.3, 0.95)
    order_to_revenue_ratio = order_amount / annual_revenue

    product_category = np.random.choice(product_categories)
    cross_border = np.random.choice([0, 1], p=[0.9, 0.1])

    # Shariah

    # -----------------------------
    # CREDIT DEFAULT TARGET
    # -----------------------------
    z = (
        1.9 * debt_ratio +
        0.7 * financing_ratio +
        0.9 * order_to_revenue_ratio -
        1.0 * credit_score -
        0.5 * buyer_trust +
        0.3 * (years_in_business < 2) +
        0.4 * rapid_txn_24h +
        0.3 * (success_rate < 0.7) +
        np.random.normal(0, 0.75)
    )

    p_default = 1 / (1 + np.exp(-z))
    credit_default = int(np.random.rand() < p_default)

    records.append({
        # Buyer verification
        "buyer_verified": buyer_verified,

        # Buyer history
        "buyer_total_transactions": total_txn,
        "buyer_success_rate": success_rate,
        "buyer_avg_amount": avg_amount,
        "buyer_recent_failed_transactions": recent_failed,
        "buyer_rapid_transactions_24h": rapid_txn_24h,

        # Buyer profile
        "buyer_years_in_business": years_in_business,
        "buyer_annual_revenue": annual_revenue,
        "buyer_monthly_revenue": monthly_revenue,
        "buyer_number_of_employees": employees,
        "buyer_business_type": business_type,
        "buyer_credit_score": credit_score,
        "buyer_existing_debt_ratio": debt_ratio,
        "buyer_trust_score": buyer_trust,

        # Order
        "order_amount": order_amount,
        "order_to_annual_revenue_ratio": order_to_revenue_ratio,
        "financing_ratio": financing_ratio,
        "contract_type": contract_type,
        "product_category": product_category,
        "cross_border": cross_border,


        # TARGET
        "credit_default": credit_default
    })

df = pd.DataFrame(records)

# -----------------------------
# TRAIN / TEST SPLIT
# -----------------------------
y = df["credit_default"]
X = df.drop(columns=["credit_default"])

categorical_features = ["contract_type", "product_category", "buyer_business_type"]
numerical_features = [c for c in X.columns if c not in categorical_features]

preprocessor = ColumnTransformer(
    transformers=[
        ("num", StandardScaler(), numerical_features),
        ("cat", OneHotEncoder(handle_unknown="ignore"), categorical_features)
    ]
)

pipeline = Pipeline(steps=[
    ("preprocessor", preprocessor),
    ("classifier", LogisticRegression(
        max_iter=2000,
        class_weight="balanced",
        solver="lbfgs"
    ))
])

X_train, X_test, y_train, y_test = train_test_split(
    X, y, test_size=0.25, stratify=y, random_state=42
)

pipeline.fit(X_train, y_train)

# -----------------------------
# EVALUATION
# -----------------------------
y_prob = pipeline.predict_proba(X_test)[:, 1]
y_pred = pipeline.predict(X_test)

print("ROC AUC:", round(roc_auc_score(y_test, y_prob), 4))
print(classification_report(y_test, y_pred, digits=3))

# -----------------------------
# SAVE MODEL
# -----------------------------
with open("ai_credit_risk_no_seller.pkl", "wb") as f:
    pickle.dump(pipeline, f)

print("\nModel saved as ai_credit_risk_no_seller.pkl")
