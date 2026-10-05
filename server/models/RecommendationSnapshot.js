const mongoose = require("mongoose");
const schema = new mongoose.Schema({
  requestId: { type: String, required: true, unique: true },
  actorId: { type: String, required: true, index: true },
  listingIds: [{ type: mongoose.Schema.Types.ObjectId, ref: "Book" }],
  surface: { type: String, enum: ["home"], required: true },
  algorithmVersion: { type: String, required: true },
  experimentAssignment: { type: String, required: true },
  generatedAt: { type: Date, required: true },
  expiresAt: { type: Date, required: true },
});
schema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });
module.exports = mongoose.model("RecommendationSnapshot", schema);
