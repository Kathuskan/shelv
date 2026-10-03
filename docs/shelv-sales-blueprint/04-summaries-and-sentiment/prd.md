# Shelv Book Summaries and Review Sentiment Product Requirements

Version 1.0 | 2 October 2026 | Owner: Shelv founder

Give buyers a concise, source-grounded overview of a book and a transparent account of what actual reviewers say. Book summaries and review sentiment share an enrichment pipeline, but they use different evidence and must be displayed separately. Summaries can launch before Shelv has reviews; sentiment cannot honestly launch without them.

## Scope and sources

A book overview describes subject, themes, intended audience, and reading characteristics supported by permitted source material. It is not a claim that the system has read the whole book when only a publisher description is available. Label such outputs as an overview based on the description. Full-book summaries require permission to use the full text or an applicable public-domain source.

Review sentiment aggregates eligible published reviews into aspects such as readability, pacing, depth, and usefulness. Keep seller-service feedback such as packaging and punctuality out of book sentiment. Do not manufacture reviews, ratings, or consensus when evidence is sparse.

## Requirements

- SUM-01: Show a short default overview, source attribution, generation date, and a correction/report link.
- SUM-02: Preserve work and edition identity; distinguish abridged editions, translations, and different formats where content differs.
- SUM-03: Use a spoiler-free default. Any future spoiler mode requires a deliberate user choice and separate cached output.
- SUM-04: Every material factual statement must be supported by source passages. No reliable source produces no generated overview.
- SEN-01: Show review count, coverage period, and aspect evidence. Separate mixed, neutral, and insufficient-evidence states.
- SEN-02: Initially require at least five eligible published book reviews before displaying an aggregate. This is a proposed product threshold, not a statistical guarantee.
- SEN-03: Recompute or withdraw aggregates when reviews are removed, edited, or moderated. Exclude unpublished and flagged reviews until resolved.
- ENR-01: Generated content cannot alter factual catalogue fields or influence a seller's price without a separate confirmed action.

## User journey and integration

On a book detail page, the buyer first sees the seller's actual listing and condition. A separate overview helps assess the book's content. A review panel shows human reviews and, when eligible, an AI-generated aggregate with its evidence count.

The catalogue publishes a versioned change event. A worker checks content permissions, runs an enrichment job, validates the result, and stores an AiArtifact. The same approved overview and theme tags may become inputs to semantic search and content recommendations. Sentiment is optional ranking evidence only after bias and quality checks; it must not become an unexamined global quality score.

## Data and governance

ContentSource records provider, source URL, source text hash, permission basis, language, edition linkage, and retrieval date. SummaryArtifact records source IDs, source version, model and prompt versions, spoiler mode, output, and publication state. SentimentArtifact records review IDs or an immutable eligible-review-set hash, counts, aspect labels, and evidence references.

Choose sources with permission to process and display the intended derivative content. Publicly reachable text does not automatically establish that permission. A source withdrawal invalidates downstream artifacts and prompts reindexing. Do not scrape third-party review sites or upload purchased ebooks without a suitable permission basis.

## Acceptance and measurement

Create an evaluation set with fiction, nonfiction, multiple editions, missing descriptions, mixed reviews, sarcasm, and contradictory evidence. Proposed release gates are no unsupported factual claims in a 50-case reviewed summary suite and at least 90 percent aspect-label agreement on a separately human-labeled sentiment set. Report sample sizes and language coverage; these are targets, not results.

Measure usefulness feedback, reported inaccuracies, time to refresh after edits, and cost per newly generated artifact. Avoid optimizing for longer summaries or automatically interpreting reading time as satisfaction. Cache per source version so page visits do not trigger fresh generation.

## Build sequence and failure behavior

Build source provenance and manual summaries first, grounded overview jobs second, and review sentiment after eligible review volume exists. When generation fails, keep a still-valid approved overview or show the original permitted description. Never retain an artifact after its source has been withdrawn merely to avoid an empty page. Start with English, and gate each additional language on evidence and evaluation.
