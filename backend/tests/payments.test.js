import { describe, it, expect, vi } from "vitest";
import request from "supertest";
import app from "../app.js";
import Order from "../models/orderModel.js";
import Payment from "../models/paymentModel.js";
import { createUser, createProduct } from "./helpers.js";
import * as stripeService from "../services/stripeService.js";

/**
 * Helper: create an order in "pending" status ready to be paid.
 */
const createPendingOrder = async (total = 100) => {
  const user = await createUser({ email: `pay-${Date.now()}@example.com` });
  const product = await createProduct({
    sizes: [{ size: "42", stock: 5 }],
    basePrice: total,
  });
  const order = await Order.create({
    user: user._id,
    items: [
      {
        product: product._id,
        name: product.name,
        image: product.images[0],
        size: "42",
        quantity: 1,
        price: total,
      },
    ],
    shippingAddress: {
      fullName: "P",
      phone: "1",
      street: "x",
      city: "x",
      postalCode: "x",
      country: "BD",
    },
    subtotal: total,
    shippingCost: 0,
    discount: 0,
    total,
    status: "pending",
  });
  await Payment.create({
    order: order._id,
    user: user._id,
    method: "stripe",
    amount: total,
    currency: "USD",
    status: "pending",
  });
  return { user, order };
};

describe("Stripe webhook", () => {
  it("rejects request with invalid signature", async () => {
    const res = await request(app)
      .post("/api/payments/stripe/webhook")
      .set("stripe-signature", "invalid")
      .set("Content-Type", "application/json")
      .send({ type: "checkout.session.completed" });

    expect(res.status).toBe(400);
  });

  it("marks order as paid on valid webhook", async () => {
    const { order } = await createPendingOrder(100);

    const event = {
      type: "checkout.session.completed",
      data: {
        object: {
          id: "cs_test_123",
          metadata: { orderId: order._id.toString() },
          amount_total: 10000, // $100 in cents
          payment_intent: "pi_test_123",
        },
      },
    };

    const res = await request(app)
      .post("/api/payments/stripe/webhook")
      .set("stripe-signature", "valid")
      .set("Content-Type", "application/json")
      .send(event);

    expect(res.status).toBe(200);

    const updated = await Order.findById(order._id);
    expect(updated.status).toBe("paid");

    const payment = await Payment.findOne({ order: order._id });
    expect(payment.status).toBe("completed");
    expect(payment.transactionId).toBe("pi_test_123");
  });

  it("is idempotent — second webhook for same order is a no-op", async () => {
    const { order } = await createPendingOrder(100);

    const event = {
      type: "checkout.session.completed",
      data: {
        object: {
          id: "cs_test_dup",
          metadata: { orderId: order._id.toString() },
          amount_total: 10000,
          payment_intent: "pi_test_dup",
        },
      },
    };

    // First call marks it paid
    await request(app)
      .post("/api/payments/stripe/webhook")
      .set("stripe-signature", "valid")
      .set("Content-Type", "application/json")
      .send(event);

    const firstOrder = await Order.findById(order._id);
    const firstPaidAt = firstOrder.updatedAt;

    // Wait 50ms so timestamps would differ if it were re-processed
    await new Promise((r) => setTimeout(r, 50));

    // Second call should short-circuit
    const res = await request(app)
      .post("/api/payments/stripe/webhook")
      .set("stripe-signature", "valid")
      .set("Content-Type", "application/json")
      .send(event);

    expect(res.status).toBe(200);
    expect(res.body.note).toBe("already processed");

    const secondOrder = await Order.findById(order._id);
    expect(secondOrder.updatedAt.getTime()).toBe(firstPaidAt.getTime());
  });

  it("rejects mismatched amount", async () => {
    const { order } = await createPendingOrder(100);

    const event = {
      type: "checkout.session.completed",
      data: {
        object: {
          id: "cs_test_bad_amount",
          metadata: { orderId: order._id.toString() },
          amount_total: 1, // attacker says $0.01 instead of $100
          payment_intent: "pi_test_x",
        },
      },
    };

    const res = await request(app)
      .post("/api/payments/stripe/webhook")
      .set("stripe-signature", "valid")
      .set("Content-Type", "application/json")
      .send(event);

    expect(res.status).toBe(200); // we ack to Stripe
    expect(res.body.note).toBe("amount mismatch");

    const o = await Order.findById(order._id);
    expect(o.status).toBe("pending"); // NOT paid
  });
});
