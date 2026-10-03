# Shelv Sales and AI Blueprint

Version 1.0 | 2 October 2026

This package contains 16 documents in both Markdown and Word formats: one PRD and one technology/setup guide for each of eight scopes. The scope is selling new and used physical books. Rentals are excluded. Overlapping summary ideas are combined into one summaries and review sentiment component.

Start with the whole-app PRD and technology guide, then the core marketplace. Component folder numbers identify documents; the build sequence below determines implementation order. These are implementation specifications. New commands, services, and modules described in the guides still need to be built; this documentation task did not change application source code or deploy services.

## Document index

| Scope | PRD Markdown | PRD Word | Technology Markdown | Technology Word |
| --- | --- | --- | --- | --- |
| Whole application | [Read](00-whole-app/prd.md) | [Open](00-whole-app/prd.docx) | [Read](00-whole-app/tech-stack.md) | [Open](00-whole-app/tech-stack.docx) |
| Core sales marketplace | [Read](01-core-marketplace/prd.md) | [Open](01-core-marketplace/prd.docx) | [Read](01-core-marketplace/tech-stack.md) | [Open](01-core-marketplace/tech-stack.docx) |
| Recommendation engine | [Read](02-recommendation-engine/prd.md) | [Open](02-recommendation-engine/prd.docx) | [Read](02-recommendation-engine/tech-stack.md) | [Open](02-recommendation-engine/tech-stack.docx) |
| Librarian support assistant | [Read](03-librarian-assistant/prd.md) | [Open](03-librarian-assistant/prd.docx) | [Read](03-librarian-assistant/tech-stack.md) | [Open](03-librarian-assistant/tech-stack.docx) |
| Book summaries and review sentiment | [Read](04-summaries-and-sentiment/prd.md) | [Open](04-summaries-and-sentiment/prd.docx) | [Read](04-summaries-and-sentiment/tech-stack.md) | [Open](04-summaries-and-sentiment/tech-stack.docx) |
| Pricing predictor | [Read](05-pricing-predictor/prd.md) | [Open](05-pricing-predictor/prd.docx) | [Read](05-pricing-predictor/tech-stack.md) | [Open](05-pricing-predictor/tech-stack.docx) |
| Semantic vibe search | [Read](06-semantic-vibe-search/prd.md) | [Open](06-semantic-vibe-search/prd.docx) | [Read](06-semantic-vibe-search/tech-stack.md) | [Open](06-semantic-vibe-search/tech-stack.docx) |
| Computer vision auto-lister | [Read](07-vision-auto-lister/prd.md) | [Open](07-vision-auto-lister/prd.docx) | [Read](07-vision-auto-lister/tech-stack.md) | [Open](07-vision-auto-lister/tech-stack.docx) |

## Recommended build sequence

1. Repair the current build, authentication, authorization, and deployment issues; remove active rental paths.
2. Complete the sales marketplace, orders, stock reservations, payments, handover, reviews, and event instrumentation.
3. Add basic recommendation feeds using metadata, recency, and popularity.
4. Build the shared Python AI service, reliable jobs, provenance, evaluations, and grounded book overviews.
5. Add semantic vibe search using approved catalogue embeddings and keyword retrieval.
6. Add the Librarian with published policies and strictly authorized read-only order tools.
7. Add computer vision listing drafts with mandatory seller review.
8. Enable review sentiment and richer personalization when real evidence supports them.
9. Train and release the pricing predictor only after mature completed-sale data and baseline comparisons justify it. Comparable-price guidance can be implemented earlier.

## How to use the guides

Each PRD defines the user problem, scope, requirements, data, integrations, acceptance criteria, and dependencies. Each technology guide defines the selected tools, proposed setup, configuration, endpoint contracts, evaluation procedure, deployment, and fallback behavior. The whole-app guide owns shared infrastructure so component guides do not imply eight separate deployments.

Numeric thresholds are proposed pilot gates, not measured outcomes. Sri Lanka, LKR, a solo-builder-friendly stack, and English-first AI are planning assumptions. Payment provider eligibility, settlement arrangements, policies, and content permissions require confirmation before the relevant live features are enabled.

Official documentation references appear in the technology guides. Vendor plans, account access, package versions, and model availability should be rechecked when implementing. Preserve lockfiles and benchmark model changes.
