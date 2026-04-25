import { describe, it, expect } from "vitest";
import {
  createUser,
  createProduct,
  createDeliveredOrder,
  authedRequest,
} from "./helpers.js";

describe("Reviews — delivered-order gate", () => {
  it("blocks review when user has not ordered the product", async () => {
    const user = await createUser({ email: "nobuy@example.com" });
    const product = await createProduct();

    const req = await authedRequest(user);
    const res = await req
      .post(`/api/reviews/product/${product._id}`)
      .send({ rating: 5, comment: "Love it" });

    expect(res.status).toBe(403);
  });

  it("allows review after delivered order exists", async () => {
    const user = await createUser({ email: "buy@example.com" });
    const product = await createProduct();
    await createDeliveredOrder(user, product);

    const req = await authedRequest(user);
    const res = await req
      .post(`/api/reviews/product/${product._id}`)
      .send({ rating: 5, title: "Great", comment: "Love it" });

    expect(res.status).toBe(201);
    expect(res.body.review.isVerifiedPurchase).toBe(true);
  });

  it("rejects duplicate review from same user", async () => {
    const user = await createUser({ email: "dupreview@example.com" });
    const product = await createProduct();
    await createDeliveredOrder(user, product);

    const req = await authedRequest(user);
    await req
      .post(`/api/reviews/product/${product._id}`)
      .send({ rating: 5, comment: "first" });

    const res = await req
      .post(`/api/reviews/product/${product._id}`)
      .send({ rating: 4, comment: "second" });

    expect(res.status).toBe(400);
    // Don't assert on message text — body shape varies between
    // duplicate-key error path and explicit-throw path.
    // Status alone proves the duplicate was rejected.
  });
});
