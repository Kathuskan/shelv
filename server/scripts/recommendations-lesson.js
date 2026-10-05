const assert = require("node:assert/strict");
const InteractionEvent = require("../models/InteractionEvent");
const dataset = require("../data/recommendations/lesson-01.json");

// This lesson never connects to MongoDB or loads environment credentials.
const listingIds = new Set(dataset.listings.map((listing) => listing._id));
const uniqueEvents = new Map();
for (const raw of dataset.events) {
  const error = new InteractionEvent(raw).validateSync();
  if (error) throw error;
  assert.ok(listingIds.has(raw.listingId), "Event refers to an unknown listing");
  uniqueEvents.set(JSON.stringify([raw.actorId, raw.eventId]), raw);
}
const events = [...uniqueEvents.values()];
// Count each displayed recommendation once and match actions to that exposure.
// Multiple clicks on the same card in one request do not inflate this lesson's CTR.
const exposureKey = (event) => JSON.stringify([
  event.actorId, event.requestId, event.listingId, event.surface,
  event.rank, event.algorithmVersion, event.experimentAssignment,
]);
const impressions = new Map(events
  .filter((event) => event.eventType === "impression")
  .map((event) => [exposureKey(event), event]));
for (const event of events.filter((item) => item.eventType !== "impression")) {
  const impression = impressions.get(exposureKey(event));
  assert.ok(impression, "Action has no matching displayed recommendation");
  assert.ok(Date.parse(event.occurredAt) >= Date.parse(impression.occurredAt),
    "Action precedes its impression");
}

const rows = dataset.listings.map((listing) => {
  const count = (type) => new Set(events
    .filter((event) => event.listingId === listing._id && event.eventType === type)
    .map(exposureKey)).size;
  const shown = count("impression");
  const clicked = count("click");
  return {
    title: listing.title,
    stock: listing.stock,
    impressions: shown,
    clicks: clicked,
    saves: count("save"),
    dismisses: count("dismiss"),
    "click-through rate": shown ? `${Math.round(clicked / shown * 100)}%` : "unknown",
  };
});

console.log("Fictional Shelv dataset — lesson 1: exposure and interaction");
console.log(`${dataset.events.length} input events; ${events.length} after retry deduplication.`);
console.table(rows);
console.log("CTR = displayed recommendations clicked / displayed recommendations.");
console.log("No impressions means unknown interest, not dislike. These tiny samples do not establish a winner.");
console.log("Zero-stock listings must be excluded from future recommendations, regardless of engagement.");
console.log("This is an event-analysis lesson, not a production ranking algorithm.");

// Lesson 2: candidate selection, followed by a simple ranking rule.
// These are fixture-only stock/status checks, not full marketplace eligibility.
const candidates = dataset.listings.filter((listing) =>
  listing.listingType === "Sale" && listing.status === "active" && listing.stock > 0
);
const recommendations = [...candidates]
  .sort((a, b) => Date.parse(b.createdAt) - Date.parse(a.createdAt)
    || a._id.localeCompare(b._id))
  .slice(0, 3);

console.log("\nLesson 2: a newest-first guest baseline (recent-lesson-v1)");
console.log(`${dataset.listings.length} listings -> ${candidates.length} candidates -> ${recommendations.length} suggestions`);
console.table(recommendations.map((listing, index) => ({
  rank: index + 1,
  title: listing.title,
  listed: listing.createdAt.slice(0, 10),
  reason: "Recently listed",
})));
console.log("The unexposed book can appear. A book does not need past clicks to qualify.");
console.log("This fixture does not check seller approval, ownership, preferences or edition diversity yet.");
