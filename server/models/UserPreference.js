const mongoose = require("mongoose");
const crypto = require("node:crypto");
module.exports = mongoose.model("UserPreference", new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true, unique: true },
  actorId: { type: String, default: () => crypto.randomUUID(), required: true },
  enabled: { type: Boolean, default: false },
  languages: [{ type: String, maxlength: 50 }],
  genres: [{ type: String, maxlength: 80 }],
  savedListingIds: [{ type: mongoose.Schema.Types.ObjectId, ref: "Book" }],
  dismissedListingIds: [{ type: mongoose.Schema.Types.ObjectId, ref: "Book" }],
  // Every feature write touches this document to serialize against revocation.
  revision: { type: Number, default: 0 },
}, { timestamps: true }));
