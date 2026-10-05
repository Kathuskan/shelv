const { test } = require("node:test");
const assert = require("node:assert/strict");
const crypto = require("node:crypto");
const mongoose = require("mongoose");
const jwt = require("jsonwebtoken");
const createApp = require("../app");
const User = require("../models/user");
const Book = require("../models/Book");
const Event = require("../models/InteractionEvent");
const Preference = require("../models/UserPreference");
const Snapshot = require("../models/RecommendationSnapshot");

test("discovery HTTP persistence, attribution, concurrent retry and opt-out", { skip: !process.env.TEST_MONGO_URI }, async () => {
  const dbName = `shelv_test_discovery_${crypto.randomBytes(8).toString("hex")}`;
  process.env.JWT_SECRET = "discovery-test-only-secret-12345678901234567890";
  // Never load .env or use the application's MONGO_URI.
  await mongoose.connect(process.env.TEST_MONGO_URI, { dbName });
  let server;
  try {
    await Promise.all(Object.values(mongoose.models).map(model => model.init()));
    const app = createApp({ gateway: { enabled: false }, mail: async () => {} });
    server = await new Promise(resolve => {
      const listening = app.listen(0, "127.0.0.1", () => resolve(listening));
    });
    const buyer = await User.create({ name: "Reader", email: "reader@example.test" });
    const other = await User.create({ name: "Other", email: "other@example.test" });
    const seller = await User.create({ name: "Seller", email: "seller@example.test", role: "seller", sellerStatus: "approved" });
    const book = await Book.create({ title: "Book", author: "Author", category: "Fantasy", language: "English",
      description: "Test", seller: seller._id, price: 1000, stock: 1, status: "active" });
    async function call(path, method = "GET", body, actor = buyer) {
      const response = await fetch(`http://127.0.0.1:${server.address().port}/api/v1${path}`, {
        method, headers: { "Content-Type": "application/json",
          ...(actor ? { Authorization: `Bearer ${jwt.sign({ id: actor.id, version: 0 }, process.env.JWT_SECRET)}` } : {}) },
        ...(body ? { body: JSON.stringify(body) } : {}),
      });
      return { status: response.status, data: await response.json() };
    }
    assert.equal((await call("/recommendation-preferences", "GET", undefined, null)).status, 401);
    assert.equal((await call("/recommendations?surface=home")).status, 403);
    assert.equal((await call("/recommendation-preferences", "PUT", { enabled: true, languages: ["English"] })).status, 200);
    const first = await call("/recommendations?surface=home");
    assert.equal(first.status, 200);
    assert.equal(first.data.items[0]._id, book.id);
    const body = { eventId: "impression-1", eventType: "impression", listingId: book.id,
      rank: 1, requestId: first.data.requestId, occurredAt: new Date().toISOString() };
    assert.equal((await call("/events", "POST", { ...body, eventId: "click-before", eventType: "click" })).status, 409);
    await call("/recommendation-preferences", "PUT", { enabled: true }, other);
    assert.equal((await call("/events", "POST", body, other)).status, 409);
    const retries = await Promise.all([call("/events", "POST", body), call("/events", "POST", body)]);
    assert.deepEqual(retries.map(result => result.status).sort(), [200, 201]);
    assert.equal(await Event.countDocuments({ eventId: body.eventId }), 1);
    assert.equal((await call("/events", "POST", { ...body, eventType: "click" })).status, 409);
    const save = { ...body, eventId: "save-1", eventType: "save", occurredAt: new Date().toISOString() };
    assert.equal((await call("/events", "POST", save)).status, 409);
    await User.updateOne({ _id: buyer._id }, { $addToSet: { savedBooks: book._id } });
    assert.equal((await call("/events", "POST", save)).status, 201);
    assert.equal((await Preference.findOne({ userId: buyer._id })).savedListingIds.length, 1);
    const priorActor = (await Preference.findOne({ userId: buyer._id })).actorId;
    assert.equal((await call("/recommendation-preferences", "DELETE")).status, 200);
    assert.equal(await Event.countDocuments({ actorId: priorActor }), 0);
    assert.equal(await Snapshot.countDocuments({ actorId: priorActor }), 0);
    assert.equal((await User.findById(buyer._id)).savedBooks.length, 1);
    assert.equal((await call("/events", "POST", body)).status, 403);
  } finally {
    if (server) await new Promise(resolve => server.close(resolve));
    if (mongoose.connection.name === dbName) await mongoose.connection.dropDatabase();
    await mongoose.disconnect();
  }
});
