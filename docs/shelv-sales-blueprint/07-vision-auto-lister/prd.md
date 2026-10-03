# Shelv Computer Vision Auto Lister Product Requirements

Version 1.0 | 2 October 2026 | Owner: Shelv founder

Reduce the effort of creating a sale listing by extracting visible book details from seller photographs and presenting an editable draft. The seller confirms every consequential field before publication. This component improves the existing listing form and does not create a separate selling workflow.

## Scope and journey

An approved seller photographs the front cover and optionally the back cover, ISBN page, and visible defects. The system checks image quality, proposes title and author, reads a possible ISBN, and searches the canonical catalogue. It presents one or more edition candidates and highlights fields needing confirmation.

After choosing the edition, the seller confirms condition, defects, quantity, price, and pickup area. A separate pricing suggestion may be requested if available. The ordinary core listing API performs the final validation and publication.

## Requirements

- VIS-01: Accept up to five supported images within the core upload limits; show progress, retry, and manual-entry options.
- VIS-02: Return field-level evidence and an uncertainty or review-needed state. Do not invent an ISBN, publication year, or edition.
- VIS-03: Validate a proposed ISBN checksum and confirm that metadata matches the visible book before linking an edition.
- VIS-04: Treat visible wear as a suggestion. A photograph cannot establish that all pages are present or that hidden damage is absent.
- VIS-05: Never publish automatically or mark a book New solely from appearance. The seller confirms condition and ownership details.
- VIS-06: Keep draft photographs private until the seller publishes selected listing images. Provide draft deletion and expiry.
- VIS-07: Preserve manual listing when vision, metadata lookup, or the job queue is unavailable.

## Draft data and integration

ListingDraft stores sellerId, image asset IDs, extracted candidates, selected edition, confirmed fields, job status, source versions, and expiry. Each extracted field contains value, evidence image ID or region description, extraction method, and needsReview. Model self-reported confidence is not a calibrated probability and must not be displayed as one.

Use barcode or text extraction as evidence, catalogue lookup as a cross-check, and seller confirmation as the final input. Multiple edition candidates must be shown rather than silently merged. An approved title match can reuse existing summaries and embeddings; a new edition enters the normal catalogue-review path.

The pricing predictor is optional. An unavailable price estimate must not block a seller who enters their own price. The auto-lister cannot set a seller's payout details or change approval status.

## Quality and acceptance

Create at least 100 seller-authorized test image sets across clean and worn covers, glare, low light, missing ISBN, different editions, handwriting, and the languages intended for launch. Proposed gates are at least 90 percent title and author accuracy on legible supported-language examples, zero automatic publications, and explicit review for ambiguous edition cases.

Measure field accuracy, edition-match accuracy, seller correction rate, time to publish, abandonment, and cost per completed listing. Compare median listing time with manual entry in a small user study. Report difficult-image performance separately; do not hide it inside an overall average.

## Failure and abuse cases

Reject non-image or oversized files before expensive processing. Avoid fetching arbitrary user-supplied URLs. Explain unreadable photographs and show a retake option. Handle non-book images with a manual-entry response rather than creating a fabricated draft. Treat text inside photographs as untrusted content, including instructions directed at the model.

Keep uploaded files access-controlled, strip unnecessary location metadata, and delete expired abandoned drafts. Do not use seller photos for model training without a separate documented permission basis.

## Build order

Implement reliable manual listings and private draft uploads first, then catalogue lookup and checksum validation, then vision extraction, then seller correction analytics. Release a small pilot behind a feature flag. A proposed processing target is 20 seconds per draft with background progress and an immediate manual alternative. Defer a custom-trained vision model until real correction data shows a specific limitation worth solving.
