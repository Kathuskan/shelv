# Shelv Whole Application Technology and Setup

Version 1.0 | 2 October 2026 | Owner: Shelv founder

Retain React, Vite, Tailwind, Express, and MongoDB, and add one private Python service for AI and machine learning. This guide defines the proposed implementation and the shared setup used by every component. New folders, scripts, endpoints, and environment names below are specifications to implement; this package does not install or deploy the application.

## Selected stack

| Layer | Choice | Reason |
| --- | --- | --- |
| Browser | React 19, Vite, Tailwind 4, React Router | Preserve current skills and components |
| Business API | Node 24 LTS, Express, Mongoose, Zod | Keep business rules in the existing backend |
| Durable data | MongoDB Atlas replica set | Orders, transactions, catalogue, and derived vectors together |
| Search | Atlas Search and Vector Search | One operational platform for lexical and semantic retrieval |
| Async work | Redis compatible service and BullMQ Node worker | Retryable jobs and bounded concurrency |
| AI service | Python 3.12, FastAPI, Pydantic, httpx | Shared inference and evaluation boundary |
| ML | pandas, NumPy, scikit-learn, joblib | CPU baselines and reproducible tabular models |
| Hosted AI | OpenAI SDK and Responses API | Proposed text and vision provider behind an adapter |
| Embeddings | text-embedding-3-small at 1536 dimensions | Initial benchmark candidate, versioned everywhere |
| Images and email | Cloudinary and existing Nodemailer transport | Reuse integrations with validation and delivery monitoring |
| Quality | Vitest, Supertest, Playwright, pytest | Unit, API, browser, and AI evaluation layers |
| Deployment | Vercel frontend; Render API, worker, private AI service | Fits current frontend configuration and service separation |

Node 24 is a supported LTS baseline. Preserve existing locked package versions while repairing the application; upgrade one dependency group at a time. Python 3.12 is a chosen compatibility baseline, not a claim that it is the latest. Resolve package versions in a development branch, run checks, and commit npm locks and a Python lockfile before deployment.

Use gpt-4.1-mini as an initial text and vision benchmark candidate if enabled for the account, then select a pinned supported model from measured quality, latency, and cost. Never silently change embedding models or dimensions. Provider model availability, commercial plans, and prices must be checked when provisioning.

## Target layout

```text
client/                  React application
server/                  Express business API
server/modules/          auth catalog listings orders payments
server/workers/          outbox dispatcher and BullMQ processors
ai-service/app/          FastAPI application and component modules
ai-service/evals/        fixed evaluation datasets and runners
ai-service/jobs/         indexing and model training entry points
contracts/              JSON schemas and OpenAPI contracts
infra/                  container and deployment definitions
docs/shelv-sales-blueprint/  this planning package
```

Keep one repository and one Python environment. Do not run a different Python server for every AI feature. Add TypeScript gradually to new contracts and modules if useful; the first milestone does not require converting all existing JavaScript.

## Component connection map

```text
React browser
    | authenticated business requests
    v
Express API -------> MongoDB authoritative records
    |                     | committed outbox events
    |                     v
    |                Node dispatcher --> Redis job queues
    |                                         |
    |                                         v
    |                                  Node AI worker
    |                                         |
    +--- read requests -----------------------+
                                              v
                                   Private FastAPI service
                                   recommendations and pricing
                                   summaries and sentiment
                                   search and Librarian
                                   vision extraction
                                              |
                                   model provider and read-only
                                   approved retrieval data

Validated AI results --> Node worker --> MongoDB derived artifacts
Current stock and money are always checked by Express.
```

The synchronous route serves bounded search, recommendation, pricing, and support requests. Expensive or persistent enrichment runs through the queue. Python does not consume BullMQ directly and does not own commerce writes. Both paths use the same schemas, provider adapter, budgets, and version records.

## Initial local setup

Install Node 24, Python 3.12, Git, and a container runtime using their official distributions. From the repository root, restore the existing dependencies with these commands. They are instructions for the implementation session, not commands executed to create this document.

```sh
npm --prefix client ci
npm --prefix server ci
mkdir -p ai-service
python3.12 -m venv ai-service/.venv
ai-service/.venv/bin/python -m pip install --upgrade pip
ai-service/.venv/bin/pip install fastapi 'uvicorn[standard]' \
  pydantic pydantic-settings httpx openai pymongo \
  pandas numpy scikit-learn joblib pillow pytest pip-tools
npm --prefix server install zod helmet express-rate-limit \
  cookie-parser bullmq ioredis
npm --prefix server install --save-dev vitest supertest
npm --prefix client install --save-dev vitest \
  @testing-library/react @testing-library/jest-dom @playwright/test
```

Create ai-service/requirements.in with the selected Python dependencies, run pip-compile to produce a fully pinned requirements.txt, and use that lock for CI and deployment. Keep training-only dependencies separable later if serving images become large.

Provision separate development and production Atlas projects or databases with distinct credentials. Use a replica-set connection for order transactions. Atlas integration development requires the selected Search and Vector Search features; an ordinary local Mongo container is not assumed to provide them. Mock retrieval in offline tests.

For a local Redis queue, run the following development-only instance. Production requires private networking, authentication, persistence, and a no-eviction policy compatible with the queue workload.

```sh
docker run --name shelv-redis -p 127.0.0.1:6379:6379 \
  -d redis:7 redis-server --appendonly yes \
  --maxmemory-policy noeviction
```

## Environment configuration

Create ignored client/.env.local, server/.env, and ai-service/.env files. Commit corresponding .env.example files containing placeholders only. VITE variables are public browser configuration and must never contain secrets.

```dotenv
# client/.env.local
VITE_API_URL=http://localhost:5001

# server/.env shared foundation
NODE_ENV=development
PORT=5001
CLIENT_URL=http://localhost:5173
BACKEND_URL=http://localhost:5001
MONGO_URI=<development replica set URI>
REDIS_URL=redis://127.0.0.1:6379
JWT_SECRET=<random server secret while legacy JWT exists>
SESSION_SECRET=<random session secret for planned cookie sessions>
AI_SERVICE_URL=http://127.0.0.1:8000
AI_SERVICE_TOKEN=<random internal secret>
PAYMENT_PROVIDER=mock
CLOUDINARY_CLOUD_NAME=<cloud name>
CLOUDINARY_API_KEY=<server key>
CLOUDINARY_API_SECRET=<server secret>
EMAIL_USER=<development email account>
EMAIL_PASS=<development email credential>
GOOGLE_CLIENT_ID=<OAuth client id>
GOOGLE_CLIENT_SECRET=<OAuth client secret>

# ai-service/.env
OPENAI_API_KEY=<server side provider key>
TEXT_MODEL=gpt-4.1-mini
VISION_MODEL=gpt-4.1-mini
EMBEDDING_MODEL=text-embedding-3-small
EMBEDDING_DIMENSIONS=1536
AI_SERVICE_TOKEN=<same internal secret>
MONGO_URI=<AI read scoped database URI>
AI_DAILY_BUDGET_USD=2
AI_REQUEST_TIMEOUT_SECONDS=20
```

Budget values are initial developer-controlled limits, not provider prices. The application must enforce them using recorded consumption; an environment variable alone does nothing. Use mock AI in tests. Keep gateway-specific credentials behind the payment adapter and omit them until the provider is selected.

## Implement the runtime contract

Create ai-service/app/main.py with FastAPI, GET /health/live, GET /health/ready, internal bearer-token validation, Pydantic request schemas, and an exception handler that returns requestId and a safe error code. Read .env through pydantic-settings with paths explicitly anchored to the service directory. Liveness checks process health; readiness checks required configuration and database access, without making a billable model call.

Create server/workers/index.js and an outbox dispatcher. The API owns domain writes. Python reads approved data through restricted credentials and returns validated results; the Node worker persists outputs. AI administrative writes must pass through the business API. Live internal requests are schema validated and never accept a browser-provided user identity as authorization.

Add GET /health/live and /health/ready to Express. Existing npm start works in server; the new worker entry point and all AI endpoints must be implemented before the following proposed launch commands work. Run each service in a separate terminal.

```sh
npm --prefix server start
npm --prefix client run dev
node server/workers/index.js
cd ai-service
.venv/bin/uvicorn app.main:app --reload --port 8000
```

Workers must explicitly load server/.env using an absolute path or a path relative to their module; they must not depend on the shell working directory. The existing API should likewise anchor its environment loading before moving start commands.

## Data and event contract

Persist BookWork, BookEdition, Listing, User, Order, PaymentAttempt, Reservation, Review, OutboxEvent, AiArtifact, and ModelVersion. Add InteractionEvent for consented discovery signals, KnowledgeDocument and KnowledgeChunk for support, and ListingDraft for auto-listing.

An event contains eventId, eventType, schemaVersion, aggregateId, aggregateVersion, occurredAt, traceId, and payload. Examples are listing.published, listing.updated, order.paid, order.completed, review.published, policy.published, and listing.archived. Domain events come from the server. Browser analytics can report impressions and clicks but cannot declare payment or completion.

Write business change and outbox event in one Mongo transaction. Dispatch with at-least-once delivery. Use a deduplication key derived from eventId and consumer version, bounded retries with exponential backoff, and a failed-job queue visible to administrators. A worker may crash after doing work, so database writes must be idempotent independently of queue job IDs. Recovery scans reconcile undelivered outbox rows and missing artifacts.

## Indexes and versioning

Create unique indexes for normalized email, provider payment reference, and consumer event deduplication. Do not make title unique. Optional ISBNs require normalization and an appropriate partial uniqueness rule. Index listing status, editionId, sellerId, priceMinor, and createdAt for catalogue access; index orders by buyer and seller with createdAt.

Create separate vector collections or indexes for public edition content and approved policy chunks. Record sourceHash, sourceVersion, embeddingModel, dimensions, and indexVersion. Never mix embeddings from different models in one search space. When changing a model, build a new index, evaluate it, switch configuration, and retain a rollback version.

## Production topology and deployment

Deploy the frontend with root client, build command npm ci followed by npm run build, and output dist. Preserve the SPA rewrite. Route /api to the Express backend through the frontend domain, or use same-site custom app and API subdomains with deliberate CORS and cookie settings. Test authentication on the actual domains; do not rely on cross-site third-party cookies between default hosting domains.

Deploy Express as a public Render web service and the Node worker as a background worker. Deploy FastAPI as a private service in the same region. Use uvicorn app.main:app --host 0.0.0.0 --port 8000 after installing the pinned requirements. Configure the worker's AI_SERVICE_URL with the private service address. Only Express exposes business endpoints publicly.

Connect Atlas and Redis over allowed network paths using separate service credentials. Configure Cloudinary limits and a production email transport. Set payment notification URLs to the public backend and verify them in the provider sandbox. Store model artifacts in a versioned private object store when pricing training begins; never rely on an ephemeral container disk as the model registry.

CI must run frontend build and lint, API unit and integration tests, Python tests, and a mocked browser purchase. Integration tests use an isolated replica-set database. Promote the same built artifact from staging to production. Roll back the application image and AI model configuration independently; migrations must be additive until rollback is no longer needed.

## Operations and verification

Record request IDs, safe structured errors, queue age, job failure rate, payment discrepancies, AI token or image consumption, and fallback frequency. Do not log secrets, OTPs, full addresses, or entire private conversations. Start with daily encrypted database backups where supported and a monthly restore drill; verify the selected hosting plans actually provide the required recovery features.

Verify health endpoints, seed a synthetic seller and buyer, publish a listing, reserve the last copy concurrently, complete a mock payment, replay its notification, and confirm only one order fulfillment. Stop Redis and the AI service; purchases must still work while derived-data work waits in the outbox. Reconnect them and confirm recovery without duplicate artifacts.

Planning retention defaults are 90 days for raw discovery events, 30 days for support sessions, and 7 days for abandoned photo drafts. Implement deletion from caches, vectors, and future training exports. Transaction retention must be set after business and applicable recordkeeping requirements are confirmed. These are proposed product defaults, not legal advice.

## Official references

- Node release status: https://github.com/nodejs/Release
- OpenAI structured outputs: https://developers.openai.com/api/docs/guides/structured-outputs
- OpenAI embeddings: https://developers.openai.com/api/docs/guides/embeddings
- Initial model candidate: https://developers.openai.com/api/docs/models/gpt-4.1-mini
- MongoDB hybrid search: https://www.mongodb.com/docs/search/tutorial/hybrid-search/
- BullMQ job design: https://docs.bullmq.io/patterns/idempotent-jobs
- FastAPI containers: https://fastapi.tiangolo.com/deployment/docker/
- Render private services: https://render.com/docs/private-services
- Render workers: https://render.com/docs/background-workers

References checked 2 October 2026. Architecture choices and numeric test thresholds are Shelv planning decisions, not vendor guarantees.
