import rateLimit from "express-rate-limit";
import { RedisStore } from "rate-limit-redis";
import { getRedisClient, isRedisReady } from "../config/redis.js";
import logger from "../utils/logger.js";

// Cache the Redis store per-prefix once created, so we don't rebuild on every request.
const storeCache = new Map();

/**
 * Resolve a store at request time (not module-load time). If Redis is ready
 * we return a RedisStore; otherwise we return undefined, which makes
 * express-rate-limit use its default in-memory store for that request.
 */
const resolveStore = (prefix) => {
  if (storeCache.has(prefix)) return storeCache.get(prefix);

  const client = getRedisClient();
  if (!client || !isRedisReady()) return undefined;

  const store = new RedisStore({
    sendCommand: (...args) => client.sendCommand(args),
    prefix: `rl:${prefix}:`,
  });
  storeCache.set(prefix, store);
  logger.info({ prefix }, "Rate limiter using Redis store");
  return store;
};

/**
 * express-rate-limit v7 accepts a custom Store. We wrap RedisStore in a proxy
 * that resolves on first use — this handles the case where Redis isn't ready
 * at module-load time but becomes ready before the first request.
 */
const lazyStore = (prefix) => ({
  init(options) {
    this._options = options;
    const inner = resolveStore(prefix);
    if (inner) inner.init(options);
    this._inner = inner;
  },
  async increment(key) {
    if (!this._inner) {
      this._inner = resolveStore(prefix);
      if (this._inner) this._inner.init(this._options);
    }
    if (this._inner) return this._inner.increment(key);
    // Fallback: act as a no-op counter (won't block but won't count either).
    // This only happens if Redis never connects.
    return { totalHits: 1, resetTime: new Date(Date.now() + 60_000) };
  },
  async decrement(key) {
    if (this._inner) return this._inner.decrement(key);
  },
  async resetKey(key) {
    if (this._inner) return this._inner.resetKey(key);
  },
});

const limiter = (opts, prefix) =>
  rateLimit({
    standardHeaders: true,
    legacyHeaders: false,
    // Disable noisy validation warnings in tests — supertest's Unix socket
    // trips the ERR_ERL_DOUBLE_COUNT check falsely.
    validate: process.env.NODE_ENV === "test" ? false : true,
    ...opts,
    store: lazyStore(prefix),
  });

// --- Limiters ---

export const apiLimiter = limiter(
  {
    windowMs: Number(process.env.RATE_LIMIT_WINDOW_MS) || 15 * 60 * 1000,
    max: Number(process.env.RATE_LIMIT_MAX) || 200,
    message: {
      success: false,
      message: "Too many requests, please try again later",
    },
  },
  "api",
);

export const authLimiter = limiter(
  {
    windowMs: 15 * 60 * 1000,
    max: Number(process.env.AUTH_RATE_LIMIT_MAX) || 10,
    skipSuccessfulRequests: true,
    message: {
      success: false,
      message: "Too many login attempts, please wait 15 minutes",
    },
  },
  "auth",
);

export const passwordLimiter = limiter(
  {
    windowMs: 60 * 60 * 1000,
    max: 5,
    message: {
      success: false,
      message: "Too many password reset requests, try again in an hour",
    },
  },
  "password",
);

// Startup warning if Redis isn't wired up at all
if (!process.env.REDIS_URL) {
  logger.warn(
    "Rate limiters initialized WITHOUT Redis — set REDIS_URL for production",
  );
}
