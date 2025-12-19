# AI Governance Service Documentation

## Overview

The AI Governance Service provides explainable, rule-based AI decisions for the Shariah-compliant escrow platform. It focuses on **explainability over accuracy** and uses deterministic rule-based logic as the primary decision mechanism.

## Architecture

### Core Components

1. **Rule Engine** (`ai_governance_rules.py`)
   - Rule-based logic for all AI decisions
   - Deterministic and explainable
   - No black-box models

2. **AI Service** (`ai_service.py`)
   - Main service orchestrating all AI evaluations
   - Integrates with database and other services
   - Produces decisions: ALLOW, BLOCK, or REVIEW

3. **Mock Data Generator** (`ai_mock_data.py`)
   - Generates synthetic datasets for training and evaluation
   - Creates various fraud scenarios
   - Self-contained for MVP

4. **Evaluation Logic** (`ai_evaluation.py`)
   - Evaluates model performance using mock datasets
   - Generates accuracy metrics and reports
   - Tests various scenarios

## AI Responsibilities

### 1. Ethical Credit Risk Scoring (Financial DNA)
- Evaluates buyer creditworthiness
- Considers verification status, transaction history, order amount
- Returns risk score (0-1) with explanations

### 2. Fraudulent Transaction Detection
- Detects self-dealing (buyer = seller)
- Identifies unverified accounts
- Flags unusual transaction patterns
- Detects rapid transactions (potential money laundering)
- Identifies round number amounts (structuring)

### 3. Haram Product Detection Support
- Supports Shariah service in detecting haram products
- Additional pattern matching for haram keywords
- Works in conjunction with Shariah validation

### 4. Delivery Fraud & Anomaly Detection
- Detects abnormal delivery timing (too early/too late)
- Identifies repeated failed deliveries
- Detects buyer-seller collusion patterns
- Validates delivery status consistency

### 5. Escrow Decision Recommendations
- Produces final decision: ALLOW, BLOCK, or REVIEW
- Includes risk score (0-1)
- Provides human-readable explanation
- Includes confidence level

## Output Format

All AI decisions include:

```python
{
    "decision": "ALLOW" | "BLOCK" | "REVIEW",
    "risk_score": 0.0-1.0,  # Normalized risk score
    "confidence": 0.0-1.0,   # Confidence in decision
    "explanation": "Human-readable explanation...",
    "credit_risk_score": 0.0-1.0,
    "fraud_detected": bool,
    "haram_detected": bool,
    "delivery_reliability": 0.0-1.0,
    "financial_dna_data": {...}  # Complete analysis data
}
```

## Decision Logic

### Decision Thresholds

- **ALLOW**: Risk score ≤ 0.3, no fraud/haram detected
- **REVIEW**: Risk score 0.3-0.8, requires manual review
- **BLOCK**: Risk score ≥ 0.8 OR fraud detected OR haram detected

### Risk Calculation

Overall risk is a weighted combination:
- Credit Risk: 25% weight
- Fraud Score: 30% weight (highest)
- Haram Confidence: 20% weight
- Delivery Reliability: 10% weight (inverse)
- Delivery Fraud: 15% weight

## Rule-Based Logic

### Credit Risk Rules

1. **Verification Status**
   - Unverified: +0.25 risk
   - Verified: -0.15 risk

2. **Order Amount**
   - > $50,000: +0.20 risk
   - > $20,000: +0.10 risk
   - < $1,000: -0.10 risk

3. **Transaction History**
   - No history: +0.15 risk
   - < 3 transactions: +0.10 risk
   - Low success rate (<70%): +0.15 risk
   - High success rate (>95%): -0.10 risk

### Fraud Detection Rules

1. **Self-Dealing**: Buyer = Seller → BLOCK (100% fraud score)
2. **Unverified Accounts**: +0.30 fraud score each
3. **High Amounts**: >$100k = +0.25, >$50k = +0.15
4. **Rapid Transactions**: >10 in 24h = +0.25
5. **Round Numbers**: >$10k and round = +0.10

### Delivery Fraud Rules

1. **Abnormal Timing**
   - Too early (>12h before estimate): +0.30
   - Too late (>48h after estimate): +0.20

2. **Repeated Failures**
   - >2 recent failures: +0.25
   - Failure rate >30%: +0.20

3. **Collusion Patterns**
   - >5 same-day transactions: +0.30
   - >3 rapid confirmations: +0.25

4. **Status Inconsistencies**
   - Delivered but no timestamp: +0.40
   - Delivered but not confirmed: +0.15

## API Endpoints

### Evaluate Order
```http
POST /api/v1/ai/evaluate
{
    "order_id": "uuid"
}
```

Returns: `AIDecisionResponse` with decision, risk score, explanation, and confidence

### Get AI Decision
```http
GET /api/v1/ai/order/{order_id}
```

Returns: `AIDecisionResponse` for existing decision

### Validate Delivery
```http
POST /api/v1/ai/validate-delivery?order_id={uuid}
```

Returns: Validation result with fraud detection

### Evaluate Model
```http
POST /api/v1/ai/evaluate-model
{
    "num_samples": 100,
    "fraud_ratio": 0.2,
    "haram_ratio": 0.1
}
```

Returns: Evaluation metrics and report

## Mock Data & Training

### Generating Mock Data

```python
from app.services.ai_mock_data import MockDataGenerator

# Generate single scenario
scenario = MockDataGenerator.generate_mock_order_scenario(
    scenario_type="fraudulent",
    include_fraud=True
)

# Generate training dataset
dataset = MockDataGenerator.generate_training_dataset(
    num_samples=100,
    fraud_ratio=0.2,
    haram_ratio=0.1
)
```

### Scenario Types

- `normal`: Regular transaction
- `high_value`: High-value order
- `new_buyer`: First-time buyer
- `suspicious`: Suspicious patterns
- `fraudulent`: Fraudulent transaction

### Running Evaluation

```python
from app.services.ai_service import AIService

metrics = AIService.run_evaluation(
    num_samples=100,
    fraud_ratio=0.2,
    haram_ratio=0.1
)

print(metrics["report_text"])
```

## Integration with Orchestration

The AI service integrates with the orchestration service:

1. **Order Created** → Shariah Validation
2. **Shariah Approved** → AI Evaluation
3. **AI Decision**:
   - `ALLOW` → Bank Pending
   - `BLOCK` → Order Rejected
   - `REVIEW` → Manual Review Required

## Key Principles

1. **Explainability First**: Every decision includes human-readable explanation
2. **Deterministic**: Same inputs = same outputs (no randomness in production)
3. **Rule-Based Primary**: ML models are optional, rules are primary
4. **Transparent Logic**: All rules are visible and auditable
5. **No Money Movement**: AI only produces decisions, never moves money

## Future Enhancements

For production, consider:

1. **Lightweight ML Models**
   - Simple logistic regression for risk scoring
   - Anomaly detection for delivery patterns
   - Keep models small and explainable

2. **Real Data Integration**
   - Replace mock data with actual transaction history
   - Integrate with external credit bureaus
   - Real-time fraud pattern updates

3. **Model Persistence**
   - Save trained models to disk
   - Version control for models
   - A/B testing framework

4. **Advanced Features**
   - Ensemble methods (rule + ML)
   - Online learning for fraud patterns
   - Real-time risk monitoring

## Testing

Run evaluation to test the system:

```bash
curl -X POST http://localhost:8000/api/v1/ai/evaluate-model \
  -H "Content-Type: application/json" \
  -d '{"num_samples": 100, "fraud_ratio": 0.2, "haram_ratio": 0.1}'
```

Expected output includes:
- Overall accuracy
- Decision distribution
- Scenario-specific accuracy
- Detailed report

## Notes

- All risk scores are normalized to 0-1 range
- Decisions are deterministic (no randomness in production logic)
- Mock data is used for MVP; replace with real data in production
- AI never moves money; it only produces recommendations


