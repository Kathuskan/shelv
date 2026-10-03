# Shelv Librarian Assistant Product Requirements

Version 1.0 | 2 October 2026 | Owner: Shelv founder

The Librarian helps readers and sellers understand Shelv policies and navigate common tasks. It uses retrieval augmented generation, or RAG: it finds approved source passages before composing an answer. It may look up a user's own order through a read-only authorized tool, but it does not make commercial decisions.

## Scope and users

Guests can ask about buying, selling, account requirements, pickup, and published return policies. Authenticated users can ask about an order they are permitted to view. Administrators publish and retire knowledge documents and inspect feedback. An unresolved or disputed case goes to a human support path with a concise user-approved summary.

Exclude automatic refunds, account changes, seller approval, payment collection, unsupported promises, and answers based on arbitrary uploaded books. Book discovery can link to semantic search, but policy retrieval and catalogue retrieval use separate tools and collections.

## Requirements

- LIB-01: Every substantive policy answer links to an approved source title and version or effective date.
- LIB-02: When evidence is missing or contradictory, say what is unknown and offer the appropriate support route.
- LIB-03: Never expose another user's order, address, email, or seller-private record.
- LIB-04: Treat retrieved text, chat text, and tool results as data, not instructions that can change access rules.
- LIB-05: The model can request only a small allowlist of read-only tools. The backend authenticates and authorizes every call independently.
- LIB-06: Show pending, unavailable, and handoff states clearly. Keep a normal help page available when AI is down.
- LIB-07: Allow feedback and conversation deletion under the retention policy. Do not use support conversations for recommendation profiles by default.

## Conversation flow

A buyer asks, "Where is my order?" Express checks the session and offers the buyer's own recent orders through an authorized endpoint. A selected orderId is validated again by the business service. The tool returns a minimal status, dates, and next action. The assistant may explain that status using current policy passages, but it must not invent delivery tracking or a promised refund date.

For "Can I return a damaged book?", the retriever selects published policy chunks for the active locale and effective version. The response cites those passages. If no return policy has been approved, the answer must direct the buyer to support rather than generating one.

## Knowledge and data

KnowledgeDocument contains title, canonical URL or internal help route, version, locale, effectiveAt, publication state, and owner. KnowledgeChunk retains document ID, section, source offsets, content hash, and embedding version. Policy updates invalidate old chunks and caches before new answers rely on them.

ChatSession belongs to one user or anonymous session. Private order data remains in the order service and is never embedded into a shared knowledge index. Retain only minimal redacted tool traces for troubleshooting. A human handoff contains the user's selected details and confirmation to submit the support request.

## Acceptance and quality

Prepare at least 60 reviewed questions covering ordinary policies, missing policies, conflicting versions, order permissions, prompt injection, and provider failure. Proposed gates are at least 90 percent policy correctness on answerable cases, source support for every material policy claim, and zero cross-user disclosures in the adversarial suite. These thresholds are initial release criteria, not measured results.

Measure answer correctness and evidence support with human review, not only a model grading itself. Track resolution feedback, escalation accuracy, cost per conversation, and unsupported-answer reports. Do not optimize support deflection at the expense of resolving the issue correctly.

## Rollout and dependencies

Build after approved policy content, shared retrieval, and authenticated order APIs exist. Release public-policy answers first, order lookup second, and a confirmed human handoff third. Begin with English and test Sinhala and Tamil separately before enabling those answer modes. A proposed total response timeout is 15 seconds with a visible fallback; streaming is optional after correctness is established.
