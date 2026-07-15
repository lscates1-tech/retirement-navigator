import { Redis } from '@upstash/redis';

const SEARCH_LIMIT = 10;
const SEARCH_WINDOW_SECONDS = 60 * 60; // 1 hour

const SESSION_LIMIT = 30;
const SESSION_WINDOW_SECONDS = 60 * 60 * 24; // 1 day

/**
 * Vercel's "Vercel KV" product is deprecated; new projects provision Redis
 * via a Marketplace integration (Upstash Redis is the default option)
 * instead. Depending on how you connect it, Vercel injects either the
 * legacy KV_REST_API_* names (for backward compatibility) or Upstash's own
 * UPSTASH_REDIS_REST_* names — this checks both so setup works either way.
 * Check your Vercel project's env vars after connecting to confirm which
 * pair actually landed.
 */
function getRedisConfig() {
  const url = process.env.KV_REST_API_URL ?? process.env.UPSTASH_REDIS_REST_URL;
  const token = process.env.KV_REST_API_TOKEN ?? process.env.UPSTASH_REDIS_REST_TOKEN;
  if (!url || !token) return null;
  return { url, token };
}

let redisClient = null;
function getRedis() {
  if (!redisClient) {
    const config = getRedisConfig();
    if (!config) {
      throw new Error('Redis is not configured — call kvConfigured() first.');
    }
    redisClient = new Redis(config);
  }
  return redisClient;
}

function kvConfigured() {
  return getRedisConfig() !== null;
}

async function checkAndIncrement(key, limit, windowSeconds) {
  const redis = getRedis();
  const count = await redis.incr(key);
  if (count === 1) {
    // First hit in this window — set the expiry.
    await redis.expire(key, windowSeconds);
  }
  if (count > limit) {
    const ttl = await redis.ttl(key);
    return { allowed: false, retryAfterSeconds: ttl > 0 ? ttl : windowSeconds };
  }
  return { allowed: true, retryAfterSeconds: 0 };
}

/**
 * IMPORTANT: until a Redis URL/token pair is set (i.e. before you've
 * connected a Marketplace Redis integration), this deliberately fails OPEN
 * — it logs a warning and allows the request through — so the feature works
 * end-to-end before that piece is wired up. Do not leave this failing open
 * once real traffic arrives; flip FAIL_CLOSED_WITHOUT_KV to true once
 * Redis is connected and confirmed working.
 */
const FAIL_CLOSED_WITHOUT_KV = false;

/**
 * Checks both the per-hour search limit and the per-day session-creation
 * limit for a given hashed IP. Call this once per incoming recommendation
 * request, before doing any matching or calling the model.
 */
export async function checkRateLimit(ipHash) {
  if (!kvConfigured()) {
    if (FAIL_CLOSED_WITHOUT_KV) {
      return { allowed: false, reason: 'search_limit', retryAfterSeconds: SEARCH_WINDOW_SECONDS };
    }
    console.warn(
      '[rateLimit] Redis not configured — rate limiting is disabled. Connect a Redis integration (see README) before going live.'
    );
    return { allowed: true };
  }

  const sessionCheck = await checkAndIncrement(
    `ratelimit:session:${ipHash}`,
    SESSION_LIMIT,
    SESSION_WINDOW_SECONDS
  );
  if (!sessionCheck.allowed) {
    return { allowed: false, reason: 'session_limit', retryAfterSeconds: sessionCheck.retryAfterSeconds };
  }

  const searchCheck = await checkAndIncrement(
    `ratelimit:search:${ipHash}`,
    SEARCH_LIMIT,
    SEARCH_WINDOW_SECONDS
  );
  if (!searchCheck.allowed) {
    return { allowed: false, reason: 'search_limit', retryAfterSeconds: searchCheck.retryAfterSeconds };
  }

  return { allowed: true };
}
