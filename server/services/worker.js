const Order = require("../models/Order");
const Notification = require("../models/Notification");
const User = require("../models/user");
module.exports = function startWorker(app) {
  let running = false;
  async function tick() {
    if (running) return;
    running = true;
    try {
      const pending = await Order.find({
        paymentMethod: "card",
        $or: [
          { status: "awaiting_payment" },
          { paymentStatus: "refund_pending" },
          {
            paymentStatus: "pending",
            stripeSessionId: { $exists: true },
            updatedAt: { $gt: new Date(Date.now() - 2 * 86400000) },
          },
        ],
      })
        .sort({ lastCheckedAt: 1 })
        .limit(100);
      for (const order of pending) {
        try {
          await app.locals.orders.reconcile(order);
        } catch (error) {
          console.error("Payment reconciliation:", order.number, error.message);
        }
        try {
          await app.locals.orders.expire(order.id);
        } catch (error) {
          console.error("Stock release:", order.number, error.message);
        }
        await Order.updateOne(
          { _id: order._id },
          { $set: { lastCheckedAt: new Date() } },
          { timestamps: false }
        );
      }
      const messages = await Notification.find({
        sentAt: { $exists: false },
        nextAttemptAt: { $lte: new Date() },
      }).limit(30);
      for (const message of messages) {
        try {
          const user = await User.findById(message.user);
          if (user)
            await app.locals.mail(user.email, message.subject, message.text);
          message.sentAt = new Date();
        } catch {
          message.attempts += 1;
          message.nextAttemptAt = new Date(
            Date.now() +
              Math.min(86400000, 60000 * 2 ** Math.min(message.attempts, 10))
          );
        }
        await message.save();
      }
    } finally {
      running = false;
    }
  }
  const timer = setInterval(
    () => tick().catch((e) => console.error("Background worker:", e.message)),
    30000
  );
  timer.unref();
  tick().catch((e) => console.error("Background worker:", e.message));
  return () => clearInterval(timer);
};
