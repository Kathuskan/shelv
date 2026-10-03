# Shelv Librarian Assistant Technology and Setup

Version 1.0 | 2 October 2026 | Owner: Shelv founder

Implement the Librarian as a module in the shared FastAPI service, using Atlas Vector Search for approved help content and a hosted text model for grounded responses. Keep business authorization in Express. A lightweight explicit retrieval pipeline is sufficient; an agent framework is optional and not part of the initial stack.

## Setup and knowledge ingestion

1. Complete the whole-app setup and implement authenticated read-only order lookup in the core marketplace.
2. Create reviewed help documents covering seller eligibility, pickup, cancellations, refunds, condition disputes, account access, and contact support. Assign version, locale, and effective date before publication.
3. Add app/librarian.py, app/retrieval.py, jobs/index_knowledge.py, and evals/librarian.py to the Python service. Implement a Node worker consumer for policy.published and policy.retired.
4. Split documents by heading into roughly 300 to 600 token chunks, with small overlap where a section boundary needs context. Preserve the section title and source reference. Tune chunking against actual support questions.
5. Generate embeddings using the configured shared model and insert derived KnowledgeChunk records through the worker. Create a dedicated policy vector index with filters for publication state, locale, and version.
6. Test retrieval without generation first. Then add a structured answer schema and evidence validation.

Chunk sizes and retrieval counts are starting parameters. Do not put payment credentials, order records, or private account documents into this collection.

## Request and tool boundary

POST /api/v1/assistant/messages accepts sessionId and message. Express checks ownership, limits message length and conversation size, resolves the authenticated actor, and forwards a minimal request to POST /internal/librarian. Responses contain answer, citations, suggestedActions, needsHuman, and requestId.

The only initial tools are searchApprovedPolicies, searchPublicCatalog, and getAuthorizedOrderStatus. For the order tool, Python returns a structured tool request to the orchestrating Express layer. Express supplies the authenticated actor independently, checks buyer or seller ownership, invokes its own service function, and returns a redacted result. Bound the loop to a proposed three tool calls. Do not let Python or the model invent an actor ID or execute a database query.

Citations must refer to retrieved approved document IDs. Validate the IDs and render known titles and URLs from the database. Never render model-supplied arbitrary links as trusted help citations. Verify statement support through the evaluation suite; JSON shape validation alone does not establish truth.

## Configuration

```dotenv
LIBRARIAN_ENABLED=false
RAG_INDEX_NAME=policy_vector_v1
RAG_TOP_K=6
RAG_MAX_CONTEXT_TOKENS=4000
RAG_MAX_TOOL_CALLS=3
RAG_RESPONSE_TIMEOUT_SECONDS=15
CHAT_RETENTION_DAYS=30
```

Use TEXT_MODEL, OPENAI_API_KEY, and AI_SERVICE_TOKEN from the shared service. Configure model requests for structured output and handle refusal, timeout, empty retrieval, and schema failure explicitly. Calibrate evidence thresholds on a labeled retrieval set rather than assuming one cosine score works for every language and model.

## Proposed module commands

After creating the modules, the following commands define the reproducible ingestion and evaluation interface:

```sh
cd ai-service
.venv/bin/python -m jobs.index_knowledge \
  --manifest data/approved-policies.json --version policy-v1
.venv/bin/python -m evals.librarian \
  --cases evals/data/librarian-v1.jsonl --output reports/librarian-v1.json
```

The indexing CLI prepares derived results and uses the same restricted worker persistence contract as production. Retiring a policy must remove it from eligible retrieval immediately and trigger cache invalidation. Add a reconciliation job for obsolete chunks.

## Security and tests

Create two synthetic buyers with different orders. Ask for each other's order IDs directly and through malicious chat instructions; access must be denied before generation. Test a retrieved document that tells the model to ignore its instructions. Test fabricated citations, old policies, unknown questions, and a request to issue a refund. Verify that the last request provides a support path and cannot mutate a payment.

Use mocked model outputs for deterministic CI and a separate approved-cost evaluation job for provider testing. Log prompt version, document versions, latency, and redacted tool outcomes, not full order records. Human support tickets require explicit user confirmation and idempotent submission.

## Deployment and recovery

Release policy-only answers behind a feature flag, then enable authorized order lookup after isolation tests. Cache only public policy responses with policy version and locale in the key. Never share personalized response caches across users. If the model or vector service fails, return links to static help and the normal order page. Roll back prompt and index versions independently.

Official reference: https://developers.openai.com/api/docs/guides/structured-outputs
