const mongoose = require("mongoose");
module.exports = mongoose.model(
  "Notification",
  new mongoose.Schema(
    {
      key: { type: String, unique: true },
      user: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
      order: mongoose.Schema.Types.ObjectId,
      subject: String,
      text: String,
      sentAt: Date,
      attempts: { type: Number, default: 0 },
      nextAttemptAt: { type: Date, default: Date.now },
    },
    { timestamps: true }
  )
);
