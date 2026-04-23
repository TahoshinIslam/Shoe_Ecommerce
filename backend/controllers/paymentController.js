import asyncHandler from "../middleware/asyncHandler.js";
import Order from "../models/orderModel.js";
import Payment from "../models/paymentModel.js";
import {
  createCheckoutSession as stripeCreateSession,
  constructWebhookEvent,
} from "../services/stripeService.js";
import {
  bkashCreatePayment,
  bkashExecutePayment,
  bkashQueryPayment,
} from "../services/bkashService.js";
import {
  nagadInitialize,
  nagadCompleteCheckout,
  nagadVerify,
} from "../services/nagadService.js";

// Helper: upsert payment record
const upsertPayment = async (orderId, userId, method, amount, currency = "USD") => {
  let payment = await Payment.findOne({ order: orderId });
  if (!payment) {
    payment = await Payment.create({
      order: orderId,
      user: userId,
      method,
      amount,
      currency,
      status: "pending",
    });
  } else {
    payment.method = method;
    payment.amount = amount;
    payment.currency = currency;
    payment.status = "pending";
    await payment.save();
  }
  return payment;
};

// ===================== STRIPE =====================

// @desc    Create Stripe Checkout session
// @route   POST /api/payments/stripe/:orderId
// @access  Private
export const stripeCreate = asyncHandler(async (req, res) => {
  const order = await Order.findById(req.params.orderId);
  if (!order) {
    res.status(404);
    throw new Error("Order not found");
  }
  if (order.user.toString() !== req.user._id.toString()) {
    res.status(403);
    throw new Error("Not authorized");
  }

  await upsertPayment(order._id, req.user._id, "stripe", order.total, "USD");

  const session = await stripeCreateSession({
    order,
    user: req.user,
    successUrl: `${process.env.CLIENT_URL}/order/${order._id}?pay=success`,
    cancelUrl: `${process.env.CLIENT_URL}/order/${order._id}?pay=cancel`,
  });

  res.json({ success: true, sessionId: session.id, url: session.url });
});

// @desc    Stripe webhook (raw body) — server.js mounts this route before express.json
// @route   POST /api/payments/stripe/webhook
// @access  Public (signed by Stripe)
export const stripeWebhook = async (req, res) => {
  const sig = req.headers["stripe-signature"];
  let event;
  try {
    event = constructWebhookEvent(req.body, sig);
  } catch (err) {
    console.error("Stripe webhook sig error:", err.message);
    return res.status(400).send(`Webhook Error: ${err.message}`);
  }

  if (event.type === "checkout.session.completed") {
    const session = event.data.object;
    const orderId = session.metadata?.orderId || session.client_reference_id;
    if (orderId) {
      const order = await Order.findById(orderId);
      if (order) {
        order.status = "paid";
        await order.save();
      }
      await Payment.findOneAndUpdate(
        { order: orderId },
        {
          status: "completed",
          transactionId: session.payment_intent,
          paidAt: new Date(),
          gatewayResponse: session,
        },
      );
    }
  }

  res.json({ received: true });
};

// ===================== bKash =====================

// @desc    Create bKash payment → returns redirect URL
// @route   POST /api/payments/bkash/create/:orderId
// @access  Private
export const bkashCreate = asyncHandler(async (req, res) => {
  const order = await Order.findById(req.params.orderId);
  if (!order) {
    res.status(404);
    throw new Error("Order not found");
  }
  if (order.user.toString() !== req.user._id.toString()) {
    res.status(403);
    throw new Error("Not authorized");
  }

  await upsertPayment(order._id, req.user._id, "bkash", order.total, "BDT");

  const callbackURL = `${process.env.CLIENT_URL}/api-callback/bkash?orderId=${order._id}`;
  const data = await bkashCreatePayment({
    amount: order.total,
    orderId: order._id.toString(),
    callbackURL,
  });

  if (!data.bkashURL) {
    res.status(502);
    throw new Error(`bKash create failed: ${data.statusMessage || "unknown"}`);
  }

  // Store paymentID in transactionId temporarily
  await Payment.findOneAndUpdate(
    { order: order._id },
    { transactionId: data.paymentID, gatewayResponse: data },
  );

  res.json({ success: true, url: data.bkashURL, paymentID: data.paymentID });
});

// @desc    bKash callback — execute payment after user returns
// @route   POST /api/payments/bkash/execute
// @access  Private
export const bkashExecute = asyncHandler(async (req, res) => {
  const { paymentID, orderId } = req.body;
  const order = await Order.findById(orderId);
  if (!order) {
    res.status(404);
    throw new Error("Order not found");
  }

  let result = await bkashExecutePayment(paymentID);
  // If execute times out / fails, try query as fallback
  if (result.statusCode !== "0000") {
    result = await bkashQueryPayment(paymentID);
  }

  const completed =
    result.statusCode === "0000" && result.transactionStatus === "Completed";

  await Payment.findOneAndUpdate(
    { order: order._id },
    {
      status: completed ? "completed" : "failed",
      transactionId: result.trxID || paymentID,
      paidAt: completed ? new Date() : undefined,
      gatewayResponse: result,
    },
  );

  if (completed) {
    order.status = "paid";
    await order.save();
  }

  res.json({ success: completed, order, result });
});

// ===================== Nagad =====================

// @desc    Create Nagad payment
// @route   POST /api/payments/nagad/create/:orderId
// @access  Private
export const nagadCreate = asyncHandler(async (req, res) => {
  const order = await Order.findById(req.params.orderId);
  if (!order) {
    res.status(404);
    throw new Error("Order not found");
  }
  if (order.user.toString() !== req.user._id.toString()) {
    res.status(403);
    throw new Error("Not authorized");
  }

  await upsertPayment(order._id, req.user._id, "nagad", order.total, "BDT");

  const init = await nagadInitialize({ orderId: order._id.toString(), amount: order.total });
  // You'll need to decrypt init.raw.sensitiveData with your private key to extract paymentReferenceId & challenge
  // Nagad returns them encrypted with your public key — see Nagad docs for the decrypt step.
  // For now this endpoint returns the init response so you can complete the flow on the frontend.

  res.json({
    success: true,
    message: "Nagad initialized. Decrypt sensitiveData and call /api/payments/nagad/complete",
    init: init.raw,
    challenge: init.challenge,
    dateTime: init.dateTime,
  });
});

// @desc    Complete Nagad checkout after decrypting init response
// @route   POST /api/payments/nagad/complete
// @access  Private
export const nagadComplete = asyncHandler(async (req, res) => {
  const { paymentReferenceId, challenge, orderId } = req.body;
  const order = await Order.findById(orderId);
  if (!order) {
    res.status(404);
    throw new Error("Order not found");
  }
  const data = await nagadCompleteCheckout({
    paymentReferenceId,
    challenge,
    orderId: order._id.toString(),
    amount: order.total,
    callBackUrl: `${process.env.CLIENT_URL}/api-callback/nagad?orderId=${order._id}`,
  });
  res.json({ success: true, data });
});

// @desc    Verify Nagad payment after callback redirect
// @route   GET /api/payments/nagad/verify/:paymentRefId
// @access  Private
export const nagadVerifyPayment = asyncHandler(async (req, res) => {
  const { paymentRefId } = req.params;
  const { orderId } = req.query;
  const result = await nagadVerify(paymentRefId);

  const completed = result?.status === "Success";
  const order = await Order.findById(orderId);
  if (!order) {
    res.status(404);
    throw new Error("Order not found");
  }

  await Payment.findOneAndUpdate(
    { order: order._id },
    {
      status: completed ? "completed" : "failed",
      transactionId: result.issuerPaymentRefNo || paymentRefId,
      paidAt: completed ? new Date() : undefined,
      gatewayResponse: result,
    },
  );

  if (completed) {
    order.status = "paid";
    await order.save();
  }

  res.json({ success: completed, order, result });
});

// ===================== Cash on Delivery =====================

// @desc    Mark order for cash on delivery
// @route   POST /api/payments/cod/:orderId
// @access  Private
export const codCreate = asyncHandler(async (req, res) => {
  const order = await Order.findById(req.params.orderId);
  if (!order) {
    res.status(404);
    throw new Error("Order not found");
  }
  if (order.user.toString() !== req.user._id.toString()) {
    res.status(403);
    throw new Error("Not authorized");
  }
  await upsertPayment(order._id, req.user._id, "cod", order.total, "BDT");
  order.status = "processing";
  await order.save();
  res.json({ success: true, order });
});

// @desc    Get payment details for an order
// @route   GET /api/payments/order/:orderId
// @access  Private
export const getPaymentByOrder = asyncHandler(async (req, res) => {
  const payment = await Payment.findOne({ order: req.params.orderId });
  if (!payment) {
    res.status(404);
    throw new Error("Payment not found");
  }
  if (payment.user.toString() !== req.user._id.toString() && req.user.role !== "admin") {
    res.status(403);
    throw new Error("Not authorized");
  }
  res.json({ success: true, payment });
});
