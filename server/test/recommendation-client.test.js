const { test } = require("node:test");
const assert = require("node:assert/strict");
const snapshot = { requestId: "request-1", generatedAt: new Date().toISOString() };
const book = { _id: "book-1", rank: 2 };

test("client confirms an impression before its action and deduplicates calls", async () => {
  const { createRecommendationTracker } = await import("../../client/src/core/recommendationEvents.js");
  const sent = [];
  const tracker = createRecommendationTracker({ post: async (path, body) => { sent.push({ path, body }); } }, snapshot);
  await Promise.all([tracker.impression(book), tracker.action(book, "click")]);
  await tracker.action(book, "click");
  assert.deepEqual(sent.map(item => item.body.eventType), ["impression", "click"]);
  assert.ok(sent.every(item => item.body.requestId === snapshot.requestId && item.body.rank === 2));
});

test("failed event retry reuses identity and opt-out stops queued actions", async () => {
  const { createRecommendationTracker } = await import("../../client/src/core/recommendationEvents.js");
  const sent = [];
  const tracker = createRecommendationTracker({ post: async (path, body) => {
    sent.push({ ...body });
    if (sent.length === 1) throw new Error("Temporary network failure");
  } }, snapshot);
  await assert.rejects(tracker.impression(book));
  await tracker.impression(book);
  assert.deepEqual(sent[0], sent[1]);
  let complete;
  const queue = [];
  const second = createRecommendationTracker({ post: (path, body) => {
    queue.push(body.eventType);
    return new Promise(resolve => { complete = resolve; });
  } }, snapshot);
  const pending = second.action(book, "dismiss");
  second.stop();
  complete();
  await assert.rejects(pending, /off/);
  assert.deepEqual(queue, ["impression"]);
});
