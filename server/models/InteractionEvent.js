const mongoose = require("mongoose");

// Discovery signals only. Paid/completed outcomes belong to trusted order code.
const interactionEventSchema = new mongoose.Schema(
  {
    eventId: { type: String, required: true, trim: true, maxlength: 128 },
    fingerprint: { type: String, maxlength: 64 },
    schemaVersion: { type: Number, enum: [1], default: 1 },
    // The future ingestion service supplies an opaque identity after consent checks.
    actorId: { type: String, required: true, trim: true, maxlength: 128 },
    actorType: { type: String, required: true, enum: ["user", "session"] },
    eventType: {
      type: String,
      required: true,
      enum: ["impression", "click", "save", "dismiss"],
    },
    // Book currently represents a seller's listing in Shelv.
    listingId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Book",
      required: true,
    },
    // Optional until the shared BookEdition catalogue exists; do not copy listingId.
    editionId: { type: mongoose.Schema.Types.ObjectId },
    surface: { type: String, required: true, trim: true, maxlength: 80 },
    // One-based position in the recommendation response.
    rank: {
      type: Number,
      required: true,
      min: 1,
      validate: { validator: Number.isSafeInteger, message: "Rank must be an integer." },
    },
    requestId: { type: String, required: true, trim: true, maxlength: 128 },
    algorithmVersion: { type: String, required: true, trim: true, maxlength: 80 },
    // Use an explicit value such as "none" when no experiment is running.
    experimentAssignment: { type: String, required: true, trim: true, maxlength: 128 },
    occurredAt: { type: Date, required: true },
    receivedAt: { type: Date, default: Date.now, immutable: true },
  },
  { strict: "throw" }
);

// Retries from the same actor reuse eventId. This index enforces deduplication
// once the collection is initialized; the ingestion service must handle retries.
interactionEventSchema.index({ actorId: 1, eventId: 1 }, { unique: true });
interactionEventSchema.index({ requestId: 1, actorId: 1, eventType: 1 });
interactionEventSchema.index({ actorId: 1, requestId: 1, listingId: 1, eventType: 1 });
// The blueprint's proposed raw-event retention is 90 days. TTL cleanup is async.
interactionEventSchema.index({ receivedAt: 1 }, { expireAfterSeconds: 90 * 24 * 60 * 60 });

module.exports = mongoose.model("InteractionEvent", interactionEventSchema);
