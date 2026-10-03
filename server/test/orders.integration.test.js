const { test } = require("node:test");
const assert = require("node:assert/strict");
const crypto = require("node:crypto");
const mongoose = require("mongoose");
const jwt = require("jsonwebtoken");
const createApp = require("../app");
const User = require("../models/user"),
  Book = require("../models/Book"),
  Order = require("../models/Order");
const address = {
  recipient: "Test Buyer",
  phone: "0771234567",
  line1: "12 Test Street",
  city: "Colombo",
  district: "Colombo",
  postalCode: "00100",
  country: "LK",
};
test(
  "MongoDB transaction and HTTP integration",
  { skip: !process.env.TEST_MONGO_URI },
  async (t) => {
    const dbName = `shelv_test_${crypto.randomBytes(8).toString("hex")}`;
    process.env.JWT_SECRET =
      "integration-test-secret-not-for-production-123456";
    // Explicit TEST_MONGO_URI only. Never load .env or connect to MONGO_URI.
    await mongoose.connect(process.env.TEST_MONGO_URI, { dbName });
    let server;
    try {
      const gateway = {
        enabled: true,
        verify(body, signature) {
          if (signature !== "fixture-signature") throw new Error("Invalid");
          return JSON.parse(body);
        },
      };
      const app = createApp({ gateway, mail: async () => {} });
      await Promise.all(Object.values(mongoose.models).map((m) => m.init()));
      server = await new Promise((resolve) => {
        const s = app.listen(0, "127.0.0.1", () => resolve(s));
      });
      const base = `http://127.0.0.1:${server.address().port}`;
      const buyer = await User.create({
          name: "Buyer",
          email: "buyer@example.test",
        }),
        seller = await User.create({
          name: "Seller",
          email: "seller@example.test",
          role: "seller",
          sellerStatus: "approved",
        }),
        other = await User.create({
          name: "Other",
          email: "other@example.test",
        });
      async function call(path, actor, body, method = "POST", headers = {}) {
        const res = await fetch(base + path, {
          method,
          headers: {
            "Content-Type": "application/json",
            ...(actor
              ? {
                  Authorization: `Bearer ${jwt.sign(
                    { id: actor.id, version: 0 },
                    process.env.JWT_SECRET
                  )}`,
                }
              : {}),
            ...headers,
          },
          ...(body ? { body: JSON.stringify(body) } : {}),
        });
        return { status: res.status, data: await res.json() };
      }
      const listing = () =>
        Book.create({
          title: "Test book",
          author: "Author",
          category: "Fiction",
          description: "Integration test",
          seller: seller.id,
          price: 1500,
          deliveryFee: 300,
          stock: 1,
          dispatchFrom: "Colombo",
          language: "English",
        });
      const payload = (book) => ({
        bookId: book.id,
        quantity: 1,
        deliveryAddress: address,
        paymentMethod: "cod",
        expectedTotalMinor: 180000,
      });
      await t.test(
        "two simultaneous buyers cannot buy the last copy",
        async () => {
          const book = await listing();
          const results = await Promise.all([
            call("/api/orders", buyer, payload(book), "POST", {
              "Idempotency-Key": crypto.randomUUID(),
            }),
            call("/api/orders", other, payload(book), "POST", {
              "Idempotency-Key": crypto.randomUUID(),
            }),
          ]);
          assert.deepEqual(results.map((r) => r.status).sort(), [201, 409]);
          assert.equal((await Book.findById(book.id)).stock, 0);
          assert.equal(await Order.countDocuments({ book: book.id }), 1);
        }
      );
      await t.test(
        "simultaneous retries return one order; address snapshots are private and immutable",
        async () => {
          const book = await listing(),
            key = crypto.randomUUID();
          const results = await Promise.all([
            call(
              "/api/orders",
              buyer,
              { ...payload(book), saveAddress: true },
              "POST",
              { "Idempotency-Key": key }
            ),
            call("/api/orders", buyer, payload(book), "POST", {
              "Idempotency-Key": key,
            }),
          ]);
          assert.deepEqual(
            results.map((r) => r.status),
            [201, 201]
          );
          const order = results[0].data;
          assert.equal(order._id, results[1].data._id);
          assert.equal(
            (await call(`/api/orders/${order._id}`, other, null, "GET")).status,
            404
          );
          assert.equal(
            (
              await call(
                "/api/user/profile",
                buyer,
                {
                  name: "Buyer",
                  deliveryAddress: { ...address, line1: "Another street" },
                },
                "PUT"
              )
            ).status,
            200
          );
          assert.equal(
            (await call(`/api/orders/${order._id}`, buyer, null, "GET")).data
              .deliveryAddress.line1,
            "12 Test Street"
          );
          await call(`/api/orders/${order._id}/actions`, buyer, {
            action: "cancel",
            reason: "Test cancel",
          });
          await call(`/api/orders/${order._id}/actions`, buyer, {
            action: "cancel",
            reason: "Duplicate",
          });
          assert.equal((await Book.findById(book.id)).stock, 1);
        }
      );
      await t.test(
        "client total tampering rolls back stock changes",
        async () => {
          const book = await listing();
          const result = await call(
            "/api/orders",
            buyer,
            { ...payload(book), expectedTotalMinor: 1 },
            "POST",
            { "Idempotency-Key": crypto.randomUUID() }
          );
          assert.equal(result.status, 409);
          assert.equal((await Book.findById(book.id)).stock, 1);
        }
      );
      await t.test(
        "card webhook verifies signature and amount; duplicate event is harmless",
        async () => {
          const book = await listing(),
            result = await call(
              "/api/orders",
              buyer,
              { ...payload(book), paymentMethod: "card" },
              "POST",
              { "Idempotency-Key": crypto.randomUUID() }
            );
          assert.equal(result.status, 201);
          const order = result.data;
          assert.equal(
            (
              await call(`/api/orders/${order._id}/actions`, seller, {
                action: "dispatch",
                courier: "Test",
                trackingNumber: "ABC",
              })
            ).status,
            409
          );
          const event = {
            type: "checkout.session.completed",
            data: {
              object: {
                id: "cs_test",
                metadata: { orderId: order._id },
                client_reference_id: order._id,
                payment_status: "paid",
                amount_total: 180000,
                currency: "lkr",
                payment_intent: "pi_test",
              },
            },
          };
          assert.equal((await call("/api/webhook", null, event)).status, 400);
          for (let i = 0; i < 2; i++)
            assert.equal(
              (
                await call("/api/webhook", null, event, "POST", {
                  "stripe-signature": "fixture-signature",
                })
              ).status,
              200
            );
          const stored = await Order.findById(order._id);
          assert.equal(stored.paymentStatus, "paid");
          assert.equal(stored.history.length, 2);
          assert.equal((await Book.findById(book.id)).stock, 0);
        }
      );
      await t.test(
        "seller restrictions are checked on fresh database state",
        async () => {
          const book = await listing();
          await User.updateOne(
            { _id: seller.id },
            { $set: { sellerStatus: "restricted" } }
          );
          assert.equal(
            (
              await call("/api/orders", buyer, payload(book), "POST", {
                "Idempotency-Key": crypto.randomUUID(),
              })
            ).status,
            409
          );
          assert.equal(
            (await call("/api/seller/books", seller, null, "GET")).status,
            403
          );
        }
      );
    } finally {
      if (server) await new Promise((resolve) => server.close(resolve));
      if (mongoose.connection.name === dbName)
        await mongoose.connection.dropDatabase();
      await mongoose.disconnect();
    }
  }
);
