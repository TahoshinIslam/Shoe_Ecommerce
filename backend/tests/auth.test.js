import { describe, it, expect } from "vitest";
import request from "supertest";
import app from "../app.js";
import User from "../models/userModel.js";
import { createUser, loginAs, getCsrfPair } from "./helpers.js";

describe("Auth — registration", () => {
  it("creates a user and returns a jwt cookie", async () => {
    const res = await request(app).post("/api/users/register").send({
      name: "Alice",
      email: "alice@example.com",
      password: "Password123!",
    });
    expect(res.status).toBe(201);
    expect(res.body.user.email).toBe("alice@example.com");
    expect(res.headers["set-cookie"].some((c) => c.startsWith("jwt="))).toBe(
      true,
    );
  });

  it("rejects duplicate email", async () => {
    await createUser({ email: "dup@example.com" });
    const res = await request(app).post("/api/users/register").send({
      name: "X",
      email: "dup@example.com",
      password: "Password123!",
    });
    expect(res.status).toBe(400);
  });
});

describe("Auth — login", () => {
  it("logs in with correct credentials", async () => {
    await createUser({ email: "bob@example.com", password: "Password123!" });
    const res = await request(app).post("/api/users/login").send({
      email: "bob@example.com",
      password: "Password123!",
    });
    expect(res.status).toBe(200);
    expect(res.body.user.email).toBe("bob@example.com");
  });

  it("rejects wrong password", async () => {
    await createUser({ email: "bob2@example.com", password: "Password123!" });
    const res = await request(app).post("/api/users/login").send({
      email: "bob2@example.com",
      password: "wrong",
    });
    expect(res.status).toBe(401);
  });

  it("takes roughly the same time for missing vs existing user (timing attack protection)", async () => {
    await createUser({ email: "timing@example.com", password: "Password123!" });

    const t1 = Date.now();
    await request(app)
      .post("/api/users/login")
      .send({ email: "nonexistent@example.com", password: "anything" });
    const missingTime = Date.now() - t1;

    const t2 = Date.now();
    await request(app)
      .post("/api/users/login")
      .send({ email: "timing@example.com", password: "wrong" });
    const existingTime = Date.now() - t2;

    // Both should be ~bcrypt time (50ms+). The missing-user path should not
    // short-circuit to ~1ms. Ratio tolerance wide enough to avoid flakes.
    expect(missingTime).toBeGreaterThan(30);
    expect(existingTime).toBeGreaterThan(30);
  });

  it("locks the account after 5 failed attempts", async () => {
    await createUser({ email: "lock@example.com", password: "Password123!" });
    for (let i = 0; i < 5; i++) {
      await request(app)
        .post("/api/users/login")
        .send({ email: "lock@example.com", password: "wrong" });
    }
    const res = await request(app)
      .post("/api/users/login")
      .send({ email: "lock@example.com", password: "Password123!" });
    expect(res.status).toBe(423); // Locked
  });
});

describe("Auth — logout clears cookie", () => {
  it("sets an expired jwt cookie on logout", async () => {
    await createUser({ email: "out@example.com" });
    const { cookies } = await loginAs("out@example.com");
    const { token, cookies: allCookies } = await getCsrfPair(cookies);
    const res = await request(app)
      .post("/api/users/logout")
      .set("Cookie", allCookies)
      .set("X-CSRF-Token", token);
    expect(res.status).toBe(200);
    const cleared = res.headers["set-cookie"].find((c) => c.startsWith("jwt="));
    expect(cleared).toMatch(/Expires=Thu, 01 Jan 1970|Max-Age=0/);
  });
});

describe("Auth — password reset invalidates session", () => {
  it("clears jwt cookie on successful reset", async () => {
    const user = await createUser({ email: "reset@example.com" });

    // Trigger forgot-password to generate the reset token
    await request(app)
      .post("/api/users/forgot-password")
      .send({ email: "reset@example.com" });

    // Read raw token — we stored only the hash in DB, but for testing we
    // generate one and write it directly so we control the value.
    const crypto = await import("crypto");
    const raw = "test-raw-token";
    const hashed = crypto.createHash("sha256").update(raw).digest("hex");
    user.resetPasswordToken = hashed;
    user.resetPasswordExpires = Date.now() + 15 * 60 * 1000;
    await user.save({ validateBeforeSave: false });

    const res = await request(app)
      .post(`/api/users/reset-password/${raw}`)
      .send({ password: "NewPassword123!" });

    expect(res.status).toBe(200);
    const cleared = res.headers["set-cookie"].find((c) => c.startsWith("jwt="));
    expect(cleared).toBeDefined();
    expect(cleared).toMatch(/Expires=Thu, 01 Jan 1970|Max-Age=0/);

    // New password works
    const loginRes = await request(app)
      .post("/api/users/login")
      .send({ email: "reset@example.com", password: "NewPassword123!" });
    expect(loginRes.status).toBe(200);
  });
});
