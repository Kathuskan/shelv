const { test, afterEach } = require("node:test");
const assert = require("node:assert/strict");
const mongoose = require("mongoose");
const v = require("../lib/validation");
const Order = require("../models/Order"),
  Book = require("../models/Book"),
  User = require("../models/user"),
  Notification = require("../models/Notification");
const service = require("../services/orders");
const rateLimit = require("../lib/rateLimit");
const address = {
  recipient: "Test Buyer",
  phone: "0771234567",
  line1: "12 Test Street",
  line2: "",
  city: "Colombo",
  district: "Colombo",
  postalCode: "00100",
  country: "LK",
  instructions: "Ring the bell",
};
const buyer = { _id: new mongoose.Types.ObjectId(), name: "Buyer" },
  seller = {
    _id: new mongoose.Types.ObjectId(),
    role: "seller",
    sellerStatus: "approved",
  },
  outsider = { _id: new mongoose.Types.ObjectId() };
const restores = [];
const originals = [];
function replace(object, key, value) {
  originals.push([object, key, object[key]]);
  object[key] = value;
}
afterEach(() => {
  for (const [o, k, v] of originals.splice(0).reverse()) o[k] = v;
  restores.length = 0;
});
function setupOrder(overrides = {}) {
  const order = new Order({
    buyer: buyer._id,
    seller: seller._id,
    book: new mongoose.Types.ObjectId(),
    number: "SH-TEST",
    clientKey: "test-request-key-123",
    fingerprint: "test",
    item: { title: "Book", unitPriceMinor: 150000 },
    quantity: 1,
    deliveryAddress: address,
    totalMinor: 180000,
    subtotalMinor: 150000,
    deliveryMinor: 30000,
    paymentMethod: "cod",
    paymentStatus: "due",
    status: "placed",
    history: [],
    ...overrides,
  });
  order.save = async () => order;
  replace(Order, "findById", () => ({
    session: async () => order,
    then: (resolve) => resolve(order),
  }));
  replace(mongoose.connection, "transaction", async (fn) => fn({}));
  replace(Book, "updateOne", async (...args) => {
    restores.push(args);
    return { modifiedCount: 1 };
  });
  replace(Notification, "updateOne", async () => ({}));
  return order;
}
test("delivery address requires complete Sri Lankan delivery details", () => {
  assert.deepEqual(v.address(address), address);
  for (const invalid of [
    { ...address, line1: "" },
    { ...address, postalCode: "ABC" },
    { ...address, phone: "123" },
    { ...address, country: "US" },
    { ...address, district: "Unknown" },
  ])
    assert.throws(() => v.address(invalid));
});
test("currency and quantity validation reject tampering and fractions", () => {
  assert.equal(v.money("1500.25", "Price"), 150025);
  assert.equal(v.money("0", "Delivery", true), 0);
  for (const invalid of [-1, 1.234, "1e3", {}, null])
    assert.throws(() => v.money(invalid, "Price"));
  for (const invalid of [0, 1.5, true, "", 21])
    assert.throws(() => v.integer(invalid, "Quantity", 1, 20));
});
test("request limiter enforces configured limit", () => {
  const limit = rateLimit({ limit: 2 }),
    req = { ip: "test" },
    res = {
      set() {},
      status(code) {
        this.code = code;
        return this;
      },
      json() {},
    };
  let next = 0;
  for (let i = 0; i < 3; i++) limit(req, res, () => next++);
  assert.equal(next, 2);
  assert.equal(res.code, 429);
});
test("quote uses stored book prices and per-order delivery fee", async () => {
  replace(Book, "findById", () => ({
    session: async () => ({
      seller: seller._id,
      stock: 3,
      listingType: "Sale",
      status: "active",
      price: 1200.5,
      deliveryFee: 250,
    }),
  }));
  replace(User, "findById", () => ({ session: async () => seller }));
  const q = await service({ enabled: false }).quote(
    new mongoose.Types.ObjectId().toString(),
    2
  );
  assert.equal(q.totalMinor, 265100);
  assert.equal(q.deliveryMinor, 25000);
  await assert.rejects(
    service({}).quote(new mongoose.Types.ObjectId().toString(), 4),
    /Not enough/
  );
});
test("only parties to an order may view its address", async () => {
  const order = setupOrder();
  const s = service({});
  await assert.rejects(s.accessible(order.id, outsider), /not found/);
  assert.equal((await s.accessible(order.id, buyer)).id, order.id);
});
test("buyer cannot dispatch and pending card payment cannot dispatch", async () => {
  const order = setupOrder();
  const s = service({});
  await assert.rejects(
    s.transition(order.id, buyer, { action: "dispatch" }),
    /Only a ready/
  );
  order.paymentMethod = "card";
  order.paymentStatus = "pending";
  await assert.rejects(
    s.transition(order.id, seller, { action: "dispatch" }),
    /Payment has not/
  );
});
test("seller dispatch stores tracking; buyer receipt does not imply cash remittance", async () => {
  const order = setupOrder();
  const s = service({});
  await s.transition(order.id, seller, {
    action: "dispatch",
    courier: "Test courier",
    trackingNumber: "ABC123",
    trackingUrl: "https://example.com/track/ABC123",
  });
  assert.equal(order.status, "dispatched");
  assert.equal(order.shipping.trackingNumber, "ABC123");
  await assert.rejects(
    s.transition(order.id, seller, { action: "deliver" }),
    /buyer can confirm/
  );
  await s.transition(order.id, buyer, { action: "deliver" });
  assert.equal(order.status, "delivered");
  assert.equal(order.paymentStatus, "due");
  await s.transition(order.id, seller, { action: "collect" });
  assert.equal(order.paymentStatus, "collected");
});
test("tracking URL rejects executable links", async () => {
  const order = setupOrder();
  await assert.rejects(
    service({}).transition(order.id, seller, {
      action: "dispatch",
      courier: "Courier",
      trackingNumber: "X",
      trackingUrl: "javascript:alert(1)",
    }),
    /HTTPS/
  );
});
test("cancellation restores stock exactly once and rejects cancellation after dispatch", async () => {
  const order = setupOrder();
  const s = service({});
  await s.transition(order.id, buyer, {
    action: "cancel",
    reason: "Changed my mind",
  });
  assert.equal(restores.length, 1);
  assert.equal(restores[0][1].$inc.stock, 1);
  assert.equal(restores[0][1].$inc.__v, 1);
  await assert.rejects(
    s.transition(order.id, buyer, { action: "cancel", reason: "Retry" }),
    /cannot be cancelled/
  );
  assert.equal(restores.length, 1);
  order.status = "dispatched";
  await assert.rejects(
    s.transition(order.id, buyer, { action: "cancel", reason: "Too late" }),
    /cannot be cancelled/
  );
});
function paidSession(order) {
  return {
    id: "cs_test",
    metadata: { orderId: order.id },
    payment_status: "paid",
    amount_total: order.totalMinor,
    currency: "lkr",
    client_reference_id: order.id,
    payment_intent: "pi_test",
  };
}
test("payment confirmation validates totals and is idempotent", async () => {
  const order = setupOrder({
      paymentMethod: "card",
      paymentStatus: "pending",
      status: "awaiting_payment",
    }),
    s = service({});
  await assert.rejects(
    s.applyPayment({ ...paidSession(order), amount_total: 1 }),
    /do not match/
  );
  await s.applyPayment(paidSession(order));
  await s.applyPayment(paidSession(order));
  assert.equal(order.status, "placed");
  assert.equal(order.paymentStatus, "paid");
  assert.equal(order.history.length, 1);
});
test("late payment for cancelled order queues refund instead of reviving order", async () => {
  const order = setupOrder({
    paymentMethod: "card",
    paymentStatus: "pending",
    status: "cancelled",
    stockReleased: true,
  });
  await service({}).applyPayment(paidSession(order));
  assert.equal(order.status, "cancelled");
  assert.equal(order.paymentStatus, "refund_pending");
  assert.equal(restores.length, 0);
});
test("paid cancellation queues refund and expiry releases unpaid stock", async () => {
  let order = setupOrder({ paymentMethod: "card", paymentStatus: "paid" });
  await service({}).transition(order.id, buyer, {
    action: "cancel",
    reason: "Cancel please",
  });
  assert.equal(order.paymentStatus, "refund_pending");
  order.status = "awaiting_payment";
  order.paymentStatus = "pending";
  order.stockReleased = false;
  order.expiresAt = new Date(Date.now() - 1000);
  await service({}).expire(order.id);
  assert.equal(order.status, "expired");
});
test("a buyer cannot resolve their own dispute or claim a refund", async () => {
  const order = setupOrder({ status: "disputed" });
  await assert.rejects(
    service({}).transition(order.id, buyer, {
      action: "resolve",
      resolution: "returned",
      reason: "Refund me",
    }),
    /administrator/
  );
});
