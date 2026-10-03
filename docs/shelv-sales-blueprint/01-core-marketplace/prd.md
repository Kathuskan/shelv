# Shelv Sales Marketplace Product Requirements

Version 1.0 | 2 October 2026 | Owner: Shelv founder

Build the transaction foundation for selling new and used physical books. This component owns all commercial truth and must work without AI. It is the first implementation milestone and provides the reliable data used by every later component.

## Scope and user experience

Guests browse, search, and compare listings. Registered buyers save books, reserve stock, pay, track orders, deliver the book, and review completed purchases. Approved sellers publish and manage listings and handovers. Administrators approve or restrict sellers, moderate listings, investigate payment discrepancies, and record dispute outcomes.

Start with a single listing per checkout and one seller per order. Support quantity one for an individual used copy and positive stock quantities for homogeneous new-book inventory. Used copies with different conditions require separate listings. Multi-seller baskets, subscriptions, rentals, and automatic overseas shipping are excluded.

## Functional requirements

- MKT-01 Identity: normalized email, verified email ownership, recoverable login, optional Google sign-in, and independent seller approval and suspension state. Suspension cannot be cleared through self-service verification.
- MKT-02 Catalogue: title, author, work and edition linkage, optional ISBN, language, format, publisher, year, and category. Permit manual metadata when no ISBN exists.
- MKT-03 Listings: condition family New or Used, detailed used-condition grade, defects, photographs, priceMinor, currency, stock, delivery area, and seller. Server validates permitted fields.
- MKT-04 Discovery: paginated keyword search with title, author, ISBN, condition, price, language, location, and availability filters. Distinguish network errors from zero results.
- MKT-05 Checkout: show item subtotal, fulfillment charge, platform charge if any, and final total before commitment. Snapshot all agreed commercial fields into the order, delivery address.
- MKT-06 Inventory: reserve stock atomically for a proposed 15-minute payment window. Expiry is enforced by business logic; database TTL cleanup is not the authority for releasing stock.
- MKT-07 Payment: authenticate the buyer, calculate the amount on the server, validate provider notifications, and reconcile unresolved attempts. A return-page visit is never payment proof.
- MKT-08 Fulfillment: record seller acceptance, ready-for-delivery, handover evidence, completion, cancellation, and dispute. Restrict transitions by actor and previous state.
- MKT-09 Reviews: one eligible book review and seller-service review per completed order, stored separately. Moderate abuse and allow reports; preserve transparent edit history.
- MKT-10 Administration: list moderation, seller restrictions, refund tracking, audited intervention, and payment discrepancy resolution.

## State and money rules

Keep payment and fulfillment states separate. Payment states include unpaid, pending, paid, refund_pending, refunded, and failed. Fulfillment states include awaiting_payment, awaiting_seller, ready, handed_over, completed, cancelled, and disputed. Partial refund amounts are recorded explicitly rather than inferred from a single label.

Cancellation must define whether stock is released, whether money must be returned, and whether the seller has already handed over the book. If payment arrives after a reservation expires, attempt a new atomic allocation only when valid; otherwise flag a refund or manual resolution. Never silently sell nonexistent stock.

Payouts require a settlement ledger and an approved provider process. A manual seller-payment pilot still needs a ledger, an operator checklist, and reconciliation; it must not be described as automated payouts.

## Data and integrations

Core entities are User, BookWork, BookEdition, Listing, Reservation, Order, PaymentAttempt, Refund, Settlement, Review, and OutboxEvent. All money uses integer minor units plus currency. Orders retain immutable line-item and seller snapshots. Public responses exclude seller private contact details unless the disclosure policy permits them.

Publish listing and review changes to derived-data workers. Publish order.completed for recommendation outcomes and later pricing labels. AI drafts and estimates cannot directly publish a listing, change money, approve accounts, or complete orders.

## Existing code migration

Repair the empty payment-success component and inconsistent import case. Replace localhost calls with the shared API client. Fix OTP validation, confidential-field responses, update allowlists, and admin route mismatches. Consolidate duplicate delete routes and image handling.

Export existing records before migration. Map Sale records to active or review-needed listings after validating price and seller. Archive Rent records as legacy_rental and ask sellers to create a sale offer. Remove rental controls, period fields, fees, wording, and payment paths from the active UI and API. Preserve historical exports until a retention decision is made.

Backfill edition records using normalized ISBN where reliable; use manual review for conflicts and missing metadata. Preserve old listing URLs through ID mapping or redirects. Do not automatically merge books by title alone.

## Acceptance and release

The release suite must show that an anonymous caller cannot checkout; modified browser prices are ignored; two buyers cannot reserve the same last copy; repeated callbacks fulfill once; failed callbacks can recover; restricted sellers cannot publish or sell; buyers cannot read another buyer's order; and an AI outage leaves the core journey usable.

Also verify mobile layout, keyboard operation, labeled inputs, visible focus, readable errors, photo uploads, password recovery, and a complete sandbox purchase and refund. No rental purchase path may remain. Proposed pilot targets are zero oversells in concurrency tests and a fully reconciled transaction ledger before public paid launch.

## Delivery order

Build identity and validation repairs, then catalogue migration and stock, then orders and payment adapters, then handover and refunds, then reviews and analytics. Begin recommendation event collection at the first pilot, even while ranking is basic. Gateway eligibility, commission, refund rules, and seller settlement policy are founder decisions that block live collection of customer money.
