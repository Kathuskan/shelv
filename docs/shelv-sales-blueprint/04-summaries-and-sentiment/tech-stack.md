# Shelv Book Summaries and Review Sentiment Technology and Setup

Version 1.0 | 2 October 2026 | Owner: Shelv founder

Use the shared FastAPI service, hosted text model, MongoDB artifact records, and BullMQ worker. Keep overview generation and review aggregation as different job types in the same deployment. The existing whole-app Python environment already contains the required SDK, Pydantic, and database client.

## Setup and ingestion

1. Add ContentSource and AiArtifact schemas and administrator actions to approve, retire, or correct a source.
2. Create app/summaries.py and app/sentiment.py with strict input and output schemas. Add prompt templates to version-controlled files.
3. Implement summary.generate and sentiment.aggregate queue jobs. A job key includes edition or work ID, source-set hash, prompt version, model version, and language.
4. Implement GET /api/v1/editions/:id/overview and GET /api/v1/editions/:id/review-insights. Reads return approved cached artifacts and never make a billable generation call directly.
5. Add listing-independent source ingestion. A seller's marketing text can be a clearly labeled seller description, but it must not automatically become authoritative evidence for a book-wide overview.
6. Add review.published, review.edited, and review.removed consumers and source-retirement invalidation.

## Output schema and validation

```json
{
  "editionId": "edition-id",
  "basis": "publisher_description",
  "overview": "A short supported overview",
  "themes": ["friendship"],
  "sourceIds": ["approved-source-id"],
  "spoilerMode": "none",
  "sourceVersion": "v1",
  "needsReview": false
}
```

Validate text lengths, known source IDs, allowed basis values, and the source version. Store the output in draft state until deterministic checks and the selected moderation policy pass. A Pydantic-valid response may still contain unsupported content; use source-grounding checks and sampled human review.

For sentiment, return eligibleReviewCount, reviewSetHash, aspects, evidenceReviewIds, and limitations. Each aspect includes label, positiveCount, neutralCount, negativeCount, and mixedCount. Explain denominator choices and count each review once per aspect. Do not present model sentiment probabilities as customer star ratings.

## Configuration and commands

```dotenv
SUMMARIES_ENABLED=false
SUMMARY_MAX_WORDS=180
SUMMARY_SOURCE_MAX_TOKENS=6000
SENTIMENT_ENABLED=false
SENTIMENT_MIN_REVIEWS=5
ENRICHMENT_PROMPT_VERSION=v1
```

Use the shared TEXT_MODEL, provider key, timeout, and budget controls. Large permitted source sets require bounded chunk processing followed by an evidence-preserving merge. Version intermediate artifacts and cap work per job so one unusually large text cannot exhaust the daily budget.

After implementing the named modules, support:

```sh
cd ai-service
.venv/bin/python -m evals.summaries \
  --cases evals/data/summaries-v1.jsonl --output reports/summaries.json
.venv/bin/python -m evals.sentiment \
  --cases evals/data/sentiment-v1.jsonl --output reports/sentiment.json
```

Evaluation data must contain approved source text, expected factual claims or aspect labels, and the language. Do not evaluate against another unreviewed model output as the only reference.

## Integrations and publication

Express enqueues enrichment after an approved source changes. The Node worker retrieves the permitted content, invokes POST /internal/summaries or POST /internal/sentiment, checks the current source version again, and stores the artifact. A late response for an obsolete source is discarded. Publishing an overview triggers catalogue embedding refresh; review sentiment updates do not overwrite the bibliographic overview.

Use one cache entry per artifact version. Invalidation must propagate to search embeddings when the underlying overview is retired or corrected. Preserve a small internal revision history so an administrator can explain what changed without exposing withdrawn source content publicly.

## Tests and operation

Test source-free generation, fake citations, wrong edition, translations, excessive spoilers, review edits, fewer than five reviews, mixed sentiment, seller-service contamination, duplicate queue delivery, and source withdrawal during an active job. Verify that existing valid descriptions remain readable during provider downtime.

Start with manually approved publication for the first batch, then loosen review only after measured quality justifies it. Track corrections per 100 published artifacts, stale-artifact age, queue latency, and token consumption. Rollback uses previous prompt/model configuration and regenerates only eligible source versions.

Official reference: https://developers.openai.com/api/docs/guides/structured-outputs
