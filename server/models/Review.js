const mongoose = require("mongoose");
module.exports = mongoose.model(
  "Review",
  new mongoose.Schema(
    {
      order: {
        type: mongoose.Schema.Types.ObjectId,
        required: true,
        unique: true,
      },
      book: {
        type: mongoose.Schema.Types.ObjectId,
        required: true,
        index: true,
      },
      buyer: { type: mongoose.Schema.Types.ObjectId, required: true },
      name: String,
      rating: { type: Number, min: 1, max: 5, required: true },
      comment: { type: String, maxlength: 1500 },
    },
    { timestamps: true }
  )
);
