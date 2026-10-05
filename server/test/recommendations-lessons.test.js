const { test } = require("node:test");
const assert = require("node:assert/strict");
const recommend = require("../scripts/recommendations-cold-start-lesson");
const baseline = require("../data/recommendations/lesson-01.json");
const content = require("../data/recommendations/lesson-03.json");
const profile = require("../data/recommendations/lesson-04.json");
const books = [...baseline.listings, ...content.additionalListings, ...profile.additionalListings];
const metrics = require("../scripts/recommendations-evaluation-lesson");
const mixed = require("../scripts/recommendations-exploration-lesson");
const { createSession, sampleEvent } = require("../scripts/recommendations-feedback-lesson");

test("feedback updates the next feed and retries do not duplicate saves", () => {
  const session = createSession(books);
  const first = session.show();
  session.record(sampleEvent(first, 2, "impression", "shown", 0));
  session.record(sampleEvent(first, 2, "click", "clicked", 1));
  assert.deepEqual(session.reader().savedListingIds, []);
  const save = sampleEvent(first, 2, "save", "saved", 2);
  assert.equal(session.record(save), "accepted");
  assert.equal(session.record(save), "duplicate ignored");
  assert.deepEqual(session.reader().savedListingIds, [baseline.listings[1]._id]);
  const second = session.show();
  assert.equal(second.suggestions[0].title, "The Orbit Orchard");
  session.record(sampleEvent(second, 1, "impression", "shown-again", 3));
  session.record(sampleEvent(second, 1, "dismiss", "dismissed", 4));
  assert.ok(!session.show().suggestions.some(book => book.title === "The Orbit Orchard"));
  assert.deepEqual(session.reader().savedListingIds, [baseline.listings[1]._id]);
});

test("feedback requires correct request attribution and a preceding impression", () => {
  const session = createSession(books);
  const request = session.show();
  const save = sampleEvent(request, 2, "save", "saved", 5);
  assert.throws(() => session.record(save), /impression/);
  session.record(sampleEvent(request, 2, "impression", "shown", 3));
  assert.throws(() => session.record({ ...save, rank: 1 }), /Listing\/rank/);
  assert.throws(() => session.record({ ...save, actorId: "another-reader" }), /another reader/);
  assert.throws(() => session.record({ ...save, requestId: "unknown" }), /Unknown/);
  assert.throws(() => session.record({ ...save, algorithmVersion: "wrong" }), /algorithmVersion/);
  assert.throws(() => session.record(sampleEvent(request, 2, "save", "early", 2)), /precedes/);
  session.record(save);
  assert.throws(() => session.record({ ...save, eventType: "dismiss" }), /reused/);
  assert.throws(() => session.record(sampleEvent(request, 2, "dismiss", "late", 4)), /out of order/);
  session.record(sampleEvent(request, 2, "dismiss", "later", 6));
  assert.deepEqual(session.reader().savedListingIds, []);
  assert.deepEqual(session.reader().dismissedListingIds, [baseline.listings[1]._id]);
});

test("exploration keeps two matches and adds a distinct recent candidate", () => {
  const reader = { savedListingIds: [baseline.listings[0]._id], languages: ["English"] };
  const result = mixed(books, reader);
  assert.deepEqual(result.suggestions.map(b => b.title), [
    "The Moonlit Archive", "The Glass Dragon", "Letters from the Coast",
  ]);
  assert.equal(result.suggestions[2].source, "recent discovery");
  assert.equal(result.suggestions[2].score, undefined);
  assert.equal(new Set(result.suggestions.map(b => b.listingId)).size, 3);
  assert.deepEqual(mixed([...books].reverse(), reader), result);
});

test("exploration preserves dismissals, language, stock and cold-start behavior", () => {
  const reader = {
    savedListingIds: [baseline.listings[0]._id], languages: ["English"],
    dismissedListingIds: [baseline.listings[2]._id],
  };
  const result = mixed(books, reader);
  assert.equal(result.suggestions[2].title, "A Garden on Mars");
  assert.deepEqual(mixed(books, { languages: ["Sinhala"] }).suggestions, []);
  assert.deepEqual(mixed(books.map(b => ({ ...b, stock: 0 }))).suggestions, []);
  assert.equal(mixed(books).mode, "recent");
  assert.equal(mixed(books).suggestions.length, 3);
  assert.equal(mixed([baseline.listings[0]], reader).suggestions.length, 0);
});

test("evaluation distinguishes finding relevant books from ranking them highly", () => {
  assert.deepEqual(metrics(["a", "b"], ["a", "b"]), { recall: 1, ndcg: 1 });
  const lower = metrics(["x", "a", "b"], ["a", "b"]);
  assert.equal(lower.recall, 1);
  assert.ok(Math.abs(lower.ndcg - 0.6934264036172708) < 1e-12);
  assert.equal(metrics(["a", "x", "y", "b"], ["a", "b"]).recall, 0.5);
  assert.deepEqual(metrics([], ["a"]), { recall: 0, ndcg: 0 });
  assert.deepEqual(metrics(["a"], []), { recall: null, ndcg: null });
  assert.throws(() => metrics(["a", "a"], ["a"]));
});

test("new readers get newest available listings before undated fixtures", () => {
  const result = recommend(books, { languages: ["English"] });
  assert.equal(result.mode, "recent");
  assert.equal(result.fallbackReason, "no_saved_history");
  assert.deepEqual(result.suggestions.slice(0, 3).map(b => b.title), [
    "Letters from the Coast", "A Garden on Mars", "The Lantern Library",
  ]);
  assert.match(result.suggestions[3].reason, /date unknown/);
});

test("available personalized matches keep the personalized path", () => {
  const result = recommend(books, { savedListingIds: [baseline.listings[0]._id], languages: ["English"] });
  assert.equal(result.mode, "personalized");
  assert.equal(result.fallbackReason, null);
  assert.deepEqual(result.suggestions.map(b => b.score), [5, 3, 2]);
});

test("no-match fallback preserves language, saves, dismissals and availability", () => {
  const reader = {
    savedListingIds: [baseline.listings[2]._id],
    dismissedListingIds: [baseline.listings[1]._id], languages: ["English"],
  };
  const result = recommend(books, reader);
  assert.equal(result.mode, "recent");
  assert.equal(result.fallbackReason, "no_available_matches");
  for (const suggestion of result.suggestions) {
    const book = books.find(b => b._id === suggestion.listingId);
    assert.equal(book.language, "English");
    assert.ok(book.stock > 0);
    assert.ok(!reader.savedListingIds.includes(book._id));
    assert.ok(!reader.dismissedListingIds.includes(book._id));
  }
});

test("unavailable inventory returns an honest empty state", () => {
  assert.equal(recommend(books, { languages: ["Sinhala"] }).mode, "empty");
  assert.equal(recommend(books.map(b => ({ ...b, stock: 0 }))).mode, "empty");
  assert.equal(recommend(books.map(b => ({ ...b, status: "archived" }))).mode, "empty");
  assert.equal(recommend([]).mode, "empty");
});

test("equal or unknown dates have stable ordering without mutating input", () => {
  const input = books.map(b => ({ ...b, createdAt: "invalid" })).reverse();
  const before = JSON.stringify(input);
  assert.deepEqual(recommend(input), recommend([...input].reverse()));
  assert.equal(JSON.stringify(input), before);
});
