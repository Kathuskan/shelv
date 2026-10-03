function createGateway() {
  const enabled =
    process.env.CARD_PAYMENTS_ENABLED === "true" &&
    !!process.env.STRIPE_SECRET_KEY &&
    !!process.env.STRIPE_WEBHOOK_SECRET;
  const stripe = enabled
    ? require("stripe")(process.env.STRIPE_SECRET_KEY)
    : null;
  return {
    enabled,
    async create(order, email) {
      const root = process.env.CLIENT_URL || "http://localhost:5173";
      const line_items = [
        {
          price_data: {
            currency: "lkr",
            product_data: { name: order.item.title },
            unit_amount: order.item.unitPriceMinor,
          },
          quantity: order.quantity,
        },
      ];
      if (order.deliveryMinor)
        line_items.push({
          price_data: {
            currency: "lkr",
            product_data: { name: "Delivery" },
            unit_amount: order.deliveryMinor,
          },
          quantity: 1,
        });
      return stripe.checkout.sessions.create(
        {
          mode: "payment",
          payment_method_types: ["card"],
          line_items,
          customer_email: email,
          client_reference_id: String(order._id),
          metadata: { orderId: String(order._id) },
          success_url: `${root}/orders/${order._id}?payment=returned`,
          cancel_url: `${root}/orders/${order._id}`,
          // Identical parameters on every retry, including the expiry timestamp.
          expires_at: Math.floor(order.expiresAt.getTime() / 1000),
        },
        { idempotencyKey: `checkout-${order._id}` }
      );
    },
    retrieve(id) {
      return stripe.checkout.sessions.retrieve(id);
    },
    verify(body, signature) {
      return stripe.webhooks.constructEvent(
        body,
        signature,
        process.env.STRIPE_WEBHOOK_SECRET
      );
    },
    async refund(order) {
      return stripe.refunds.create(
        { payment_intent: order.paymentIntentId, amount: order.totalMinor },
        { idempotencyKey: `refund-${order._id}` }
      );
    },
    retrieveRefund(id) {
      return stripe.refunds.retrieve(id);
    },
  };
}
module.exports = createGateway;
