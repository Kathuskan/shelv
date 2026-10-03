# Shelv Computer Vision Auto Lister Technology and Setup

Version 1.0 | 2 October 2026 | Owner: Shelv founder

Use Cloudinary private draft assets, the shared BullMQ worker, and a vision-capable model through the private Python service. Use Pillow for decoded-image checks and resizing. Begin with hosted extraction and catalogue matching; custom computer-vision training and GPU infrastructure are unnecessary for the first release.

## Setup sequence

1. Add ListingDraft, draft-image ownership, expiry, and cleanup records to the core API. Reuse multipart upload validation with tighter draft access controls.
2. Create app/vision.py, app/isbn.py, and evals/vision.py in the shared service. Implement title and author normalization and ISBN-10 and ISBN-13 checksum checks.
3. Add POST /api/v1/listing-drafts to accept validated uploads, POST /api/v1/listing-drafts/:id/extract to enqueue processing, and GET /api/v1/listing-drafts/:id for seller-owned status.
4. Add a listing-draft.extract worker consumer that checks ownership and image access, calls POST /internal/vision/extract, validates the schema, and saves the editable result.
5. Implement catalogue lookup using Shelv's own edition data first. A licensed external metadata provider is optional; record its permitted usage, quota, and attribution requirements before integration.
6. Add a review screen and POST /api/v1/listing-drafts/:id/publish. This calls the same business validation as manual listing creation and requires explicit seller confirmation.

## Image handling

Decode images with Pillow, check dimensions and decompression limits, normalize orientation, and produce a resized derivative with unnecessary metadata removed. Keep the original only for the configured draft retention period. Use a private Cloudinary delivery mode or authenticated asset access for drafts, and expose only selected published listing images publicly.

The API passes owned asset IDs, not arbitrary URLs. The worker resolves those IDs to approved image bytes or short-lived provider-accessible URLs. If outbound URL fetching is used internally, allowlist storage hosts, block private network destinations, and enforce size and timeout limits. Never let a model-provided URL drive a fetch.

## Extraction contract

```json
{
  "draftId": "draft-id",
  "fields": {
    "title": {"value": "Visible title", "needsReview": true},
    "author": {"value": "Visible author", "needsReview": true},
    "isbn": {"value": null, "needsReview": true}
  },
  "editionCandidates": [],
  "visibleDefects": [],
  "requiresSellerConfirmation": true
}
```

The full schema adds evidenceImageId and extraction method to each field. Model instructions require null for unreadable values. A valid checksum is necessary for accepting an ISBN candidate but does not prove the book identity; cross-check title, language, and edition. Do not accept a model's claim of "new" or "complete pages" as verified condition.

## Configuration

```dotenv
VISION_AUTOLIST_ENABLED=false
VISION_MAX_IMAGES=5
VISION_MAX_IMAGE_BYTES=8388608
VISION_MAX_LONG_EDGE=2000
VISION_JOB_TIMEOUT_SECONDS=20
VISION_DRAFT_RETENTION_DAYS=7
```

Use VISION_MODEL, provider key, and daily budget from the shared guide. The 2000-pixel derivative edge is a proposed cost and readability tradeoff to benchmark. Preserve enough detail for small ISBN text. Optional local barcode decoding can be added after measuring failures; it is not a prerequisite.

Queue state is pending, processing, needs_review, failed, published, or expired. Use an image-set hash and extraction-version key for deduplication. Limit per-seller concurrent jobs and daily requests. A timeout marks the attempt failed without deleting the editable draft or blocking manual completion.

## Evaluation and deployment

After implementing the evaluation module:

```sh
cd ai-service
.venv/bin/python -m evals.vision \
  --manifest evals/data/vision-v1.jsonl --output reports/vision-v1.json
```

The manifest references authorized test images and human-labeled title, author, ISBN, edition, and visible defects. Track extraction accuracy separately from final seller-corrected accuracy. Test rotated images, glare, fake ISBNs, non-book photos, malicious text in images, wrong-owner access, duplicate jobs, expired assets, and provider refusal.

Deploy through the existing private AI service and worker. Pilot with a small seller group, cap concurrent image calls, and review correction logs without retaining unnecessary private photos. Roll back with VISION_AUTOLIST_ENABLED=false; the normal form remains available. Monitor abandoned-draft cleanup and orphaned storage costs.

Official image-input reference: https://developers.openai.com/api/docs/guides/images-vision
