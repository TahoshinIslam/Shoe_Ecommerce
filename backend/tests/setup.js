import { beforeAll, beforeEach, afterAll, afterEach, vi } from "vitest";
import mongoose from "mongoose";
import dotenv from "dotenv";
import Settings from "../models/settingsModel.js";

dotenv.config();

// Safety: never run tests against a prod-looking URI
const mongoUri = process.env.MONGO_URI_TEST;
if (!mongoUri) {
  throw new Error("MONGO_URI_TEST is required to run tests");
}
if (!/test/i.test(mongoUri)) {
  throw new Error(
    "MONGO_URI_TEST must contain the word 'test' to prevent accidental data loss",
  );
}

// Force required env vars for tests (without clobbering real ones if present)
process.env.NODE_ENV = "test";
process.env.JWT_SECRET =
  process.env.JWT_SECRET || "test-jwt-secret-not-for-prod";
process.env.CSRF_SECRET =
  process.env.CSRF_SECRET ||
  "test-csrf-secret-not-for-prod-64-chars-minimum-padding-xxxxxxxxxxxxx";
process.env.CLIENT_URL = process.env.CLIENT_URL || "http://localhost:3001";
process.env.STRIPE_WEBHOOK_SECRET =
  process.env.STRIPE_WEBHOOK_SECRET || "whsec_test_fake";
process.env.STRIPE_SECRET_KEY = process.env.STRIPE_SECRET_KEY || "sk_test_fake";
// Keep logs quiet during tests
process.env.LOG_LEVEL = process.env.LOG_LEVEL || "silent";

// Mock external services globally. Individual tests can override.
vi.mock("../utils/sendEmail.js", async () => {
  return {
    sendEmail: vi.fn().mockResolvedValue({ messageId: "test" }),
    buildVerificationEmail: vi.fn(() => ({ subject: "", html: "", text: "" })),
    buildPasswordResetEmail: vi.fn(() => ({ subject: "", html: "", text: "" })),
  };
});

vi.mock("../services/stripeService.js", async () => {
  return {
    getStripe: vi.fn(),
    createCheckoutSession: vi.fn(async ({ order }) => ({
      id: "cs_test_" + order._id,
      url: "https://stripe.test/checkout/" + order._id,
    })),
    // Only "valid" passes. Anything else throws. Keeps the test explicit.
    constructWebhookEvent: vi.fn((rawBody, sig) => {
      // Tests pass "invalid" explicitly when they want signature rejection.
      // Anything else (or missing) → accept. Real verification happens in prod.
      if (String(sig) === "invalid") {
        throw new Error("Invalid signature");
      }
      const body = Buffer.isBuffer(rawBody)
        ? rawBody.toString()
        : String(rawBody);
      return JSON.parse(body);
    }),
  };
});

vi.mock("../services/bkashService.js", async () => ({
  bkashCreatePayment: vi.fn(async () => ({
    bkashURL: "https://bkash.test/pay",
    paymentID: "TRX_TEST",
    statusMessage: "Success",
  })),
  bkashExecutePayment: vi.fn(async () => ({
    statusCode: "0000",
    transactionStatus: "Completed",
    trxID: "TRX_TEST",
    amount: "100",
  })),
  bkashQueryPayment: vi.fn(async () => ({
    statusCode: "0000",
    transactionStatus: "Completed",
  })),
}));

vi.mock("../services/nagadService.js", async () => ({
  nagadInitialize: vi.fn(async () => ({
    raw: {},
    challenge: "c",
    dateTime: "t",
  })),
  nagadCompleteCheckout: vi.fn(async () => ({})),
  nagadVerify: vi.fn(async () => ({ status: "Success", amount: "100" })),
}));

// Disable Sentry during tests
process.env.SENTRY_DSN = "";

beforeAll(async () => {
  await mongoose.connect(mongoUri);
});

beforeEach(async () => {
  // Wipe all collections between tests so they're independent.
  const collections = mongoose.connection.collections;
  for (const key in collections) {
    await collections[key].deleteMany({});
  }

  // Seed test-friendly settings: 1:1 currency conversion and flat $10 shipping
  await Settings.create({
    _id: "main",
    currency: { defaultDisplay: "USD", usdToBdt: 1 },
    shippingZones: [
      {
        region: "BD",
        currency: "USD",
        tiers: [{ name: "Standard", baseCost: 10, freeAbove: 0 }],
      },
      {
        region: "INTL",
        currency: "USD",
        tiers: [{ name: "Standard", baseCost: 10, freeAbove: 0 }],
      },
    ],
    taxRules: [
      { region: "BD", label: "No tax", rate: 0, inclusive: false },
      { region: "INTL", label: "No tax", rate: 0, inclusive: false },
    ],
  });
});

afterEach(async () => {
  vi.clearAllMocks();
});

afterAll(async () => {
  await mongoose.connection.close();
});
