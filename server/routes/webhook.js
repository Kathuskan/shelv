const express = require('express');
const router = express.Router();
const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);
const Book = require('../models/Book');

// 🌟 IMPORTANT: This specific route uses express.raw(), NOT express.json()
router.post('/', express.raw({ type: 'application/json' }), async (req, res) => {
  const sig = req.headers['stripe-signature'];
  const endpointSecret = process.env.STRIPE_WEBHOOK_SECRET;

  let event;

  try {
    // Verify the request actually came from Stripe
    event = stripe.webhooks.constructEvent(req.body, sig, endpointSecret);
  } catch (err) {
    console.error(`⚠️ Webhook signature verification failed:`, err.message);
    return res.status(400).send(`Webhook Error: ${err.message}`);
  }

  // Handle the successful payment event
  if (event.type === 'checkout.session.completed') {
    const session = event.data.object;
    
    // Retrieve the book ID we stashed in the metadata earlier
    const bookId = session.metadata.bookId;

    try {
      // Find the book and mark it as sold (or delete it, depending on your logic)
      // For this example, let's just delete the listing so nobody else can buy it
      await Book.findByIdAndDelete(bookId);
      console.log(`✅ Payment successful! Book ${bookId} removed from inventory.`);
    } catch (dbError) {
      console.error('Error updating database after payment:', dbError);
    }
  }

  // Tell Stripe we received the message successfully
  res.status(200).json({ received: true });
});

module.exports = router;