import { describe, it, expect } from "vitest";
import request from "supertest";
import app from "../app.js";
import { createUser, loginAs, getCsrfPair } from "./helpers.js";

describe("CSRF — mutating requests require token", () => {
  it("blocks POST with no CSRF token", async () => {
    await createUser({ email: "csrf1@example.com" });
    const { cookies } = await loginAs("csrf1@example.com");

    // POST to any authed mutating endpoint WITHOUT the CSRF token.
    // Using /api/addresses because it's a simple authed POST.
    const res = await request(app)
      .post("/api/addresses")
      .set("Cookie", cookies)
      .send({
        fullName: "Test",
        phone: "123",
        addressLine1: "1 Test St",
        city: "X",
        postalCode: "0",
        country: "BD",
      });

    expect(res.status).toBe(403);
    expect(res.body.message).toMatch(/csrf/i);
  });

  it("allows POST with valid CSRF token", async () => {
    const user = await createUser({ email: "csrf2@example.com" });
    const { cookies } = await loginAs("csrf2@example.com");
    const { token, cookies: withCsrf } = await getCsrfPair(cookies);

    // Bad product ID — but CSRF should pass, failure should be downstream (404).
    const res = await request(app)
      .post("/api/cart")
      .set("Cookie", withCsrf)
      .set("X-CSRF-Token", token)
      .send({
        productId: "507f1f77bcf86cd799439011",
        size: "42",
        quantity: 1,
      });

    // Expect 404 (product not found) — NOT 403. That proves CSRF passed.
    expect(res.status).not.toBe(403);
  });

  it("exempts Stripe webhook", async () => {
    // Valid sig should go through without CSRF token
    const res = await request(app)
      .post("/api/payments/stripe/webhook")
      .set("stripe-signature", "valid")
      .set("Content-Type", "application/json")
      .send({ type: "checkout.session.completed", data: { object: {} } });

    expect(res.status).not.toBe(403);
  });

  it("exempts login endpoint", async () => {
    await createUser({
      email: "loginexempt@example.com",
      password: "Password123!",
    });
    const res = await request(app).post("/api/users/login").send({
      email: "loginexempt@example.com",
      password: "Password123!",
    });
    expect(res.status).toBe(200); // Login works without a prior CSRF token
  });
});
