import Stripe from "stripe";

let _stripe;
export const getStripe = () => {
  if (!_stripe) {
    _stripe = new Stripe(process.env.STRIPE_SECRET_KEY, { apiVersion: "2024-06-20" });
  }
  return _stripe;
};

// Create a Stripe Checkout Session
export const createCheckoutSession = async ({ order, user, successUrl, cancelUrl }) => {
  const stripe = getStripe();
  const session = await stripe.checkout.sessions.create({
    mode: "payment",
    payment_method_types: ["card"],
    customer_email: user.email,
    client_reference_id: order._id.toString(),
    line_items: order.items.map((it) => ({
      price_data: {
        currency: "usd",
        product_data: { name: `${it.name} (Size ${it.size})`, images: it.image ? [it.image] : [] },
        unit_amount: Math.round(it.price * 100),
      },
      quantity: it.quantity,
    })),
    metadata: { orderId: order._id.toString(), userId: user._id.toString() },
    success_url: successUrl,
    cancel_url: cancelUrl,
  });
  return session;
};

// Verify webhook signature & construct event
export const constructWebhookEvent = (rawBody, signature) => {
  const stripe = getStripe();
  return stripe.webhooks.constructEvent(
    rawBody,
    signature,
    process.env.STRIPE_WEBHOOK_SECRET,
  );
};
