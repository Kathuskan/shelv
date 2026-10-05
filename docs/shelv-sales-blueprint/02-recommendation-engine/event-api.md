# First persistent discovery API

This is the first backend slice after the offline lessons. The routes are mounted
in the existing Express app and use the existing authenticated bearer token.
Signed-in readers now see an opt-in Book suggestions section on the homepage.
The lesson scripts still run separately in memory.

## Homepage behavior

Guests retain normal catalogue browsing without discovery tracking. Signed-in
readers must explicitly enable suggestions. The section uses the newest-first
endpoint, labels its reasons as recently listed, and offers refresh, save, dismiss
and turn-off/clear-history controls. It does not claim learned personalization.

Cards generate an impression when at least half of the card is visible in a
visible tab. A direct click/save/dismiss also ensures its impression is accepted
before submitting the action. Per-feed event payloads are reused for retries.
Actions stop queuing when collection is turned off; the server remains the final
consent authority. A failed click event never blocks book navigation. A failed
save event reports when the core bookmark was saved successfully but suggestion
history was not updated. Refresh obtains a new snapshot, including after expiry.

The ordinary catalogue remains usable when discovery fails or is off. There is
no durable browser retry queue or background tracking. Impression-only delivery
failures retry on subsequent visibility changes or an action, so analytics can
undercount exposure during network problems. Event ordering and cancellation
have automated tests; browser flow verification uses fictional API responses.

## Try the flow

1. Sign in through the existing application and use its token for API requests.
2. `GET /api/v1/recommendation-preferences` returns `{ "enabled": false,
   "languages": [], "genres": [] }` until configured.
3. Explicitly opt in using `PUT /api/v1/recommendation-preferences` with
   `{ "enabled": true, "languages": ["English"], "genres": ["Fantasy"] }`.
   Lists are optional; omitted lists keep prior choices. Values currently match
   catalogue spelling exactly. Each list accepts at most ten entries.
4. `GET /api/v1/recommendations?surface=home&limit=12` returns recent active sale
   listings, ranks, reasons, a requestId, algorithmVersion and experimentAssignment.
   The endpoint requires opt-in in this first slice. Existing public browsing is
   unchanged; anonymous recommendation/event handling remains future work.
5. When a card is actually displayed, send `POST /api/v1/events`:

```json
{
  "eventId": "a-new-unique-id-for-this-action",
  "eventType": "impression",
  "listingId": "<listing _id from the response>",
  "requestId": "<requestId from the response>",
  "rank": 1,
  "occurredAt": "<current UTC ISO timestamp>"
}
```

Use the same eventId, timestamp and body when retrying. A new event returns 201;
an exact retry returns 200 with `duplicate: true`. Reusing an event ID for another
action returns 409. Impression delivery must complete before click/save/dismiss
delivery; actions with no preceding impression return 409 and may be retried.

6. Send a new eventId for `click`, `save` or `dismiss`. Before a save event, use the
   existing `PUT /api/user/saved-books/:id` route. The event endpoint verifies that
   core bookmark; it does not create it. A save adds a derived profile input and
   a dismissal removes that input and excludes the listing. Dismissal wins over
   later save signals until reset. Clicks do not alter the derived profile yet.
7. `DELETE /api/v1/recommendation-preferences` (or PUT with `enabled: false`)
   disables collection, deletes this actor's events and snapshots, clears explicit
   and derived preferences and rotates the opaque actor ID. Existing core bookmarks
   remain. Re-enabling starts a fresh discovery profile.

The first live feed is recency-based, not the lesson's personalized model. Saved
and dismissed profile IDs are excluded, but their metadata does not rank results
yet. Un-saving a core bookmark now removes its derived discovery input in the
same transaction. The feed also excludes core bookmarks even if their analytics
save event failed. Explicit language/genre editing is currently API-only.

## Persistence and attribution

MongoDB collections are `userpreferences`, `recommendationsnapshots` and
`interactionevents`. Model imports register their indexes during normal startup.
The existing replica-set/Atlas requirement applies because these writes use
transactions. Consent changes, feed snapshots and events serialize through a
preference-document write, so revocation cannot leave a concurrently committed
old-actor event behind. This requires real database verification, not just mocks.

Only the server supplies the opaque actor identity, surface, algorithm version
and experiment assignment. Client-supplied extra fields are rejected. Events must
match the actor's issued request, listing and rank. Snapshot records expire after
one hour; expiry is checked explicitly even before MongoDB TTL cleanup. Exact
event retries remain valid after snapshot expiry while the event is retained and
consent remains enabled. Raw events have the blueprint's proposed 90-day TTL.
Derived preferences persist until reset; they are capped at 1,000 saves and 1,000
dismissals. No addresses, emails or payment information enter these records.

The feed reads current stock and seller eligibility, excludes the reader's own
listings, caps any seller/author at three results and deduplicates nonempty
normalized ISBNs. It scans at most the 500 newest candidates, so sparse/restricted
inventory can yield fewer results. Shared edition IDs and complete deduplication
for books without ISBNs remain future catalogue work. The initial cap of three
is fixed in code; configurable diversity settings are not implemented yet.

Rate limits are process-local: 120 events, 30 feed requests and 20 preference
changes per minute per authenticated user for each route limiter. Use shared
limits before running multiple API instances. Browser impressions and clicks
remain untrusted analytics signals, not proof of attention. Payments and completed
orders are never accepted from this endpoint.

## Verification

`npm test` runs validation and service tests with isolated model doubles. The
database suite runs only with explicit `TEST_MONGO_URI` pointing to a separate
replica set; it never loads `.env` and creates/drops only its uniquely named test
database. Run the discovery suite with:

```sh
TEST_MONGO_URI='<separate test replica-set URI>' node --test server/test/discovery.integration.test.js
```

That suite covers HTTP authentication, consent, persisted snapshots, cross-reader
attribution, concurrent duplicate retries, trusted saves and opt-out deletion.
Guest tracking, learned ranking, caches, background aggregation and a deletion
hook for a future account-deletion feature are not implemented in this slice.
