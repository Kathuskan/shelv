const mongoose = require("mongoose");
const { Schema } = mongoose;
const addressSchema = new Schema(
  {
    recipient: String,
    phone: String,
    line1: String,
    line2: String,
    city: String,
    district: String,
    postalCode: String,
    country: String,
    instructions: String,
  },
  { _id: false }
);
const schema = new Schema(
  {
    buyer: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    seller: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    book: { type: Schema.Types.ObjectId, ref: "Book", required: true },
    number: { type: String, required: true, unique: true },
    clientKey: { type: String, required: true },
    fingerprint: { type: String, required: true },
    item: {
      title: String,
      author: String,
      image: String,
      condition: String,
      unitPriceMinor: Number,
    },
    quantity: { type: Number, required: true, min: 1 },
    deliveryAddress: { type: addressSchema, required: true },
    subtotalMinor: Number,
    deliveryMinor: Number,
    totalMinor: Number,
    currency: { type: String, default: "LKR" },
    paymentMethod: { type: String, enum: ["cod", "card"], required: true },
    paymentStatus: {
      type: String,
      enum: [
        "due",
        "not_due",
        "pending",
        "paid",
        "collected",
        "refund_pending",
        "refunded",
      ],
      required: true,
    },
    status: {
      type: String,
      enum: [
        "awaiting_payment",
        "placed",
        "confirmed",
        "dispatched",
        "delivered",
        "cancelled",
        "expired",
        "disputed",
        "returned",
      ],
      required: true,
      index: true,
    },
    lastCheckedAt: Date,
    expiresAt: Date,
    stripeSessionId: String,
    paymentIntentId: String,
    refundId: String,
    stockReleased: { type: Boolean, default: false },
    shipping: {
      courier: String,
      trackingNumber: String,
      trackingUrl: String,
      dispatchedAt: Date,
    },
    history: [
      {
        status: String,
        note: String,
        actor: Schema.Types.ObjectId,
        at: { type: Date, default: Date.now },
      },
    ],
    reviewed: { type: Boolean, default: false },
  },
  { timestamps: true, optimisticConcurrency: true }
);
schema.index({ buyer: 1, clientKey: 1 }, { unique: true });
module.exports = mongoose.model("Order", schema);
