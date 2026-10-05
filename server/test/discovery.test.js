const { test, afterEach } = require("node:test");
const assert = require("node:assert/strict");
const mongoose = require("mongoose");
const service = require("../services/discovery");
const Preference = require("../models/UserPreference");
const Snapshot = require("../models/RecommendationSnapshot");
const Event = require("../models/InteractionEvent");
const User = require("../models/user");
const Book = require("../models/Book");
const restores = [];
function replace(object, key, value) {
  restores.push(() => { object[key] = value; }); object[key] = value;
}
afterEach(() => { restores.splice(0).reverse().forEach(restore => restore()); });
function query(value) {
  const result = { then: (resolve, reject) => Promise.resolve(value).then(resolve, reject) };
  for (const method of ["session", "sort", "limit", "select", "lean"]) result[method] = () => result;
  return result;
}
const userId = new mongoose.Types.ObjectId();
const listingId = new mongoose.Types.ObjectId();
const eventBody = (eventType = "impression") => ({
  eventId: "test-event", eventType, listingId: String(listingId), requestId: "test-request",
  rank: 1, occurredAt: new Date().toISOString(),
});
function setup() {
  const pref = new Preference({ userId, enabled: true });
  pref.save = async () => pref;
  replace(mongoose.connection, "transaction", async fn => fn({}));
  replace(Preference, "findOneAndUpdate", async () => pref);
  replace(User, "findById", () => query({ savedBooks: [listingId] }));
  replace(Event, "findOne", () => query(null));
  replace(Snapshot, "findOne", () => query({
    listingIds: [listingId], generatedAt: new Date(Date.now() - 1000),
    surface: "home", algorithmVersion: "recent-api-v1", experimentAssignment: "none",
  }));
  const written = [];
  replace(Event, "create", async docs => { written.push(...docs); });
  return { pref, written };
}

test("discovery validates consent and rejects forged identity or purchase fields", () => {
  assert.deepEqual(service.preferenceView(null), { enabled: false, languages: [], genres: [] });
  assert.throws(() => service.preferenceInput({ enabled: "true" }));
  assert.throws(() => service.preferenceInput({ enabled: true, languages: Array(11).fill("English") }));
  assert.throws(() => service.eventInput({ ...eventBody(), actorId: "forged" }));
  assert.throws(() => service.eventInput(eventBody("paid")));
  assert.throws(() => service.eventInput({ ...eventBody(), rank: 1.2 }));
  assert.throws(() => service.eventInput({ ...eventBody(), occurredAt: "yesterday" }));
});

test("event ingestion derives identity and version from trusted state", async () => {
  const { pref, written } = setup();
  assert.deepEqual(await service.ingest(userId, eventBody()), { accepted: true, duplicate: false });
  assert.equal(written[0].actorId, pref.actorId);
  assert.equal(written[0].algorithmVersion, "recent-api-v1");
  assert.equal(written[0].actorType, "user");
  assert.ok(written[0].receivedAt instanceof Date);
});

test("disabled collection, mismatched rank, expired requests and premature actions fail", async () => {
  setup();
  await assert.rejects(service.ingest(userId, eventBody("click")), /impression/);
  await assert.rejects(service.ingest(userId, { ...eventBody(), rank: 2 }), /rank/);
  replace(Snapshot, "findOne", () => query(null));
  await assert.rejects(service.ingest(userId, eventBody()), /expired/);
  replace(Preference, "findOneAndUpdate", async () => null);
  await assert.rejects(service.ingest(userId, eventBody()), /Enable/);
});

test("exact retries are acknowledged, conflicting IDs rejected", async () => {
  const { written } = setup();
  const body = eventBody();
  replace(Event, "findOne", () => query({ fingerprint: service.eventInput(body).fingerprint }));
  assert.equal((await service.ingest(userId, body)).duplicate, true);
  await assert.rejects(service.ingest(userId, { ...body, eventType: "click" }), /already used/);
  assert.equal(written.length, 0);
});

test("save signals require core saved state and dismissal removes derived positive input", async () => {
  const { pref } = setup();
  replace(Event, "findOne", filter => query(filter.eventType === "impression" ? {} : null));
  replace(User, "findById", () => query({ savedBooks: [] }));
  await assert.rejects(service.ingest(userId, eventBody("save")), /saved-books API/);
  replace(User, "findById", () => query({ savedBooks: [listingId] }));
  await service.ingest(userId, eventBody("save"));
  assert.equal(String(pref.savedListingIds[0]), String(listingId));
  await service.ingest(userId, eventBody("dismiss"));
  assert.equal(pref.savedListingIds.length, 0);
  assert.equal(String(pref.dismissedListingIds[0]), String(listingId));
});

test("revoking consent clears events, snapshots and derived preferences", async () => {
  const { pref } = setup(), oldActor = pref.actorId, deleted = [];
  pref.savedListingIds.push(listingId); pref.languages.push("English");
  replace(User, "exists", () => query({ _id: userId }));
  replace(Event, "deleteMany", filter => { deleted.push(filter.actorId); return query({}); });
  replace(Snapshot, "deleteMany", filter => { deleted.push(filter.actorId); return query({}); });
  const result = await service.configure(userId, { enabled: false });
  assert.deepEqual(result, { enabled: false, languages: [], genres: [] });
  assert.deepEqual(deleted, [oldActor, oldActor]);
  assert.notEqual(pref.actorId, oldActor);
  assert.equal(pref.savedListingIds.length, 0);
});

test("baseline records only approved seller candidates and the issued ranks", async () => {
  setup();
  const approved = new mongoose.Types.ObjectId(), restricted = new mongoose.Types.ObjectId();
  replace(Book, "find", () => query([
    { _id: listingId, author: "Author", seller: restricted },
    { _id: new mongoose.Types.ObjectId(), author: "Author", seller: approved, title: "Available" },
  ]));
  replace(User, "find", () => query([
    { _id: approved, role: "seller", sellerStatus: "approved" },
    { _id: restricted, role: "seller", sellerStatus: "restricted" },
  ]));
  let snapshot;
  replace(Snapshot, "create", async docs => { snapshot = docs[0]; });
  const result = await service.feed(userId, { surface: "home", limit: 3 });
  assert.equal(result.items.length, 1);
  assert.equal(result.items[0].rank, 1);
  assert.equal(result.items[0].title, "Available");
  assert.equal(snapshot.requestId, result.requestId);
  assert.deepEqual(snapshot.listingIds, result.items.map(book => book._id));
});

test("removing a core bookmark also clears its derived discovery input", async () => {
  const { pref } = setup();
  pref.savedListingIds.push(listingId);
  let update;
  replace(User, "updateOne", async (filter, changes) => { update = changes; });
  await service.removeBookmark(userId, String(listingId));
  assert.equal(pref.savedListingIds.length, 0);
  assert.equal(update.$pull.savedBooks, String(listingId));
});
