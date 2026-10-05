const mongoose = require("mongoose");
const crypto = require("node:crypto");
const User = require("../models/user");
const Book = require("../models/Book");
const Preference = require("../models/UserPreference");
const Snapshot = require("../models/RecommendationSnapshot");
const Event = require("../models/InteractionEvent");
const { eligibleSeller } = require("./orders");
const v = require("../lib/validation");
const algorithmVersion = "recent-api-v1";

function onlyFields(body, allowed) {
  v.assert(body && typeof body === "object" && !Array.isArray(body), "Expected an object.");
  v.assert(Object.keys(body).every(key => allowed.includes(key)), "Unexpected field.");
}
function choices(value, name, length) {
  v.assert(Array.isArray(value) && value.length <= 10, `${name} must contain at most 10 choices.`);
  return [...new Set(value.map(item => v.text(item, name, length)))];
}
function preferenceInput(body) {
  onlyFields(body, ["enabled", "languages", "genres"]);
  v.assert(typeof body.enabled === "boolean", "enabled must be true or false.");
  return {
    enabled: body.enabled,
    ...(body.languages !== undefined ? { languages: choices(body.languages, "Languages", 50) } : {}),
    ...(body.genres !== undefined ? { genres: choices(body.genres, "Genres", 80) } : {}),
  };
}
function eventInput(body) {
  onlyFields(body, ["eventId", "eventType", "listingId", "requestId", "rank", "occurredAt"]);
  v.assert(["impression", "click", "save", "dismiss"].includes(body.eventType), "Unsupported event type.");
  v.assert(typeof body.occurredAt === "string" && /^\d{4}-\d\d-\d\dT.*Z$/.test(body.occurredAt)
    && Number.isFinite(Date.parse(body.occurredAt)), "occurredAt must be a UTC ISO timestamp.");
  const normalized = {
    eventId: v.text(body.eventId, "Event ID", 128), eventType: body.eventType,
    listingId: v.id(body.listingId).toLowerCase(), requestId: v.text(body.requestId, "Request ID", 128),
    rank: v.integer(body.rank, "Rank", 1, 24), occurredAt: new Date(body.occurredAt),
  };
  return { ...normalized, fingerprint: crypto.createHash("sha256").update(JSON.stringify(normalized)).digest("hex") };
}
const preferenceView = pref => ({
  enabled: pref?.enabled || false, languages: pref?.languages || [], genres: pref?.genres || [],
});

async function configure(userId, body) {
  const changes = preferenceInput(body);
  return mongoose.connection.transaction(async session => {
    v.assert(await User.exists({ _id: userId }).session(session), "Please sign in again.", 401);
    const pref = await Preference.findOneAndUpdate({ userId }, { $inc: { revision: 1 } },
      { upsert: true, new: true, session, setDefaultsOnInsert: true });
    if (!changes.enabled) {
      await Event.deleteMany({ actorId: pref.actorId }).session(session);
      await Snapshot.deleteMany({ actorId: pref.actorId }).session(session);
      pref.actorId = crypto.randomUUID();
      pref.savedListingIds = [];
      pref.dismissedListingIds = [];
      pref.languages = [];
      pref.genres = [];
    } else {
      if (changes.languages) pref.languages = changes.languages;
      if (changes.genres) pref.genres = changes.genres;
      // Preference changes invalidate attribution for older feeds.
      await Snapshot.deleteMany({ actorId: pref.actorId }).session(session);
    }
    pref.enabled = changes.enabled;
    await pref.save({ session });
    return preferenceView(pref);
  });
}

async function lockConsent(userId, session) {
  const pref = await Preference.findOneAndUpdate({ userId, enabled: true },
    { $inc: { revision: 1 } }, { new: true, session });
  v.assert(pref, "Enable recommendation data collection first.", 403);
  return pref;
}

async function feed(userId, query) {
  onlyFields(query, ["surface", "limit"]);
  v.assert(!query.surface || query.surface === "home", "Only the home surface is supported.");
  const limit = v.integer(query.limit ?? 12, "Limit", 1, 24);
  return mongoose.connection.transaction(async session => {
    const pref = await lockConsent(userId, session);
    const user = await User.findById(userId).session(session);
    v.assert(user, "Please sign in again.", 401);
    const filter = {
      listingType: "Sale", status: "active", stock: { $gt: 0 }, seller: { $ne: userId },
      _id: { $nin: [...user.savedBooks, ...pref.savedListingIds, ...pref.dismissedListingIds] },
    };
    if (pref.languages.length) filter.language = { $in: pref.languages };
    if (pref.genres.length) filter.category = { $in: pref.genres };
    // Bounded candidate scan for this first baseline. Seller checks run on current records.
    const candidates = await Book.find(filter).sort({ createdAt: -1, _id: -1 }).limit(500)
      .select("title author isbn edition language category condition price deliveryFee stock images seller createdAt status listingType")
      .session(session).lean();
    const sellers = await User.find({ _id: { $in: candidates.map(book => book.seller) } })
      .select("role sellerStatus").session(session).lean();
    const eligible = new Set(sellers.filter(eligibleSeller).map(seller => String(seller._id)));
    const counts = new Map(), authors = new Map(), editions = new Set(), items = [];
    for (const book of candidates) {
      const sellerId = String(book.seller), author = book.author.trim().toLowerCase();
      const isbn = (book.isbn || "").replace(/[^0-9X]/gi, "").toUpperCase();
      // No shared edition model exists yet; only deduplicate identifiable ISBNs.
      if (!eligible.has(sellerId) || (counts.get(sellerId) || 0) >= 3
        || (authors.get(author) || 0) >= 3 || (isbn && editions.has(isbn))) continue;
      if (isbn) editions.add(isbn);
      counts.set(sellerId, (counts.get(sellerId) || 0) + 1);
      authors.set(author, (authors.get(author) || 0) + 1);
      items.push({ ...book, rank: items.length + 1, reasonCode: "RECENTLY_LISTED" });
      if (items.length === limit) break;
    }
    const generatedAt = new Date(), requestId = crypto.randomUUID();
    await Snapshot.create([{
      requestId, actorId: pref.actorId, listingIds: items.map(book => book._id), surface: "home",
      algorithmVersion, experimentAssignment: "none", generatedAt,
      expiresAt: new Date(generatedAt.getTime() + 3600000),
    }], { session });
    return { requestId, algorithmVersion, experimentAssignment: "none", generatedAt, items };
  });
}

async function ingest(userId, body) {
  const input = eventInput(body);
  return mongoose.connection.transaction(async session => {
    const pref = await lockConsent(userId, session);
    const user = await User.findById(userId).session(session);
    v.assert(user, "Please sign in again.", 401);
    const prior = await Event.findOne({ actorId: pref.actorId, eventId: input.eventId }).session(session);
    if (prior) {
      v.assert(prior.fingerprint === input.fingerprint, "Event ID already used for another action.", 409);
      return { accepted: true, duplicate: true };
    }
    const now = new Date();
    const snapshot = await Snapshot.findOne({ requestId: input.requestId, actorId: pref.actorId,
      expiresAt: { $gt: now } }).session(session);
    v.assert(snapshot, "Recommendation request is missing or expired.", 409);
    v.assert(String(snapshot.listingIds[input.rank - 1]) === input.listingId, "Listing and rank do not match the request.");
    v.assert(input.occurredAt >= snapshot.generatedAt && input.occurredAt.getTime() <= now.getTime() + 60000,
      "Event time is outside the recommendation window.");
    if (input.eventType !== "impression") {
      const impression = await Event.findOne({ actorId: pref.actorId, requestId: input.requestId,
        listingId: input.listingId, eventType: "impression", occurredAt: { $lte: input.occurredAt } }).session(session);
      v.assert(impression, "Record the displayed impression before the action.", 409);
    }
    if (input.eventType === "save") {
      v.assert(user.savedBooks.some(id => String(id) === input.listingId), "Save the book through the saved-books API first.", 409);
      // Dismissal wins until preferences are reset; late saves cannot undo it.
      if (!pref.dismissedListingIds.some(id => String(id) === input.listingId)) {
        v.assert(pref.savedListingIds.some(id => String(id) === input.listingId)
          || pref.savedListingIds.length < 1000, "Reset recommendation preferences before collecting more saved books.", 409);
        pref.savedListingIds.addToSet(input.listingId);
      }
    }
    if (input.eventType === "dismiss") {
      v.assert(pref.dismissedListingIds.some(id => String(id) === input.listingId)
        || pref.dismissedListingIds.length < 1000, "Reset recommendation preferences before dismissing more books.", 409);
      pref.dismissedListingIds.addToSet(input.listingId);
      pref.savedListingIds.pull(input.listingId);
    }
    await pref.save({ session });
    await Event.create([{
      ...input, actorId: pref.actorId, actorType: "user", surface: snapshot.surface,
      algorithmVersion: snapshot.algorithmVersion, experimentAssignment: snapshot.experimentAssignment,
      receivedAt: now,
    }], { session });
    return { accepted: true, duplicate: false };
  });
}

async function removeBookmark(userId, listingId) {
  return mongoose.connection.transaction(async session => {
    const pref = await Preference.findOneAndUpdate({ userId }, { $inc: { revision: 1 } }, { new: true, session });
    await User.updateOne({ _id: userId }, { $pull: { savedBooks: listingId } }, { session });
    if (pref) {
      pref.savedListingIds.pull(listingId);
      await pref.save({ session });
    }
  });
}

module.exports = { configure, feed, ingest, removeBookmark, preferenceView, eventInput, preferenceInput };
