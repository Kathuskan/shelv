# Shelv Recommendation Engine Product Requirements

Version 1.0 | 2 October 2026 | Owner: Shelv founder

Help readers discover relevant available books without requiring a precise search. Start with transparent popularity and content rules, then train personalized ranking only when genuine interaction data supports it. This is the first discovery component after the core marketplace and event instrumentation.

## Users and scope

Guests receive recent, popular, and category-relevant books. Signed-in readers can select preferred genres and languages, see suggestions related to saved or purchased books, dismiss suggestions, and turn personalization off. Product pages show similar available books. Sellers benefit from relevant exposure but cannot buy hidden ranking priority.

Semantic vibe search handles an explicit natural-language query. This engine handles feeds when the reader has not supplied a query. Both reuse catalogue vectors later, but they have different evaluation datasets and user controls.

## Requirements

- REC-01: Return only active, eligible listings, with price and availability rechecked by the core API.
- REC-02: Provide a useful guest and new-user fallback without interaction history.
- REC-03: Show a truthful reason such as matching a selected genre; do not invent reading preferences.
- REC-04: Deduplicate repeated editions and limit domination by one seller or author using configurable diversity rules.
- REC-05: Respect language, condition, and explicit user preferences. Allow dismissing a title and resetting personalization.
- REC-06: Record impressions with rank, requestId, algorithmVersion, and experiment assignment before interpreting click data.
- REC-07: Degrade to recent or popular listings if personalized inference times out.

## Data and ranking progression

Use BookEdition metadata and eligible Listing availability for the initial feed. Popularity counts should favor server-confirmed outcomes and unique participants; cap repeated clicks and exclude seller self-interactions and detected bots. A fresh listing needs an exploration opportunity rather than being permanently hidden by older inventory.

Phase one combines metadata similarity, recency, and bounded popularity. Phase two uses shared edition embeddings and an optional preference vector formed from positive interactions. A candidate weighting experiment could assign view 1, save 3, and completed purchase 5, with time decay; these are tuning starting points, not established behavioral truths.

Phase three evaluates collaborative or learned ranking against the earlier baseline. Sparse or cold users continue to use content-based fallbacks. Do not train a purchase model on synthetic transactions or treat unexposed books as known dislikes.

## Journey and integration

The homepage asks Express for a named recommendation surface. Express passes a pseudonymous preference context to the private inference service when enabled. It hydrates returned edition or listing IDs, applies business eligibility filters, and returns ranked cards with explanation codes. The browser reports displayed impressions and subsequent actions. Server order events supply trusted outcomes.

When a listing sells out, cached candidates may remain temporarily but are filtered before display. User opt-out deletes or disables the derived preference profile and excludes future events from personalization according to the retention policy.

## Acceptance and evaluation

Create a fixed catalogue with cold users, sparse users, out-of-stock listings, multiple copies, and restricted sellers. Every scenario must produce eligible results or an honest empty state. Never display the user's own listings as purchase recommendations by default.

Use Recall at 10, NDCG at 10, catalogue coverage, seller concentration, and new-item exposure. Train and evaluate with time-based splits and train-only feature construction. Report cold-user and cold-edition performance separately. Proposed release gate: beat the popularity baseline on held-out relevance while maintaining availability and diversity constraints; do not choose an arbitrary interaction count as proof of readiness.

Online measures are saves and completed purchases per recommendation impression, with cancellation rate and latency as guardrails. Use a small rollout and predeclared comparison window. Initial p95 response target is 800 ms for cached recommendations; fall back after a short inference timeout.

## Build order and risks

Build event schemas and a recent/popular feed first, content similarity next, embedding candidates after semantic infrastructure, and collaborative ranking last. Main risks are cold start, popularity feedback loops, fraudulent engagement, privacy leakage, and recommending unavailable stock. Keep model and rule versions visible in internal diagnostics and rollback to the basic feed independently of the rest of the app.
