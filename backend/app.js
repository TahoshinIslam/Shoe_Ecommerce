import express from "express";
import * as Sentry from "@sentry/node";
import cors from "cors";
import helmet from "helmet";
import cookieParser from "cookie-parser";
import mongoSanitize from "express-mongo-sanitize";
import hpp from "hpp";
import path from "path";
import { fileURLToPath } from "url";

import { notFound, errorHandler } from "./middleware/errorMiddleware.js";
import requestLogger from "./middleware/requestLogger.js";
import { apiLimiter } from "./middleware/rateLimiter.js";
import {
  csrfProtection,
  csrfTokenHandler,
} from "./middleware/csrfMiddleware.js";

// --- eager model imports so mongoose has them all registered ---
import "./models/userModel.js";
import "./models/brandModel.js";
import "./models/categoryModel.js";
import "./models/productModel.js";
import "./models/orderModel.js";
import "./models/cartModel.js";
import "./models/wishlistModel.js";
import "./models/reviewModel.js";
import "./models/addressModel.js";
import "./models/couponModel.js";
import "./models/paymentModel.js";
import "./models/themeModel.js";
import "./models/settingsModel.js";
import "./models/notificationModel.js";

// --- route imports ---
import userRoutes from "./routes/userRoutes.js";
import productRoutes from "./routes/productRoutes.js";
import categoryRoutes from "./routes/categoryRoutes.js";
import brandRoutes from "./routes/brandRoutes.js";
import cartRoutes from "./routes/cartRoutes.js";
import wishlistRoutes from "./routes/wishlistRoutes.js";
import orderRoutes from "./routes/orderRoutes.js";
import reviewRoutes from "./routes/reviewRoutes.js";
import addressRoutes from "./routes/addressRoutes.js";
import couponRoutes from "./routes/couponRoutes.js";
import paymentRoutes from "./routes/paymentRoutes.js";
import themeRoutes from "./routes/themeRoutes.js";
import analyticsRoutes from "./routes/analyticsRoutes.js";
import uploadRoutes from "./routes/uploadRoutes.js";
import settingsRoutes from "./routes/settingsRoutes.js";
import notificationRoutes from "./routes/notificationRoutes.js";

import { stripeWebhook } from "./controllers/paymentController.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();

app.set("trust proxy", 1);

app.use(
  helmet({
    crossOriginResourcePolicy: { policy: "cross-origin" },
    contentSecurityPolicy: false,
  }),
);

const allowedOrigins = (
  process.env.CLIENT_URL || "http://localhost:3000,http://localhost:3001"
)
  .split(",")
  .map((o) => o.trim());
app.use(
  cors({
    origin: (origin, cb) => {
      if (!origin) return cb(null, true);
      if (allowedOrigins.includes(origin)) return cb(null, true);
      if (/^http:\/\/localhost:\d+$/.test(origin)) return cb(null, true);
      return cb(new Error("CORS blocked for origin: " + origin));
    },
    credentials: true,
  }),
);

// Stripe webhook (raw body) — MUST come before express.json()
app.post(
  "/api/payments/stripe/webhook",
  express.raw({ type: "application/json" }),
  stripeWebhook,
);

app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ extended: true, limit: "10mb" }));
app.use(cookieParser());

app.use(mongoSanitize({ replaceWith: "_" }));
app.use(hpp());

// Don't log requests during tests (too noisy)
if (process.env.NODE_ENV !== "test") {
  app.use(requestLogger);
}

app.use("/api", apiLimiter);

// CSRF protection — must come AFTER cookieParser and express.json
app.use(csrfProtection);
app.get("/api/csrf-token", csrfTokenHandler);

app.use("/uploads", express.static(path.join(__dirname, "..", "uploads")));

app.get("/api/health", (req, res) =>
  res.json({ status: "ok", uptime: process.uptime(), ts: Date.now() }),
);

// --- API routes ---
app.use("/api/users", userRoutes);
app.use("/api/products", productRoutes);
app.use("/api/categories", categoryRoutes);
app.use("/api/brands", brandRoutes);
app.use("/api/cart", cartRoutes);
app.use("/api/wishlist", wishlistRoutes);
app.use("/api/orders", orderRoutes);
app.use("/api/reviews", reviewRoutes);
app.use("/api/addresses", addressRoutes);
app.use("/api/coupons", couponRoutes);
app.use("/api/payments", paymentRoutes);
app.use("/api/theme", themeRoutes);
app.use("/api/analytics", analyticsRoutes);
app.use("/api/upload", uploadRoutes);
app.use("/api/settings", settingsRoutes);
app.use("/api/notifications", notificationRoutes);
app.use(notFound);

if (process.env.SENTRY_DSN && process.env.NODE_ENV !== "test") {
  Sentry.setupExpressErrorHandler(app);
}

app.use(errorHandler);

export default app;
