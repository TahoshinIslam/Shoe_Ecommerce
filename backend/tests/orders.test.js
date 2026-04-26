import { describe, it, expect } from "vitest";
import Product from "../models/productModel.js";
import Order from "../models/orderModel.js";
import Coupon from "../models/couponModel.js";
import Settings from "../models/settingsModel.js";
import {
  createUser,
  createProduct,
  authedRequest,
} from "./helpers.js";

const validAddress = {
  fullName: "Test User",
  phone: "1234567890",
  street: "1 Test Road",
  city: "Dhaka",
  postalCode: "1200",
  country: "BD",
};

// Reset Settings to defaults before each order test. Use findOneAndUpdate
// with upsert so the second-and-later calls don't hit a duplicate-key error.
const seedDefaultSettings = async () => {
  await Settings.findOneAndUpdate(
    { _id: "main" },
    { $setOnInsert: { _id: "main" } },
    { upsert: true, new: true, setDefaultsOnInsert: true },
  );
};

describe("Orders — create (happy path)", () => {
  it("creates order, decrements stock, clears cart", async () => {
    await seedDefaultSettings();
    const user = await createUser({ email: "buyer@example.com" });
    const product = await createProduct({
      sizes: [{ size: "42", stock: 5 }],
      basePrice: 100,
    });

    const req = await authedRequest(user);
    const res = await req
      .post("/api/orders")
      .send({
        items: [{ product: product._id, size: "42", quantity: 2 }],
        shippingAddress: validAddress,
      });

    expect(res.status).toBe(201);
    expect(res.body.order.status).toBe("pending");
    expect(res.body.order.currency).toBe("BDT");
    expect(res.body.order.region).toBe("BD");
    expect(res.body.order.subtotal).toBeGreaterThan(0);
    expect(res.body.order.total).toBeGreaterThan(0);

    const after = await Product.findById(product._id);
    expect(after.sizes.find((s) => s.size === "42").stock).toBe(3);
  });
});

describe("Orders — stock enforcement", () => {
  it("rejects insufficient stock", async () => {
    await seedDefaultSettings();
    const user = await createUser({ email: "nostock@example.com" });
    const product = await createProduct({
      sizes: [{ size: "42", stock: 1 }],
    });

    const req = await authedRequest(user);
    const res = await req
      .post("/api/orders")
      .send({
        items: [{ product: product._id, size: "42", quantity: 2 }],
        shippingAddress: validAddress,
      });

    expect(res.status).toBe(400);
    const after = await Product.findById(product._id);
    expect(after.sizes.find((s) => s.size === "42").stock).toBe(1);
  });

  it("rolls back on concurrent race — stock never goes negative", async () => {
    await seedDefaultSettings();
    const user1 = await createUser({ email: "race1@example.com" });
    const user2 = await createUser({ email: "race2@example.com" });
    const product = await createProduct({
      sizes: [{ size: "42", stock: 1 }],
      basePrice: 50,
    });

    const [req1, req2] = await Promise.all([
      authedRequest(user1),
      authedRequest(user2),
    ]);

    const [res1, res2] = await Promise.all([
      req1.post("/api/orders").send({
        items: [{ product: product._id, size: "42", quantity: 1 }],
        shippingAddress: validAddress,
      }),
      req2.post("/api/orders").send({
        items: [{ product: product._id, size: "42", quantity: 1 }],
        shippingAddress: validAddress,
      }),
    ]);

    const statuses = [res1.status, res2.status].sort();
    expect(statuses[0]).toBe(201);
    expect([400, 409]).toContain(statuses[1]);

    const after = await Product.findById(product._id);
    expect(after.sizes.find((s) => s.size === "42").stock).toBe(0);

    const orders = await Order.find();
    expect(orders).toHaveLength(1);
  });
});

describe("Orders — cancel restores stock and coupon", () => {
  it("restocks and decrements coupon usedCount", async () => {
    await seedDefaultSettings();
    const user = await createUser({ email: "cancel@example.com" });
    const product = await createProduct({
      sizes: [{ size: "42", stock: 5 }],
      basePrice: 100,
    });
    const coupon = await Coupon.create({
      code: "SAVE10",
      discountType: "percentage",
      discountValue: 10,
      isActive: true,
      usedCount: 0,
      expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
    });

    const req = await authedRequest(user);
    const createRes = await req
      .post("/api/orders")
      .send({
        items: [{ product: product._id, size: "42", quantity: 2 }],
        shippingAddress: validAddress,
        couponCode: "SAVE10",
      });
    expect(createRes.status).toBe(201);

    let p = await Product.findById(product._id);
    let c = await Coupon.findById(coupon._id);
    expect(p.sizes.find((s) => s.size === "42").stock).toBe(3);
    expect(c.usedCount).toBe(1);

    const cancelRes = await req.post(`/api/orders/${createRes.body.order._id}/cancel`);
    expect(cancelRes.status).toBe(200);
    expect(cancelRes.body.order.status).toBe("cancelled");

    p = await Product.findById(product._id);
    c = await Coupon.findById(coupon._id);
    expect(p.sizes.find((s) => s.size === "42").stock).toBe(5);
    expect(c.usedCount).toBe(0);
  });
});

describe("Orders — rejects client-provided totals", () => {
  it("ignores client 'total' and computes server-side", async () => {
    await seedDefaultSettings();
    const user = await createUser({ email: "cheat@example.com" });
    const product = await createProduct({
      sizes: [{ size: "42", stock: 5 }],
      basePrice: 100,
    });

    const req = await authedRequest(user);
    const res = await req
      .post("/api/orders")
      .send({
        items: [{ product: product._id, size: "42", quantity: 1 }],
        shippingAddress: validAddress,
        total: 1,
        subtotal: 1,
      });

    expect(res.status).toBe(201);
    expect(res.body.order.total).not.toBe(1);
    expect(res.body.order.subtotal).not.toBe(1);
  });
});

// ---------- First-order free shipping promo ----------
//
// When admin enables "free shipping on first order", a new customer's first
// real order should have shippingCost = 0. Their second order should NOT.
// And concurrent first-orders must not both claim the benefit.

const enableFirstOrderPromo = async () => {
  await Settings.findOneAndUpdate(
    { _id: "main" },
    { $set: { "promotions.firstOrderFreeShipping": true } },
  );
};

describe("Orders — first-order free shipping promo", () => {
  it("waives shipping on the user's first order", async () => {
    await seedDefaultSettings();
    await enableFirstOrderPromo();
    const user = await createUser({ email: "first@example.com" });
    const product = await createProduct({
      sizes: [{ size: "42", stock: 5 }],
      basePrice: 100,
    });

    const req = await authedRequest(user);
    const res = await req.post("/api/orders").send({
      items: [{ product: product._id, size: "42", quantity: 1 }],
      shippingAddress: validAddress,
    });

    expect(res.status).toBe(201);
    expect(res.body.order.shippingCost).toBe(0);
    expect(res.body.order.shippingTier).toMatch(/First order free/);
  });

  it("does NOT waive shipping on the user's second order", async () => {
    await seedDefaultSettings();
    await enableFirstOrderPromo();
    const user = await createUser({ email: "second@example.com" });
    const product = await createProduct({
      sizes: [{ size: "42", stock: 5 }],
      basePrice: 100,
    });

    const req = await authedRequest(user);
    const first = await req.post("/api/orders").send({
      items: [{ product: product._id, size: "42", quantity: 1 }],
      shippingAddress: validAddress,
    });
    expect(first.status).toBe(201);
    expect(first.body.order.shippingCost).toBe(0);

    const second = await req.post("/api/orders").send({
      items: [{ product: product._id, size: "42", quantity: 1 }],
      shippingAddress: validAddress,
    });
    expect(second.status).toBe(201);
    expect(second.body.order.shippingCost).toBeGreaterThan(0);
    expect(second.body.order.shippingTier).not.toMatch(/First order free/);
  });

  it("does NOT restore eligibility after cancelling the first order", async () => {
    // The bug we're locking in: a user could previously cancel + reorder to
    // re-trigger the promo, because the eligibility check excluded cancelled
    // orders. The flag-based approach makes the promo single-use.
    await seedDefaultSettings();
    await enableFirstOrderPromo();
    const user = await createUser({ email: "abuser@example.com" });
    const product = await createProduct({
      sizes: [{ size: "42", stock: 5 }],
      basePrice: 100,
    });

    const req = await authedRequest(user);
    const first = await req.post("/api/orders").send({
      items: [{ product: product._id, size: "42", quantity: 1 }],
      shippingAddress: validAddress,
    });
    expect(first.status).toBe(201);
    await req.post(`/api/orders/${first.body.order._id}/cancel`);

    const second = await req.post("/api/orders").send({
      items: [{ product: product._id, size: "42", quantity: 1 }],
      shippingAddress: validAddress,
    });
    expect(second.status).toBe(201);
    expect(second.body.order.shippingCost).toBeGreaterThan(0);
  });

  it("only one of two concurrent first-orders gets free shipping", async () => {
    // Race-condition lock-in. With the old count-based check both orders
    // would observe count=0 and both get the promo. With the atomic flag
    // exactly one wins.
    await seedDefaultSettings();
    await enableFirstOrderPromo();
    const user = await createUser({ email: "race@example.com" });
    const product = await createProduct({
      sizes: [{ size: "42", stock: 5 }],
      basePrice: 100,
    });

    const req = await authedRequest(user);
    const [r1, r2] = await Promise.all([
      req.post("/api/orders").send({
        items: [{ product: product._id, size: "42", quantity: 1 }],
        shippingAddress: validAddress,
      }),
      req.post("/api/orders").send({
        items: [{ product: product._id, size: "42", quantity: 1 }],
        shippingAddress: validAddress,
      }),
    ]);

    expect(r1.status).toBe(201);
    expect(r2.status).toBe(201);
    const freeCount = [r1, r2].filter((r) => r.body.order.shippingCost === 0).length;
    expect(freeCount).toBe(1);
  });
});
