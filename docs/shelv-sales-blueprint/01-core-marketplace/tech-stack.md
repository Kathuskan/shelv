# Shelv Sales Marketplace Technology and Setup

Version 1.0 | 2 October 2026 | Owner: Shelv founder

Implement this component inside the existing React and Express applications. MongoDB remains the source of truth. AI is not required to complete this setup. Read the whole-app guide for runtime installation, shared environment files, hosting, and the future worker contract.

## Dependencies and module boundaries

Use React Router for pages, the shared Axios client for API access, Zod for request validation, Mongoose for persistence, bcrypt for local passwords, and Passport for Google sign-in. Use server-managed HttpOnly cookie sessions with CSRF protection for state-changing requests. Add a Session collection with expiry and server-side revocation. During migration, explicitly retire legacy localStorage tokens after active sessions are reauthenticated.

Organize server/modules into auth, catalog, listings, orders, payments, reviews, and admin. Each module has routes, validation, service functions, and persistence access. Controllers never accept arbitrary model updates. Keep Express 4 initially and wrap asynchronous errors consistently; an Express major upgrade is a separate change.

## Setup steps

1. Follow the whole-app dependency restoration instructions and save a database export. Make a repair branch before changing the current checkout.
2. Correct the payment-success file and import, remove duplicate routes, and replace hardcoded frontend API URLs. Ensure client build and lint succeed.
3. Create schemas and migration scripts for editions, listings, reservations, orders, payment attempts, refunds, settlements, sessions, and outbox events. Run the migration in dry-run mode and review counts before applying it to development data.
4. Add validation and response allowlists. Implement email verification with hashed codes, short expiry, attempt caps, and server-side resend limits. Separate emailVerifiedAt from sellerStatus.
5. Implement atomic stock reservation and an expiry/reconciliation worker. Use Mongo transactions on a replica set for stock, order, and outbox updates.
6. Implement a mock payment adapter and complete all failure-path tests before connecting a gateway.
7. Add the browser order flow, handover confirmation, review eligibility, and an operator reconciliation screen.

Proposed scripts such as migrate:sales and reconcile:payments must be created and documented in server/package.json; they do not exist in the reviewed repository.

## API contract

| Method and path | Responsibility |
| --- | --- |
| GET /api/v1/listings | Public filtered page of active listings |
| POST /api/v1/listings | Approved seller creates a validated sale listing |
| PATCH /api/v1/listings/:id | Owner edits allowed fields with version check |
| POST /api/v1/orders | Buyer reserves quantity and receives a server total |
| POST /api/v1/orders/:id/payment | Creates an idempotent payment attempt |
| GET /api/v1/orders/:id | Owner or authorized operator sees order status |
| POST /api/v1/payments/webhook/:provider | Provider-specific verified notification |
| POST /api/v1/orders/:id/handover | Authorized handover confirmation |
| POST /api/v1/orders/:id/reviews | Eligible participant submits review |

Versioned routes are proposed replacements; migrate frontend callers deliberately and keep temporary compatibility only where tested. Error responses use code, message, requestId, and fieldErrors. Use 401 for unauthenticated, 403 for denied, 409 for stock or version conflicts, and 422 for invalid input. Enforce idempotency keys for order and payment creation.

## Reservation and payment algorithm

Store stockOnHand and reservedQuantity. Within one transaction, conditionally increment reservedQuantity only when available stock covers the request, then create Reservation and Order with an immutable total. The release job conditionally moves an active reservation to expired and decrements reservedQuantity once.

A valid paid callback conditionally consumes the active reservation, decrements stockOnHand and reservedQuantity, updates PaymentAttempt, and writes an outbox event. If the reservation is already expired or consumed by another attempt, use the late-payment recovery policy. Database uniqueness on provider references prevents duplicate financial processing.

Payment adapters expose createPayment, verifyNotification, queryPayment, and requestRefund. Normalize provider results into internal states. Preserve provider-specific raw verification input until signature checks finish. Retry transient failures through reconciliation without duplicating charges.

## Payment provider configuration

Use PAYMENT_PROVIDER=mock for local and CI tests. Implement a gateway adapter only after confirming that the business entity and seller settlement arrangement are supported. For a Sri Lankan merchant, evaluate PayHere; retain Stripe only if the actual merchant setup qualifies. These are provider candidates, not a claim that either supports the intended marketplace settlement flow.

For PayHere, keep merchant ID and merchant secret on the backend, generate checkout values from the order snapshot, verify server notification checksums according to the provider's current documentation, and compare order, amount, currency, and status. The browser return page reads the order status from Shelv. Use sandbox credentials and a publicly reachable staging notification URL for integration tests.

For Stripe, configure STRIPE_SECRET_KEY and STRIPE_WEBHOOK_SECRET, bind orderId and paymentAttemptId through metadata, and verify raw-body signatures. Retrieve and validate provider state when reconciling uncertain events. Never accept a submitted listing price as the charge amount.

## Frontend and uploads

Create buyer order history, seller orders, listing editor, and admin reconciliation pages. Centralize session fetching and expired-session recovery. Ensure authentication survives the chosen production domain arrangement. Display payment pending, confirmed, failed, and refund-pending states accurately.

Use one Cloudinary upload path for listing images. Enforce a proposed 5-image limit, 8 MB per image, MIME and decoded-image validation, and total request limits. Store publicId and dimensions alongside URL. Remove orphaned uploads through a scheduled cleanup. Profile pictures use a separate size limit and endpoint. Validate these limits against actual user photographs before launch.

## Tests and operating checks

Create API tests using Supertest against an isolated replica-set database and Playwright browser tests against mocked payments. Test the purchase and refund flow, authorization matrix, last-copy race, expired reservation, duplicate and out-of-order callbacks, invalid signatures, seller suspension, and rental migration.

Run npm --prefix client run build and npm --prefix client run lint. Add server test scripts and run them in CI. Add a health readiness check that fails when the database is unavailable. Record unmatched payment callbacks and allow operators to resolve them with an audit reason.

Deploy the API and frontend before enabling AI. Set the payment feature flag off until gateway sandbox tests, settlement decisions, production credentials, and notification verification are complete. Rollback must preserve orders and payments; disable new checkout rather than deleting financial records.

## References

- PayHere checkout and notification contract: https://support.payhere.lk/api-%26-mobile-sdk/checkout-api
- PayHere merchant application: https://support.payhere.lk/application-process
- Stripe merchant availability: https://stripe.com/global
- Stripe fulfillment: https://docs.stripe.com/checkout/fulfillment

Provider requirements checked 2 October 2026; confirm account-specific eligibility during setup.
