# Shelv Semantic Vibe Search Product Requirements

Version 1.0 | 2 October 2026 | Owner: Shelv founder

Let readers describe the kind of book they want in natural language, such as "a gentle mystery with little violence under Rs 2000." Combine meaning-based retrieval with exact matching and enforce the user's explicit price, language, condition, and availability filters. This component handles an intentional query and shares catalogue representations with the recommendation engine.

## Scope and experience

The main search box accepts titles, authors, ISBNs, or descriptive queries. Exact ISBN and strong title matches remain prominent. Users can inspect extracted filters and change them. Results display ordinary listing cards with supported reasons such as a matching theme, never fabricated descriptions.

A mood or theme query is subjective. The interface should acknowledge uncertainty, especially for content sensitivities or topics not supported by the available descriptions. Do not promise that a book contains no violence or no triggering content unless reliable evidence supports that claim.

## Requirements

- SEM-01: Retrieve using both lexical matching and vector similarity, with a keyword fallback.
- SEM-02: Enforce price and stock as hard constraints using current listing data. Model inference cannot relax a buyer's budget silently.
- SEM-03: Search across eligible editions and expand them into active seller listings. Distinguish translations and formats.
- SEM-04: Explain matches only from approved metadata or source-backed tags. Similarity alone does not establish a factual claim.
- SEM-05: Keep search usable during embedding-provider or vector-index failure.
- SEM-06: Offer a useful zero-result state with removable filters and optional saved search or wanted request.
- SEM-07: Respect language choice and show when cross-language results are included. Additional languages require separate evaluation.

## Retrieval flow

Normalize the query and detect exact ISBN or obvious structured filters. For an explicit UI filter, trust the validated UI value. When natural-language parsing is ambiguous, show the interpreted filter or ask for clarification rather than quietly narrowing the catalogue.

Run lexical and semantic retrieval, merge their ranked candidates, deduplicate editions, and then hydrate eligible listings. Price and availability may change after indexing, so recheck them from the business database before returning results. Over-fetch and continue to the next candidate batch when necessary; do not show sold-out results merely to fill the page.

The recommendation engine can reuse an edition embedding for related-book suggestions. The Librarian uses a separate policy index and only calls this search through an approved public-catalogue tool.

## Data and freshness

Embed title, author, language, category, approved description or overview, and supported theme tags. Keep seller contact data and private behavioral profiles out of public vectors. Record the text hash and model version so edits trigger deterministic reindexing.

A catalogue update produces an indexing job. A listing becoming unavailable takes effect immediately through API filtering even before the search index refreshes. A withdrawn content source requires removal or rebuilding of derived text and embeddings.

## Acceptance and evaluation

Create a fixed set of at least 100 manually judged queries covering exact titles, ISBNs, misspellings, moods, nonfiction topics, price limits, sparse descriptions, and no-match cases. Compare against the existing keyword baseline with NDCG at 10 and Recall at 10. Proposed release gate: improve judged relevance overall without degrading exact ISBN behavior, and pass every hard-filter test.

Measure zero-result rate, query reformulation, saves and completed purchases per search session, response latency, and cost. A proposed p95 search target is 2 seconds at pilot load. Use keyword fallback after the semantic timeout; do not block the whole page waiting for a model.

## Build order and risks

Implement reliable keyword search and filters first, canonical edition text second, embedding jobs and indexes third, hybrid ranking fourth, and optional natural-language filter extraction last. A generative query parser is not required for the first semantic release. Main risks are sparse descriptions, multilingual relevance gaps, stale stock, unsupported match explanations, and high per-query costs.
