const mongoose = require("mongoose");
const crypto = require("crypto");
const Book = require("../models/Book");
const User = require("../models/user");
const Order = require("../models/Order");
const Review = require("../models/Review");
const Notification = require("../models/Notification");
const v = require("../lib/validation");

const eligibleSeller = (user) =>
  user &&
  (user.role === "admin" ||
    (user.role === "seller" && user.sellerStatus === "approved"));
async function notify(order, user, subject, session) {
  await Notification.updateOne(
    { key: `${order._id}-${order.status}-${user}` },
    {
      $setOnInsert: {
        user,
        order: order._id,
        subject,
        text: `Order ${order.number}: ${subject}. Sign in to Shelv to view the details.`,
        nextAttemptAt: new Date(),
      },
    },
    { upsert: true, session }
  );
}
function history(order, status, actor, note = "") {
  order.status = status;
  order.history.push({ status, actor, note, at: new Date() });
}
async function restore(order, session) {
  if (!order.stockReleased) {
    await Book.updateOne(
      { _id: order.book },
      { $inc: { stock: order.quantity, __v: 1 } },
      { session }
    );
    order.stockReleased = true;
  }
}
module.exports = function orderService(gateway) {
  async function quote(bookId, quantity, session) {
    const book = await Book.findById(v.id(bookId)).session(session || null);
    v.assert(
      book && book.listingType === "Sale" && book.status !== "archived",
      "This listing is no longer available.",
      404
    );
    const seller = await User.findById(book.seller).session(session || null);
    v.assert(
      eligibleSeller(seller),
      "This seller is not accepting orders.",
      409
    );
    v.assert(
      Number.isInteger(book.stock) && book.stock >= quantity,
      "Not enough copies are available. Please refresh the listing.",
      409
    );
    const unitPriceMinor = v.money(book.price, "Book price");
    const deliveryMinor = v.money(book.deliveryFee || 0, "Delivery fee", true);
    const subtotalMinor = unitPriceMinor * quantity;
    v.assert(
      subtotalMinor + deliveryMinor <= 99999999,
      "Order total is too large. Reduce the quantity."
    );
    return {
      book,
      seller,
      unitPriceMinor,
      subtotalMinor,
      deliveryMinor,
      totalMinor: subtotalMinor + deliveryMinor,
      currency: "LKR",
    };
  }
  async function create(buyer, input, key) {
    v.assert(
      typeof key === "string" && /^[\w-]{16,100}$/.test(key),
      "A valid order request key is required.",
      400
    );
    const bookId = v.id(input.bookId),
      quantity = v.integer(input.quantity, "Quantity", 1, 20);
    const deliveryAddress = v.address(input.deliveryAddress);
    v.assert(
      ["cod", "card"].includes(input.paymentMethod),
      "Choose a payment method."
    );
    v.assert(
      input.paymentMethod !== "card" || gateway.enabled,
      "Card payments are not configured yet. Please choose cash on delivery.",
      503
    );
    const fp = v.fingerprint({
      bookId,
      quantity,
      deliveryAddress,
      paymentMethod: input.paymentMethod,
    });
    const previous = await Order.findOne({ buyer: buyer._id, clientKey: key });
    if (previous) {
      v.assert(
        previous.fingerprint === fp,
        "This request key was already used for a different order.",
        409
      );
      return previous;
    }
    let result;
    try {
      await mongoose.connection.transaction(async (session) => {
        const existing = await Order.findOne({
          buyer: buyer._id,
          clientKey: key,
        }).session(session);
        if (existing) {
          v.assert(
            existing.fingerprint === fp,
            "This request key was already used for a different order.",
            409
          );
          result = existing;
          return;
        }
        const q = await quote(bookId, quantity, session);
        v.assert(
          String(q.book.seller) !== String(buyer._id),
          "You cannot order your own book.",
          409
        );
        v.assert(
          input.expectedTotalMinor === q.totalMinor,
          "The price or delivery charge changed. Please review the updated total.",
          409
        );
        // Lock the seller record too, so a simultaneous suspension cannot race checkout.
        const sellerLock = await User.updateOne(
          {
            _id: q.seller._id,
            role: q.seller.role,
            sellerStatus: q.seller.sellerStatus,
          },
          { $inc: { __v: 1 } },
          { session }
        );
        v.assert(
          sellerLock.modifiedCount === 1,
          "Seller availability changed. Please try again.",
          409
        );
        const stock = await Book.updateOne(
          {
            _id: bookId,
            stock: { $gte: quantity },
            status: { $ne: "archived" },
            listingType: "Sale",
          },
          { $inc: { stock: -quantity, __v: 1 } },
          { session }
        );
        v.assert(
          stock.modifiedCount === 1,
          "This book has just sold out.",
          409
        );
        const [order] = await Order.create(
          [
            {
              buyer: buyer._id,
              seller: q.book.seller,
              book: bookId,
              number: `SH-${crypto
                .randomBytes(5)
                .toString("hex")
                .toUpperCase()}`,
              clientKey: key,
              fingerprint: fp,
              item: {
                title: q.book.title,
                author: q.book.author,
                image: q.book.images[0],
                condition: q.book.condition,
                unitPriceMinor: q.unitPriceMinor,
              },
              quantity,
              deliveryAddress,
              subtotalMinor: q.subtotalMinor,
              deliveryMinor: q.deliveryMinor,
              totalMinor: q.totalMinor,
              paymentMethod: input.paymentMethod,
              paymentStatus: input.paymentMethod === "cod" ? "due" : "pending",
              status:
                input.paymentMethod === "cod" ? "placed" : "awaiting_payment",
              expiresAt:
                input.paymentMethod === "card"
                  ? new Date(Date.now() + 60 * 60 * 1000)
                  : undefined,
              history: [
                {
                  status:
                    input.paymentMethod === "cod"
                      ? "placed"
                      : "awaiting_payment",
                  actor: buyer._id,
                  note: "Order created",
                },
              ],
            },
          ],
          { session }
        );
        if (input.saveAddress === true)
          await User.updateOne(
            { _id: buyer._id },
            { $set: { deliveryAddress } },
            { session }
          );
        if (order.status === "placed")
          await notify(order, order.seller, "New order to prepare", session);
        result = order;
      });
    } catch (error) {
      if (error.code === 11000) {
        const retry = await Order.findOne({ buyer: buyer._id, clientKey: key });
        if (retry && retry.fingerprint === fp) return retry;
      }
      throw error;
    }
    return result;
  }
  async function accessible(orderId, actor) {
    const order = await Order.findById(v.id(orderId));
    v.assert(
      order &&
        (actor.role === "admin" ||
          String(order.buyer) === String(actor._id) ||
          String(order.seller) === String(actor._id)),
      "Order not found.",
      404
    );
    return order;
  }
  async function pay(orderId, actor) {
    const order = await accessible(orderId, actor);
    v.assert(
      String(order.buyer) === String(actor._id),
      "Only the buyer can pay for this order.",
      403
    );
    v.assert(gateway.enabled, "Card payments are unavailable.", 503);
    v.assert(
      order.paymentMethod === "card" && order.status === "awaiting_payment",
      "This order is not awaiting card payment.",
      409
    );
    // Stripe requires at least 30 minutes for a newly created session.
    v.assert(
      order.stripeSessionId || order.expiresAt > Date.now() + 31 * 60 * 1000,
      "The payment window closed. Cancel this order and place a new one.",
      409
    );
    const checkout = order.stripeSessionId
      ? await gateway.retrieve(order.stripeSessionId)
      : await gateway.create(order, actor.email);
    await Order.updateOne(
      { _id: order._id, stripeSessionId: { $exists: false } },
      { $set: { stripeSessionId: checkout.id } }
    );
    if (checkout.payment_status === "paid") {
      await applyPayment(checkout);
      return { orderId: order._id, paid: true };
    }
    v.assert(
      checkout.status === "open" && checkout.url,
      "Checkout has expired. Please place a new order.",
      409
    );
    return { url: checkout.url };
  }
  async function applyPayment(checkout) {
    v.assert(
      checkout.metadata?.orderId && checkout.payment_status === "paid",
      "Invalid paid checkout.",
      400
    );
    await mongoose.connection.transaction(async (session) => {
      const order = await Order.findById(
        v.id(checkout.metadata.orderId)
      ).session(session);
      v.assert(
        order && order.paymentMethod === "card",
        "Unknown card order.",
        400
      );
      v.assert(
        checkout.amount_total === order.totalMinor &&
          checkout.currency === "lkr" &&
          checkout.client_reference_id === String(order._id),
        "Payment details do not match the order.",
        400
      );
      v.assert(
        !order.stripeSessionId || order.stripeSessionId === checkout.id,
        "Checkout does not match the order.",
        400
      );
      if (
        ["paid", "collected", "refund_pending", "refunded"].includes(
          order.paymentStatus
        )
      )
        return;
      order.stripeSessionId = checkout.id;
      order.paymentIntentId =
        typeof checkout.payment_intent === "string"
          ? checkout.payment_intent
          : checkout.payment_intent?.id;
      v.assert(order.paymentIntentId, "Payment intent is missing.", 400);
      if (["cancelled", "expired"].includes(order.status)) {
        order.paymentStatus = "refund_pending";
      } else {
        order.paymentStatus = "paid";
        history(order, "placed", null, "Card payment confirmed");
        await notify(order, order.seller, "New paid order to prepare", session);
      }
      await order.save({ session });
    });
  }
  async function transition(orderId, actor, input) {
    let result;
    await mongoose.connection.transaction(async (session) => {
      const order = await Order.findById(v.id(orderId)).session(session);
      v.assert(order, "Order not found.", 404);
      const buyer = String(order.buyer) === String(actor._id),
        seller = String(order.seller) === String(actor._id),
        admin = actor.role === "admin";
      v.assert(buyer || seller || admin, "Order not found.", 404);
      const action = input.action;
      if (action === "confirm") {
        v.assert(
          (seller || admin) && order.status === "placed",
          "Only the seller can confirm a placed order.",
          409
        );
        history(
          order,
          "confirmed",
          actor._id,
          "Seller is preparing your order"
        );
      } else if (action === "dispatch") {
        v.assert(
          (seller || admin) && ["placed", "confirmed"].includes(order.status),
          "Only a ready, payable order can be dispatched.",
          409
        );
        v.assert(
          order.paymentMethod === "cod" || order.paymentStatus === "paid",
          "Payment has not been confirmed.",
          409
        );
        const courier = v.text(input.courier, "Courier", 80),
          trackingNumber = v.text(input.trackingNumber, "Tracking number", 100);
        const trackingUrl = v.text(
          input.trackingUrl,
          "Tracking URL",
          500,
          false
        );
        if (trackingUrl) {
          let url;
          try {
            url = new URL(trackingUrl);
          } catch {
            throw new v.HttpError(422, "Enter a valid HTTPS tracking link.");
          }
          v.assert(
            url.protocol === "https:" && !url.username && !url.password,
            "Use an HTTPS tracking link."
          );
        }
        order.shipping = {
          courier,
          trackingNumber,
          trackingUrl,
          dispatchedAt: new Date(),
        };
        history(order, "dispatched", actor._id, "Handed to the courier");
      } else if (action === "deliver") {
        v.assert(
          (buyer || admin) && order.status === "dispatched",
          "The buyer can confirm receipt after dispatch.",
          409
        );
        history(order, "delivered", actor._id, "Buyer confirmed delivery");
        // Delivery is not evidence that the courier remitted cash to the seller.
      } else if (action === "collect") {
        v.assert(
          (seller || admin) &&
            order.status === "delivered" &&
            order.paymentMethod === "cod" &&
            order.paymentStatus === "due",
          "Cash can be recorded after delivery.",
          409
        );
        order.paymentStatus = "collected";
        order.history.push({
          status: order.status,
          actor: actor._id,
          note: "Seller confirmed cash collection",
        });
      } else if (action === "cancel") {
        v.assert(
          ["awaiting_payment", "placed", "confirmed"].includes(order.status),
          "Dispatched orders cannot be cancelled. Please report an issue.",
          409
        );
        const note = v.text(input.reason, "Cancellation reason", 500);
        await restore(order, session);
        history(order, "cancelled", actor._id, note);
        if (order.paymentStatus === "paid")
          order.paymentStatus = "refund_pending";
        if (order.paymentMethod === "cod" && order.paymentStatus === "due")
          order.paymentStatus = "not_due";
      } else if (action === "dispute") {
        v.assert(
          buyer && ["dispatched", "delivered"].includes(order.status),
          "Only the buyer can report a delivery issue.",
          409
        );
        history(
          order,
          "disputed",
          actor._id,
          v.text(input.reason, "Issue description", 500)
        );
      } else if (action === "resolve") {
        v.assert(
          admin && order.status === "disputed",
          "An administrator must resolve this issue.",
          403
        );
        const note = v.text(input.reason, "Resolution note", 500);
        v.assert(
          ["returned", "delivered"].includes(input.resolution),
          "Choose returned or delivered."
        );
        history(order, input.resolution, actor._id, note);
        if (input.resolution === "returned") {
          if (input.restock === true) await restore(order, session);
          if (["paid", "collected"].includes(order.paymentStatus))
            order.paymentStatus = "refund_pending";
          if (order.paymentMethod === "cod" && order.paymentStatus === "due")
            order.paymentStatus = "not_due";
        }
      } else if (action === "record-cash-refund") {
        v.assert(
          admin &&
            order.paymentMethod === "cod" &&
            order.paymentStatus === "refund_pending",
          "No manual cash refund is pending.",
          403
        );
        order.paymentStatus = "refunded";
        order.history.push({
          status: order.status,
          actor: actor._id,
          note: v.text(input.reason, "Refund evidence or reference", 500),
        });
      } else throw new v.HttpError(422, "Unknown order action.");
      await order.save({ session });
      await notify(
        order,
        order.buyer,
        `Order ${order.status.replaceAll("_", " ")}`,
        session
      );
      if (["cancelled", "disputed"].includes(order.status))
        await notify(order, order.seller, `Order ${order.status}`, session);
      result = order;
    });
    return result;
  }
  async function expire(orderId) {
    await mongoose.connection.transaction(async (session) => {
      const order = await Order.findById(orderId).session(session);
      if (
        !order ||
        order.status !== "awaiting_payment" ||
        order.expiresAt > new Date()
      )
        return;
      await restore(order, session);
      history(order, "expired", null, "Payment window expired");
      await order.save({ session });
    });
  }
  async function reconcile(order) {
    if (order.paymentMethod !== "card" || !gateway.enabled) return;
    if (
      order.stripeSessionId &&
      ["awaiting_payment", "cancelled", "expired"].includes(order.status) &&
      order.paymentStatus === "pending"
    ) {
      const checkout = await gateway.retrieve(order.stripeSessionId);
      if (checkout.payment_status === "paid") await applyPayment(checkout);
    }
    const fresh = await Order.findById(order._id);
    if (fresh.paymentStatus === "refund_pending" && fresh.paymentIntentId) {
      const refund = fresh.refundId
        ? await gateway.retrieveRefund(fresh.refundId)
        : await gateway.refund(fresh);
      await Order.updateOne(
        { _id: fresh._id, paymentStatus: "refund_pending" },
        {
          $set: {
            refundId: refund.id,
            ...(refund.status === "succeeded"
              ? { paymentStatus: "refunded" }
              : {}),
          },
        }
      );
    }
    await expire(order._id);
  }
  async function review(orderId, actor, input) {
    const rating = v.integer(input.rating, "Rating", 1, 5),
      comment = v.text(input.comment, "Review", 1500);
    let result;
    await mongoose.connection.transaction(async (session) => {
      const order = await Order.findOne({
        _id: v.id(orderId),
        buyer: actor._id,
        status: "delivered",
        reviewed: false,
      }).session(session);
      v.assert(order, "You can review a delivered order once.", 409);
      [result] = await Review.create(
        [
          {
            order: order._id,
            book: order.book,
            buyer: actor._id,
            name: actor.name,
            rating,
            comment,
          },
        ],
        { session }
      );
      order.reviewed = true;
      await order.save({ session });
    });
    return result;
  }
  return {
    quote,
    create,
    accessible,
    pay,
    applyPayment,
    transition,
    expire,
    reconcile,
    review,
  };
};
module.exports.eligibleSeller = eligibleSeller;
