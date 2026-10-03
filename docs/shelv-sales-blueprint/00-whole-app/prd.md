# Shelv Whole Application Product Requirements

Version 1.0 | 2 October 2026 | Owner: Shelv founder

Shelv will help readers buy new and used physical books and help individuals and bookshops sell them. Build a dependable sales marketplace first, then add AI features that share one catalogue and improve discovery, listing quality, and support. Rental listings, borrowing, deposits, and late fees are outside the product scope.

## Product decisions

- Launch as a responsive website for a concentrated Sri Lankan community, with LKR as the first currency. This market and currency are planning assumptions to confirm before accepting payments.
- Support individual used-book sellers and approved bookshops selling new or used books. Start with one seller and one listing per checkout; new-book listings may hold multiple copies.
- Use pickup as the first fulfillment method. Add seller-managed delivery only after shipping fees, address access, delivery evidence, and failure handling are implemented.
- Every payment must create an auditable order. Seller payouts must follow an arrangement approved by the chosen payment provider. Until that is resolved, use sandbox payments or a clearly labeled pickup-payment pilot.
- AI outputs are suggestions. Sellers confirm extracted details and set their own prices. Buyers can use search, browse, and purchase when every AI feature is disabled.
- English is the initial interface and AI evaluation language. Store Sinhala and Tamil metadata from the start; release multilingual AI only after language-specific evaluations.

## Users and outcomes

Readers need the correct title and edition, an honest condition description, available stock, a total price, and a dependable handover. Casual sellers need to publish quickly and understand what their books might sell for. Bookshops need stock counts and order handling. Administrators need moderation, account restrictions, payment reconciliation, and a way to resolve disputes.

The first success measure is completed orders with acceptable support effort. AI success means a measurable improvement over the simpler experience, not merely a model returning an answer. Measure listing completion, search success, purchase conversion, repeat purchases, seller cancellations, refund rate, contribution per order, and support minutes per completed order.

## Scope and component ownership

| Component | Owns | Depends on |
| --- | --- | --- |
| Core marketplace | Identity, catalogue, listings, stock, orders, payments, reviews | Hosting and operational policies |
| Recommendation engine | Ranked discovery feeds and explanations | Catalogue and consented interaction events |
| Librarian assistant | Cited policy answers and authorized order lookup | Approved knowledge and read-only business tools |
| Summaries and sentiment | Source-grounded book overviews and review aggregates | Permitted content and published reviews |
| Pricing predictor | Seller-facing comparable ranges and later predictions | Clean completed-sale history |
| Semantic vibe search | Natural-language retrieval with hard filters | Catalogue embeddings and lexical search |
| Vision auto-lister | Editable drafts from seller photographs | Uploads, catalogue matching, AI jobs |

The whole-app technology guide owns common infrastructure, event formats, deployment, and secrets. Component guides add their own endpoints and evaluation steps without introducing separate databases or queues by default.

## Essential customer journeys

1. A buyer searches or browses, compares available listings for the correct edition, selects quantity and fulfillment, sees the complete price, and reserves stock.
2. The server creates a payment attempt from the order snapshot. A verified provider notification updates payment state. The buyer sees pending until the server confirms payment.
3. The seller receives an order task, prepares the book, and records handover. The buyer confirms receipt or raises a problem. Completion makes a verified review eligible.
4. A seller enters details manually or uploads photographs. The auto-lister suggests catalogue matches and visible details. The seller confirms edition, condition, price, stock, and pickup area before publication.
5. A buyer uses vibe search or a recommendation feed. Both return ordinary listings and pass through the same authoritative stock and seller checks.
6. The Librarian retrieves policy evidence and, when authenticated, calls an order lookup scoped to that buyer or seller. It cannot refund, approve a seller, or change an order.

## Shared data and integration

Separate BookWork, BookEdition, and Listing. A work represents the underlying book; an edition identifies language, publisher, publication year, format, and optional ISBN; a listing represents one seller's sellable stock and condition. Summaries normally attach to a work or edition. Price suggestions attach to edition and condition. Checkout always targets a listing.

The Express API is the business authority. It authenticates users, validates writes, and records domain events in an outbox in the same database transaction. A Node worker delivers events to Redis queues and calls the private Python AI service. AI results include source version, model version, and provenance; the worker writes validated results to the appropriate collection. Stale results are rejected.

Search and recommendation indexes are derived data. Before returning a result, the API rechecks current listing visibility, price, stock, and seller status. Before reserving, it repeats those checks transactionally. Policy text, public catalogue text, and private orders must remain separate retrieval domains.

## Build order and dependency gates

| Stage | Build | Exit criterion |
| --- | --- | --- |
| 0 | Repair existing code and remove rental paths | Build and security regression tests pass |
| 1 | Sales marketplace and event collection | One complete purchase, cancellation, and refund flow is traceable |
| 2 | Basic recommendation feed | Popular and content-based feeds work without a trained model |
| 3 | Shared AI service and grounded summaries | Versioned jobs, source permissions, evaluations, and cost limits work |
| 4 | Semantic vibe search | Beats keyword baseline on an agreed query set |
| 5 | Librarian assistant | Answers are cited and private-order isolation tests pass |
| 6 | Vision auto-lister | Sellers confirm drafts and correction rates meet the agreed target |
| 7 | Review sentiment and personalized recommendations | Enough real reviews and interaction data exist for honest evaluation |
| 8 | Pricing predictor | Completed-sale data supports a model that beats comparable medians |

Rule-based price comparables can appear after stage 1. The trained pricing predictor waits for evidence. Review sentiment is part of stage 3's component design but remains hidden until there are enough eligible reviews. Stages are dependency gates, not promised calendar dates.

## Release requirements

- CORE-01: New and Used are the only condition families; all purchasable listings are sales. Legacy rentals are archived for seller review, never silently converted.
- CORE-02: Stock cannot become negative. Concurrent requests for the last copy produce one reservation.
- CORE-03: Repeated or out-of-order payment notifications cannot create duplicate fulfillment or payouts.
- AI-01: An AI outage cannot prevent listing manually, browsing, checkout, or order lookup.
- AI-02: Generated content displays its purpose, evidence, and correction or reporting path. Missing evidence produces an unavailable state.
- DATA-01: Events carry pseudonymous identity where possible. Private addresses, payment credentials, and support conversations never enter public vectors.
- OPS-01: There is a tested restoration procedure, a payment discrepancy queue, and an administrator audit trail.

Initial engineering targets are p95 under 800 ms for ordinary cached catalogue reads and under 2 seconds for search at 20 concurrent pilot users. Hosted AI tasks use separate time budgets. These are proposed test targets, not measured performance or contractual service levels.

## Adoption and measurement

Run a small pilot with relevant inventory and manually assisted handovers. Instrument impressions before using clicks to evaluate recommendations. Record server-confirmed paid and completed events; do not accept browser purchase events as transaction truth. Review the funnel weekly and separate new-book and used-book results.

A component ships only after its acceptance tests pass, the fallback is demonstrated, and operating cost is recorded. Keep comparison groups where traffic permits; at low traffic use task-based user studies and report uncertainty rather than claiming statistical uplift.

## Migration and unresolved business choices

The current repository has listing and account screens but lacks durable orders and stock reservations. The reviewed production build fails at the payment-success import; localhost API calls, OTP bypasses, unrestricted listing updates, and payment price trust need repair first. Existing source files are not changed by this planning package.

Before live commerce, the founder must decide seller approval evidence, commission, pickup locations, refund and cancellation policy, settlement timing, support ownership, and gateway eligibility. Do not advertise buyer protection or seller payouts beyond what the implemented operations can deliver.

Each component has a separate PRD and technology guide in this package. Read the whole-app technology guide next, followed by the core marketplace pair.
