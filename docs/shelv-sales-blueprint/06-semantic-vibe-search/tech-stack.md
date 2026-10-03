# Shelv Semantic Vibe Search Technology and Setup

Version 1.0 | 2 October 2026 | Owner: Shelv founder

Use Atlas Search for lexical retrieval and Atlas Vector Search for catalogue embeddings. Reuse the Python embedding adapter and Express listing hydration. Merge candidate ranks in application code initially so the first version does not depend on newer server-side rank-fusion features.

## Setup steps

1. Complete the core BookEdition and Listing separation and implement the normal filtered catalogue endpoint.
2. Create EditionSearchDocument with editionId, locale, approved searchableText, sourceHash, sourceVersion, embedding, embeddingModel, dimensions, and publication state.
3. Add app/search.py, app/embeddings.py, jobs/index_catalog.py, and evals/search.py. Register catalogue change and source-retirement consumers with the shared worker.
4. Provision a development Atlas deployment with the required search features. Create separate lexical and vector indexes and wait until they are queryable before enabling the flag.
5. Backfill embeddings in bounded batches. Store failures for retry and skip unchanged source hashes.
6. Implement GET /api/v1/search with lexical, semantic, and hybrid modes for evaluation. Expose only the selected production mode to ordinary users.

## Vector index example

This proposed index definition uses the initial 1536-dimensional embedding model. Apply it through Atlas tooling supported by the selected deployment, and record its name in configuration.

```json
{
  "fields": [
    {"type": "vector", "path": "embedding",
     "numDimensions": 1536, "similarity": "cosine"},
    {"type": "filter", "path": "locale"},
    {"type": "filter", "path": "published"}
  ]
}
```

The lexical index covers normalized title, author, ISBN, and approved descriptive text. Keep an exact normalized ISBN field for deterministic lookup. Do not place changing seller prices into edition-level vector text; filter current Listing records after candidate generation.

## Query and ranking contract

GET /api/v1/search accepts q, language, condition, minPriceMinor, maxPriceMinor, pickupArea, cursor, and limit. Validate numeric bounds and cap text length and page size. Express requests edition candidates from POST /internal/search, hydrates eligible listings, and returns items, appliedFilters, nextCursor, modeUsed, and requestId.

Start with 100 lexical and 100 semantic candidates and reciprocal rank fusion using a tunable constant of 60. These are benchmark parameters, not universal defaults. Exact ISBN matches bypass ordinary fusion priority. Use a stable request-scoped candidate snapshot or deterministic tie-breaker for pagination so users do not see repeated pages as scores change.

If all high-ranked editions fail price or stock filters, retrieve additional bounded batches before declaring no match. Enforce a total query time budget. Explain results with stored evidence tags or matched text; do not generate an explanation for every card at request time.

## Configuration and setup checks

```dotenv
SEMANTIC_SEARCH_ENABLED=false
CATALOG_VECTOR_INDEX=edition_vector_v1
CATALOG_LEXICAL_INDEX=edition_text_v1
SEARCH_CANDIDATE_LIMIT=100
SEARCH_SEMANTIC_TIMEOUT_MS=1500
SEARCH_QUERY_CACHE_SECONDS=300
```

Use shared embedding model and dimensions. Cache query vectors by normalized query, locale, and model version. Cache result candidates separately from current price and stock. Cap embedding input length and provider concurrency. Do not send private chat or order text as a search query without a deliberate data policy.

After implementing the modules:

```sh
cd ai-service
.venv/bin/python -m jobs.index_catalog --version edition-vector-v1
.venv/bin/python -m evals.search \
  --queries evals/data/search-v1.jsonl --mode hybrid
```

The indexing job prepares outputs and persists through the shared Node worker contract. A reconciliation scan finds missing or outdated embeddings. Use mocked vectors for offline unit tests and the Atlas development deployment for actual retrieval integration tests.

## Failure handling and release

If the vector index is missing, dimensions disagree, or the provider times out, return keyword results with an internal fallback reason. Reject incompatible vector records instead of calculating meaningless similarities. Index updates should be versioned and switched only after evaluating the new search space.

Test exact ISBN, misspelled title, ambiguous budget, no available listings, restricted sellers, stale source text, Sinhala and Tamil cases before those languages launch, and a complete provider outage. Monitor indexed coverage, reindex age, empty-result rate, latency, and relevance regressions.

References: https://www.mongodb.com/docs/search/tutorial/hybrid-search/ and https://developers.openai.com/api/docs/guides/embeddings
