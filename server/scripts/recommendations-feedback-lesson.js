const assert = require("node:assert/strict");
const InteractionEvent = require("../models/InteractionEvent");
const recommend = require("./recommendations-exploration-lesson");
const baseline = require("../data/recommendations/lesson-01.json");
const content = require("../data/recommendations/lesson-03.json");
const profile = require("../data/recommendations/lesson-04.json");

// An explicitly opted-in fictional session. No database, browser or live identity.
function createSession(listings, initialReader = {}) {
  const actorId = "lesson-reader";
  const saved = new Set(initialReader.savedListingIds || []);
  const dismissed = new Set(initialReader.dismissedListingIds || []);
  const languages = [...(initialReader.languages || ["English"])];
  const requests = new Map(), events = new Map(), impressions = new Map(), lastFeedback = new Map();
  const reader = () => ({ savedListingIds: [...saved], dismissedListingIds: [...dismissed], languages: [...languages] });

  function show() {
    const result = recommend(listings, reader());
    const request = {
      requestId: `feedback-request-${requests.size + 1}`, actorId, actorType: "session",
      surface: "home", algorithmVersion: "feedback-lesson-v1", experimentAssignment: "none",
      ...result,
    };
    // Keep an independent snapshot for attribution checks.
    requests.set(request.requestId, structuredClone(request));
    return request;
  }

  function record(raw) {
    const error = new InteractionEvent(raw).validateSync();
    if (error) throw error;
    assert.equal(raw.actorId, actorId, "Event belongs to another reader");
    const request = requests.get(raw.requestId);
    assert.ok(request, "Unknown recommendation request");
    for (const field of ["actorType", "surface", "algorithmVersion", "experimentAssignment"])
      assert.equal(raw[field], request[field], `Wrong ${field}`);
    assert.equal(request.suggestions[raw.rank - 1]?.listingId, raw.listingId, "Listing/rank does not match the request");

    const key = JSON.stringify([raw.actorId, raw.eventId]);
    const fingerprint = JSON.stringify([
      raw.eventType, raw.requestId, raw.listingId, raw.rank, raw.occurredAt,
      raw.surface, raw.algorithmVersion, raw.experimentAssignment,
    ]);
    if (events.has(key)) {
      assert.equal(events.get(key), fingerprint, "Event ID reused with different content");
      return "duplicate ignored";
    }
    const exposure = JSON.stringify([raw.requestId, raw.listingId]);
    const occurredAt = Date.parse(raw.occurredAt);
    assert.ok(Number.isFinite(occurredAt), "Invalid occurrence time");
    if (raw.eventType !== "impression") {
      assert.ok(impressions.has(exposure), "Record a displayed impression before the action");
      assert.ok(occurredAt >= impressions.get(exposure), "Action precedes its impression");
    }
    if (["save", "dismiss"].includes(raw.eventType)) {
      // This synchronous lesson rejects late feedback; production needs an ordering policy.
      assert.ok(occurredAt > (lastFeedback.get(raw.listingId) ?? -Infinity), "Feedback arrived out of order");
      if (raw.eventType === "save") {
        saved.add(raw.listingId);
        dismissed.delete(raw.listingId);
      } else {
        dismissed.add(raw.listingId);
        saved.delete(raw.listingId);
      }
      lastFeedback.set(raw.listingId, occurredAt);
    }
    if (raw.eventType === "impression" && !impressions.has(exposure)) impressions.set(exposure, occurredAt);
    events.set(key, fingerprint);
    return "accepted";
  }
  return { show, record, reader };
}

function sampleEvent(request, rank, eventType, eventId, seconds) {
  return {
    eventId, actorId: request.actorId, actorType: request.actorType, eventType,
    listingId: request.suggestions[rank - 1].listingId, rank,
    requestId: request.requestId, surface: request.surface,
    algorithmVersion: request.algorithmVersion, experimentAssignment: request.experimentAssignment,
    occurredAt: new Date(Date.UTC(2026, 9, 5, 9, 0, seconds)).toISOString(),
  };
}

if (require.main === module) {
  const listings = [...baseline.listings, ...content.additionalListings, ...profile.additionalListings];
  const session = createSession(listings);
  function display(label) {
    const request = session.show();
    console.log(`\n${label}: ${request.mode}`);
    console.table(request.suggestions.map((book, index) => ({ rank: index + 1, title: book.title, reason: book.reason })));
    return request;
  }
  console.log("Lesson 8: fictional feedback changes the next feed, entirely in memory");
  const first = display("Before feedback");
  // Explicitly simulate that these cards were displayed, not merely returned.
  first.suggestions.forEach((book, index) => session.record(sampleEvent(first, index + 1, "impression", `first-impression-${index}`, 0)));
  const save = sampleEvent(first, 2, "save", "save-mars", 5);
  console.log("Save A Garden on Mars:", session.record(save));
  console.log("Retry the same event:", session.record(save));
  const second = display("After saving");
  second.suggestions.forEach((book, index) => session.record(sampleEvent(second, index + 1, "impression", `second-impression-${index}`, 10)));
  console.log("Dismiss the first suggestion:", session.record(sampleEvent(second, 1, "dismiss", "dismiss-orchard", 15)));
  display("After dismissing");
  console.log("Saves influence the profile; dismissals hide a listing. Clicks alone do not change preferences here.");
  console.log("Restarting resets this fictional session. No live account, database or model was changed.");
}

module.exports = { createSession, sampleEvent };
