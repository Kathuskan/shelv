# Shelv Recommendation Engine Technology and Setup

Version 1.0 | 2 October 2026 | Owner: Shelv founder

Use the shared Express API, MongoDB, Redis cache, and Python service. The first implementation uses catalogue rules and does not require a hosted language model. Later stages add scikit-learn content models and shared embeddings. This guide extends the whole-app setup; it does not create a second queue or AI deployment.

## Libraries and records

Use pandas and NumPy for event preparation, scikit-learn for TF-IDF and nearest-neighbor baselines, and joblib for trusted model artifacts. Reuse pymongo and Pydantic from the shared environment. Keep optional collaborative-model libraries out of the initial install until evaluation demonstrates a need.

InteractionEvent stores eventId, pseudonymous user or session ID, eventType, editionId, listingId, surface, rank, requestId, occurredAt, and algorithmVersion. RecommendationSnapshot stores candidate IDs, score components, generatedAt, expiresAt, and version. UserPreference stores explicit language and genre choices, opt-out state, and derived profile version. Never include contact details or private support messages in feature vectors.

## Implementation and setup

1. Implement POST /api/v1/events with an allowlist of impression, click, save, and dismiss events, rate limits, deduplication, and consent handling. Generate paid and completed events only inside the core service.
2. Implement GET /api/v1/recommendations?surface=home with a recent/popular baseline and deterministic tie-breaking. This endpoint must work before Python ranking exists.
3. Add app/recommendations.py to the shared FastAPI app and implement POST /internal/recommendations. Inputs contain approved preferences and candidate context, never unrestricted database queries.
4. Implement ai-service/jobs/train_recommendations.py and ai-service/evals/recommendations.py for offline development. These named modules are planned files, not existing commands in the repository.
5. Create daily aggregation jobs through the existing Node worker. Persist snapshots through validated business-service code and invalidate after inventory or preference changes.
6. Enable the Python ranking adapter behind RECOMMENDATIONS_MODE=content, retaining RECOMMENDATIONS_MODE=baseline for rollback.

## Contract and configuration

```json
{
  "surface": "home",
  "limit": 12,
  "preferences": {"languages": ["en"], "genres": ["fiction"]},
  "excludeEditionIds": [],
  "profileVersion": "v1"
}
```

The internal response contains items with editionId, score, and reasonCode, plus algorithmVersion and fallbackUsed. Express chooses active seller listings and rechecks current price and stock. Return an opaque recommendation requestId for impression attribution. Cap limits and input-array sizes.

Set REC_CACHE_TTL_SECONDS=300, REC_MAX_PER_SELLER=3, and REC_INFERENCE_TIMEOUT_MS=500 as initial tuning values. Include surface, profile version, catalogue version, and filters in cache keys. A TTL is a freshness optimization; authoritative eligibility checks still run on every response.

## Training and evaluation setup

Create a versioned export of eligible historical interactions with the feature values available at the time. Partition by time, compute popularity from training data only, and evaluate unseen users and editions separately. Avoid using future completed sales in past recommendation features. Start with curated relevance cases plus a recent/popular baseline before claiming learned personalization.

The future command contract, once the modules exist, is:

```sh
cd ai-service
.venv/bin/python -m jobs.train_recommendations \
  --dataset data/recommendations-v1.parquet --output artifacts/rec-v1
.venv/bin/python -m evals.recommendations \
  --model artifacts/rec-v1 --dataset data/rec-holdout.parquet
```

Install pyarrow in the locked training dependency group when using Parquet exports. Store artifact checksum, feature schema, training cutoff, dataset identifier, and metrics in ModelVersion. Load only internally produced artifacts; pickle-derived formats such as joblib must never be accepted from users.

## Deployment and troubleshooting

Deploy ranking in the existing private AI service. Run retraining as a scheduled job, not inside an HTTP request. Use a champion/challenger configuration to test a new model before switching traffic. If recommendations return no candidates, check user exclusions, catalogue coverage, and stock filters before loosening privacy or eligibility restrictions.

If latency rises, serve the cached baseline while rebuilding candidates in the background. If events are missing, verify browser impression delivery and server event counters separately. Track cache hit rate, fallback frequency, score distribution, and seller concentration.

## Verification checklist

Test new-user fallback, duplicate editions, opt-out, deleted users, hidden sellers, sold-out books, manipulated engagement, stale caches, and AI service failure. Require stable deterministic fixtures and an offline report against popularity. The integration test must confirm that model scores never override a core stock or seller restriction.

Reference for implementation APIs: https://scikit-learn.org/stable/modules/feature_extraction.html
