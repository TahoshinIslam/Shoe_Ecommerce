import express from "express";
import dotenv from "dotenv";
dotenv.config();

import cors from "cors";
import helmet from "helmet";
import morgan from "morgan";
import cookieParser from "cookie-parser";
import mongoSanitize from "express-mongo-sanitize";
import hpp from "hpp";
import xss from "xss-clean";
import path from "path";
import { fileURLToPath } from "url";

import connectDB from "./config/db.js";
import { apiLimiter } from "./middleware/rateLimiter.js";
import { notFound, errorHandler } from "./middleware/errorMiddleware.js";

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

// Stripe webhook uses raw body — import raw handler
import { stripeWebhook } from "./controllers/paymentController.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const port = process.env.PORT || 5001;

// --- DB ---
connectDB();

// --- trust proxy (needed for rate-limit behind Nginx/Heroku/Vercel) ---
app.set("trust proxy", 1);

// --- Security headers ---
app.use(
  helmet({
    crossOriginResourcePolicy: { policy: "cross-origin" },
  }),
);

// --- CORS (allowlist for cookie-based auth) ---
const allowedOrigins = (process.env.CLIENT_URL || "http://localhost:3000")
  .split(",")
  .map((o) => o.trim());
app.use(
  cors({
    origin: (origin, cb) => {
      if (!origin || allowedOrigins.includes(origin)) return cb(null, true);
      return cb(new Error("CORS blocked for origin: " + origin));
    },
    credentials: true,
  }),
);

// --- Stripe webhook route MUST come before express.json() (raw body required) ---
app.post(
  "/api/payments/stripe/webhook",
  express.raw({ type: "application/json" }),
  stripeWebhook,
);

// --- Body parsers ---
app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ extended: true, limit: "10mb" }));
app.use(cookieParser());

// --- Sanitize inputs ---
app.use(mongoSanitize());
app.use(xss());
app.use(hpp());

// --- Logging ---
if (process.env.NODE_ENV === "development") app.use(morgan("dev"));

// --- Global rate limiter ---
app.use("/api", apiLimiter);

// --- Static uploads (served from /uploads) ---
app.use("/uploads", express.static(path.join(__dirname, "..", "uploads")));

// --- Health check ---
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

// --- 404 + error handler ---
app.use(notFound);
app.use(errorHandler);

app.listen(port, () =>
  console.log(
    `🚀 Server running in ${process.env.NODE_ENV || "development"} mode on port ${port}`,
  ),
);