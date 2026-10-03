const { test } = require("node:test");
const assert = require("node:assert/strict");
const Stripe = require("stripe");
const createGateway = require("../services/gateway");
test("cards stay disabled until both key and webhook secret are configured", () => {
  const previous = { ...process.env };
  try {
    process.env.CARD_PAYMENTS_ENABLED = "true";
    process.env.STRIPE_SECRET_KEY = "sk_test_fixture";
    delete process.env.STRIPE_WEBHOOK_SECRET;
    assert.equal(createGateway().enabled, false);
  } finally {
    for (const key of [
      "CARD_PAYMENTS_ENABLED",
      "STRIPE_SECRET_KEY",
      "STRIPE_WEBHOOK_SECRET",
    ]) {
      if (previous[key] === undefined) delete process.env[key];
      else process.env[key] = previous[key];
    }
  }
});
test("Stripe adapter verifies actual signatures and rejects changed payloads", () => {
  const previous = { ...process.env };
  try {
    process.env.CARD_PAYMENTS_ENABLED = "true";
    process.env.STRIPE_SECRET_KEY = "sk_test_fixture";
    process.env.STRIPE_WEBHOOK_SECRET = "whsec_fixture";
    const gateway = createGateway(),
      stripe = new Stripe("sk_test_fixture"),
      payload = JSON.stringify({
        id: "evt_fixture",
        type: "checkout.session.completed",
        data: { object: { id: "cs_fixture" } },
      });
    const header = stripe.webhooks.generateTestHeaderString({
      payload,
      secret: "whsec_fixture",
    });
    assert.equal(
      gateway.verify(Buffer.from(payload), header).id,
      "evt_fixture"
    );
    assert.throws(() =>
      gateway.verify(
        Buffer.from(payload.replace("cs_fixture", "cs_changed")),
        header
      )
    );
    assert.throws(() => gateway.verify(Buffer.from(payload), "invalid"));
  } finally {
    for (const key of [
      "CARD_PAYMENTS_ENABLED",
      "STRIPE_SECRET_KEY",
      "STRIPE_WEBHOOK_SECRET",
    ]) {
      if (previous[key] === undefined) delete process.env[key];
      else process.env[key] = previous[key];
    }
  }
});
