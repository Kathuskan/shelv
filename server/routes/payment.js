const express = require('express');
const router = express.Router();
// Use the secret key from your environment variables
const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);

router.post('/create-checkout-session', async (req, res) => {
  try {
    const { book } = req.body;

    // Create a new checkout session with Stripe
    const session = await stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      line_items: [
        {
          price_data: {
            currency: 'lkr', // Sri Lankan Rupees
            product_data: {
              name: book.title,
              description: `Listing by: ${book.author}`,
              images: [book.images[0]], // Pass the first image from Cloudinary
            },
            unit_amount: book.price * 100, // Stripe expects amounts in cents/smallest unit
          },
          quantity: 1,
        },
      ],
      mode: 'payment',
      // Redirect back to your Vercel site after payment
      success_url: `${process.env.CLIENT_URL}/payment-success`,
      cancel_url: `${process.env.CLIENT_URL}/book/${book._id}`,
    });

    // Send the unique session ID back to the React frontend
    // 🌟 NEW STRIPE WAY: Send the direct secure URL back to React
    res.json({ url: session.url });
  } catch (error) {
    console.error("Stripe Error:", error);
    res.status(500).json({ message: "Could not create payment session" });
  }
});

module.exports = router;