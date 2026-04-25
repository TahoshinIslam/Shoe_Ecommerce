import dotenv from "dotenv";
dotenv.config();

// Sentry must init BEFORE app import for best stack traces
import * as Sentry from "@sentry/node";
if (process.env.SENTRY_DSN) {
  Sentry.init({
    dsn: process.env.SENTRY_DSN,
    environment: process.env.NODE_ENV || "development",
    tracesSampleRate: 0.1,
  });
}

import connectDB from "./config/db.js";
import { connectRedis } from "./config/redis.js";
import logger from "./utils/logger.js";

// Connect infra BEFORE importing the app (so rate limiter finds Redis on first use)
await connectDB();
await connectRedis();

const { default: app } = await import("./app.js");

const port = process.env.PORT || 5001;

process.on("unhandledRejection", (reason) => {
  logger.fatal({ reason }, "Unhandled promise rejection");
});
process.on("uncaughtException", (err) => {
  logger.fatal({ err }, "Uncaught exception");
  setTimeout(() => process.exit(1), 1000);
});

app.listen(port, () =>
  logger.info(
    `🚀 Server running in ${process.env.NODE_ENV || "development"} mode on port ${port}`,
  ),
);
