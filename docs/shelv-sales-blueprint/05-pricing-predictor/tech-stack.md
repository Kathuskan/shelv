# Shelv Pricing Predictor Technology and Setup

Version 1.0 | 2 October 2026 | Owner: Shelv founder

Implement the comparable-price baseline in the business API and the trained model in the existing Python service. Use pandas, NumPy, scikit-learn, and joblib. No generative model is needed to predict a number. This component reuses the shared database, worker, feature flags, and model registry.

## Setup sequence

1. Complete the core order, refund, and item-total records. Add a documented eligible-sale export policy and data-quality report.
2. Implement GET /api/v1/pricing/comparables for authenticated sellers, with edition and condition filters, anonymized evidence, and a minimum cohort policy.
3. Add app/pricing.py, jobs/train_pricing.py, and evals/pricing.py. Keep predictor inference read-only.
4. Build a versioned tabular dataset with features as of listing creation or the chosen prediction timestamp. Snapshot the feature definition in the training artifact.
5. Train baseline and candidate models, evaluate a frozen holdout, and store the metrics and checksum in ModelVersion.
6. Deploy a candidate in shadow mode, then enable advisory output for an eligible cohort. Retain the median baseline and insufficient-data response as fallbacks.

The modules and command entry points here are future implementation contracts. Installing scikit-learn alone does not produce a trained pricing model.

## Features and estimator

Start with condition grade, format, language, publication age, edition match quality, category, and historical comparable statistics computed from earlier data only. Exclude post-sale facts such as final fulfillment duration. Avoid raw seller or buyer identity features and uncontrolled high-cardinality title IDs that merely memorize the training set.

Use a scikit-learn Pipeline with imputation, consistent categorical encoding, and GradientBoostingRegressor as a modest CPU baseline. Fit separate quantile estimators at 0.1, 0.5, and 0.9 for an initial 80 percent interval candidate. Evaluate calibration and repair or reject crossing intervals. Quantile outputs are not automatically calibrated confidence guarantees.

Use dated folds and hold out a later period. Add a cold-edition evaluation to reveal memorization. Do not blindly use equally spaced time-series assumptions for irregular order events; construct explicit chronological cutoffs. The preprocessing fit must use training data only.

## Serving contract

POST /api/v1/pricing/suggestions accepts editionId, conditionGrade, and an optional listingId owned by the seller. Express retrieves canonical features rather than trusting arbitrary client features and calls POST /internal/pricing/predict.

```json
{
  "currency": "LKR",
  "lowMinor": 90000,
  "medianMinor": 120000,
  "highMinor": 150000,
  "basis": "comparable_sales",
  "comparableCount": 12,
  "modelVersion": "median-v1",
  "dataAsOf": "2026-10-02",
  "limitations": ["Example schema only"]
}
```

Numbers above are illustrative schema values, not actual valuations. For insufficient evidence return status=insufficient_data with no numeric estimate. Clamp only against explicit validity rules, log the reason, and avoid disguising out-of-distribution predictions as normal results.

## Configuration and training commands

```dotenv
PRICING_MODE=comparables
PRICING_MODEL_VERSION=median-v1
PRICING_MIN_COMPARABLES=5
PRICING_SALE_MATURITY_DAYS=30
```

The maturity window is a proposed operational starting point and must align with the implemented return policy. Store model files in a private versioned object store. Load only artifacts produced by the trusted training job, with an expected checksum and compatible feature schema.

After implementing the modules, use:

```sh
cd ai-service
.venv/bin/python -m jobs.train_pricing \
  --dataset data/mature-sales-v1.parquet --output artifacts/price-v1
.venv/bin/python -m evals.pricing \
  --model artifacts/price-v1 --holdout data/price-holdout.parquet
```

Lock pyarrow in the training dependency group for Parquet. Record Python and library versions with each artifact, because serialized estimators are not a portable cross-version interchange format.

## Monitoring and tests

Test missing edition, tiny cohorts, new versus used separation, refunded sales, duplicate transactions, currency mismatch, outliers, feature schema mismatch, and unavailable model storage. Confirm that accepting a suggestion still requires a normal owner-authorized listing update and cannot alter an existing order snapshot.

Monitor cohort coverage, interval width, input drift, prediction drift, and realized error after labels mature. Retrain on a scheduled review cycle only when enough new data exists. Roll back if a candidate fails cohort thresholds; never automatically promote solely because training succeeded.

Reference for quantile regression behavior: https://scikit-learn.org/stable/modules/generated/sklearn.ensemble.GradientBoostingRegressor.html
