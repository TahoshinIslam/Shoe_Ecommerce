import { describe, it, expect } from "vitest";
import { createUser, createProduct, authedRequest } from "./helpers.js";

describe("RBAC — customers cannot access admin routes", () => {
  it("blocks product creation by a customer", async () => {
    const user = await createUser({ email: "cust1@example.com", role: "customer" });
    const req = await authedRequest(user);
    const res = await req.post("/api/products").send({ name: "Pwn", basePrice: 1 });
    expect([401, 403]).toContain(res.status);
  });

  it("blocks user list access by a customer", async () => {
    const user = await createUser({ email: "cust2@example.com", role: "customer" });
    const req = await authedRequest(user);
    const res = await req.get("/api/users");
    expect([401, 403]).toContain(res.status);
  });
});

describe("RBAC — admin can access admin routes", () => {
  it("admin can list users", async () => {
    const admin = await createUser({
      email: "admin@example.com",
      role: "admin",
      isVerified: true,
    });
    const req = await authedRequest(admin);
    const res = await req.get("/api/users");
    expect(res.status).toBe(200);
  });
});

describe("Mass-assignment — blocked on product update", () => {
  it("strips non-whitelisted fields from PUT /api/products/:id", async () => {
    const admin = await createUser({ email: "admin2@example.com", role: "admin" });
    const product = await createProduct({ basePrice: 50 });

    const req = await authedRequest(admin);
    const res = await req
      .put(`/api/products/${product._id}`)
      .send({
        basePrice: 60,
        rating: 999, // not writable
        numReviews: 999, // not writable
      });

    expect(res.status).toBe(200);
    expect(res.body.product.basePrice).toBe(60);
    expect(res.body.product.rating).not.toBe(999);
    expect(res.body.product.numReviews).not.toBe(999);
  });
});

describe("Filter whitelist — unknown query params ignored", () => {
  it("ignores arbitrary filter keys in GET /api/products", async () => {
    await createProduct({ name: "Active One", isActive: true });
    await createProduct({ name: "Inactive One", isActive: false });

    // As anonymous (no admin), attacker tries to see inactive products
    const { default: request } = await import("supertest");
    const { default: app } = await import("../app.js");

    const res = await request(app).get("/api/products?isActive=false");
    expect(res.status).toBe(200);
    // Should only see the active one (base filter enforced for non-admins)
    expect(res.body.products.every((p) => p.isActive)).toBe(true);
  });
});
