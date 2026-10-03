# Shelv — book sales core

A React + Express marketplace for **new and used book sales**, with delivery addresses, cash on delivery, Stripe card checkout, stock reservations, seller dispatch, tracking, receipt confirmation and verified purchase reviews. The active application does not offer rentals.

## Start locally

Prerequisites: Node.js 22 LTS or newer and MongoDB Atlas or a MongoDB replica set. Orders use transactions, so a stand-alone MongoDB server is not supported.

1. Install dependencies: `npm --prefix server ci` and `npm --prefix client ci`.
2. Create `server/.env` and `client/.env` using the corresponding `.env.example` files. Preserve existing secrets if these files already exist.
3. Set `MONGO_URI`, a random `JWT_SECRET` of at least 32 characters, and matching frontend/backend URLs. For example, frontend `http://localhost:5173`, API `http://localhost:5001`. Use one hostname consistently.
4. Run `npm run server` in one terminal and `npm run dev` in another.
5. Register your administrator account through the app, then run `npm --prefix server run admin -- your-account@example.com` against the intended database. This explicit operator command grants administrator privileges to the existing account.
6. Configure email and Cloudinary before testing seller applications and image uploads. Apply for a seller account, verify the email code, and approve the application from the administrator screen.
7. Create a listing with its actual available stock, condition, dispatch location, price and delivery fee. Use a separate buyer account to order it.

`npm run build` builds the frontend. `npm run lint` checks the frontend. `npm test` runs business-rule tests and skips database integration when no test database is supplied.

## Find users and add demo data

MongoDB calls tables **collections**. User accounts are stored in the `users` collection inside the database selected by `MONGO_URI`. If the connection URI has no database path, MongoDB uses the `test` database. In Atlas, open the cluster → Browse Collections → `test` → `users` for that configuration. The API startup message also prints the active database name. To choose another database for a fresh environment, include its name in the URI path; changing it does not move existing accounts.

Preview the demo seed, then add its sample data:

```sh
npm --prefix server run seed:demo
npm --prefix server run seed:demo -- --apply
```

The seed adds five accounts (administrator, two approved sellers, buyer, and pending seller applicant) and ten new/used book listings with local sample cover images. It generates a random shared demo password and saves credentials in `server/.demo-credentials.json`, excluded from Git. Existing accounts, their passwords, and existing listing stock are preserved on repeat runs. Demo email addresses use the reserved `.example` domain, and the buyer's delivery address is fictional. Use them for local testing; they do not receive email. Sign in to the demo admin with `demo.admin@shelv.example` and the generated password from that file. The seed creates data only when passed `--apply` and uses the currently configured database.

## Delivery and payment flow

- A checkout contains one listing and 1–20 copies from one seller. The buyer enters recipient, phone, street, optional landmark, city, district, postal code and optional instructions. This release serves Sri Lanka in LKR.
- The server calculates the subtotal and the seller's fixed **per-order** delivery fee. A changed price requires reviewing the new total. There is no automatic distance-based shipping calculation.
- The order stores a permanent item/price/address snapshot. Editing a profile or listing cannot alter a previously placed order.
- COD orders are placed immediately. Card orders reserve stock for up to 60 minutes; the buyer opens secure hosted Stripe checkout from the order page. A new payment session must be opened within approximately 29 minutes of creating the order, because Stripe requires at least a 30-minute session lifetime. Otherwise cancel and create a new order.
- The seller confirms preparation, arranges courier delivery to the displayed address, then enters the courier, tracking number and optional HTTPS tracking URL. **This does not book a courier or generate a shipping label.**
- The buyer confirms receipt. COD remains due until the seller separately confirms cash collection. Delivered buyers may review their purchase once.
- Either order party can cancel before dispatch. Stock is restored once. Paid card cancellations enter a refund queue; the payment status becomes refunded only after Stripe confirms it.
- Buyers can report issues after dispatch. An administrator resolves them as delivered or returned. Returned stock is restored only when the administrator confirms it is suitable to relist. Cash refunds are performed outside the app and require a recorded reference to mark complete.
- A background worker reconciles card checkout, releases expired reservations, processes refunds and retries notification emails every 30 seconds. In-app orders remain the source of truth if email delivery fails.

## Card configuration

The existing Stripe integration has been replaced with server-priced Checkout sessions and signed webhook verification. No card numbers are stored by Shelv.

1. Use a Stripe account eligible to operate for your business and accept the configured currency. Provider credentials are required; the implementation does not establish merchant eligibility.
2. Start with test credentials: set `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`, and `CARD_PAYMENTS_ENABLED=true` in `server/.env`.
3. Configure the webhook endpoint as `BACKEND_URL/api/webhook` and enable `checkout.session.completed` and `checkout.session.async_payment_succeeded`. For local development, the Stripe CLI can forward events to `localhost:5001/api/webhook` and supplies a separate local signing secret.
4. Ensure `CLIENT_URL` matches the frontend origin. The return URL leads back to the order; returning from checkout does **not** establish payment. The signed event or server reconciliation does.
5. Exercise a test payment, duplicate webhook, abandoned checkout, cancellation, late payment and refund before using live keys.

Without all three card settings, checkout clearly disables the card option while COD stays available. Browser publishable Stripe keys are not required for hosted redirects; the old `VITE_STRIPE_PK` setting is unused.

**Seller settlement is not automated.** Card funds belong to the configured merchant account. Multi-seller transfers, commissions and a payout ledger are outside this core implementation. Establish and reconcile seller payouts before enabling live marketplace card payments. Tax, invoicing and commercial refund policy also require business decisions.

## Other services

- **Images:** `CLOUDINARY_CLOUD_NAME`, `CLOUDINARY_API_KEY`, `CLOUDINARY_API_SECRET`. Book uploads accept up to five JPEG/PNG/WebP files at 5 MB each. Profile uploads accept one file. Existing Cloudinary image URLs still render with optimized delivery.
- **Email:** `EMAIL_USER` and `EMAIL_PASS` configure the existing Gmail sender. Use an application password where required. Email verification codes expire after ten minutes with five attempts and resend limits. Password reset links expire after thirty minutes.
- **Google (optional):** set `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`, and `BACKEND_URL`. Authorized callback: `BACKEND_URL/api/auth/google/callback`. OAuth state is checked with an HTTP-only same-site cookie. Existing Google-linked users may sign in. A matching email on a password-only account is not silently linked; sign in with its password or reset it.
- Use HTTPS for deployed frontend/API URLs. Set `NODE_ENV=production` for secure OAuth cookies. Configure the host to serve the frontend's `index.html` for client-side routes such as `/orders/:id`.

## Existing database migration

Back up the database, stop checkout writes during migration, and first inspect a dry run:

```sh
npm --prefix server run migrate:sales
```

Apply deliberately against the intended database:

```sh
npm --prefix server run migrate:sales -- --apply
```

The migration archives rental listings without deleting them. For sales with missing fields it initializes stock to 1, delivery fee to 0, status to active, and listing version to 0. **Review every migrated listing's real stock and delivery charge before accepting orders.** It does not convert rentals into sales or automatically approve sellers. The migration reopens old pending seller applications without verified email so they can complete verification again. Existing passwords and Google IDs are retained.

## Verification

```sh
npm test
npm run lint
npm run build
```

The unit suite exercises validation, stored-price quotation, address access, dispatch restrictions, tracking URLs, COD receipt/collection, cancellation/restock, payment matching and duplicate confirmation, late-paid cancellation refunds, expiry and dispute permissions. These tests use isolated model doubles; they do not prove real database concurrency.

For real transaction/HTTP checks, provide a **separate test replica set**:

```sh
TEST_MONGO_URI='mongodb://127.0.0.1:27017/?replicaSet=rs0' npm --prefix server run test:integration
```

This creates a uniquely named `shelv_test_*` database and drops only that test database afterward. It never loads `server/.env`. The suite covers concurrent purchases of the last copy, concurrent idempotent retries, address snapshots, access control, price tampering, card webhook flow and seller restrictions. Its gateway is a fixture; Stripe test-mode verification remains a separate integration step.

`client/scripts/check-ui.cjs` is an optional Playwright browser smoke test using isolated API fixtures. Install Playwright and its browser in your development/test tooling, start Vite, then run `npm --prefix client run test:ui`. `PLAYWRIGHT_MODULE` may point to an existing Playwright package; `CHROME_PATH` may point to a compatible local browser executable. It does not access real accounts or payments.

Validation on this implementation pass: production build and frontend lint passed; 15 business-rule and signature tests passed. The database integration suite was **not run**, because a separate test database was unavailable and the temporary database dependency download failed. The scripted browser runner could not download Chromium; the buyer checkout → seller dispatch → buyer receipt path was instead checked in the in-app browser against an isolated local fixture service, including a 390 px mobile layout. No live database migration, payment, refund, email, courier booking or deployment was performed.

## Code map and boundaries

- `client/src/App.jsx` and `client/src/core/`: active sales-only screens and API helpers.
- `server/app.js`: testable HTTP application; authentication, catalogue, order and administration routes.
- `server/services/orders.js`: transactional inventory, order lifecycle, payment confirmation and refunds.
- `server/services/gateway.js`: Stripe adapter; `server/services/worker.js`: reconciliation/outbox processing.
- `server/models/Order.js`: immutable purchase/delivery snapshot, lifecycle history and payment/shipping state.
- `server/index.js`: environment checks, database connection, index initialization and worker startup.
- `docs/shelv-sales-blueprint/`: whole-app and component PRD/stack documents from the planning phase. AI components remain future phases.

Older frontend components remain outside the active route tree to preserve existing work; old backend routers now return a retirement response if accidentally mounted. The active app uses the shared API base URL.

Operational boundaries: single API/worker instance for the pilot; rate limiting is process-local, and notification delivery is at-least-once. Use shared rate limiting, a leased job queue and monitoring before horizontal scaling. Add reserve-abuse controls, automatic courier integration, payout accounting, image cleanup and stronger production observability as the marketplace grows. Administrators currently see the latest 500 users/listings; orders and the public catalogue are paginated. AI recommendations, RAG, summaries, semantic search, pricing prediction and vision listing are not part of this sales core.
