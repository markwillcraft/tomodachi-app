import { NextResponse } from "next/server";
import { Ratelimit } from "@upstash/ratelimit";
import { Redis } from "@upstash/redis";

// =====================================================================
// Rate limiting
// ---------------------------------------------------------------------
// Per-route, per-user (or per-IP for anonymous endpoints) rate limits
// backed by Upstash Redis. The library uses sliding-window counters that
// are accurate across serverless function invocations.
//
// **Graceful degradation**: if Upstash env vars are not set,
// `rateLimit()` returns `{ success: true, configured: false }` so the
// app keeps working in local dev without forcing every contributor to
// provision Redis. In production, missing env vars effectively disable
// the limiter — log it loudly with `assertRateLimitConfigured()` on
// boot if you care.
//
// **Categories** (request shape × cost):
// - `ai`         — LLM-backed endpoints. Strictest. Bills are real.
// - `write`      — DB writes. Protects Postgres + idempotency tables.
// - `view`       — High-volume study writes (kana/kanji/card views).
//                  Users tap fast, so the limit is generous but capped.
// - `read`       — Reads. Generous; protects against scraping.
// - `sensitive`  — Auth-adjacent / enumeration-prone (e.g. displayName
//                  availability checks). Slow window.
//
// Tweak the per-category numbers below as you observe real traffic.
// =====================================================================

export type RateLimitCategory =
  | "ai"
  | "write"
  | "view"
  | "read"
  | "sensitive";

// Limits chosen so a fast but real human stays under, while a script
// hammering the endpoint hits the wall within seconds.
const LIMITS: Record<
  RateLimitCategory,
  { tokens: number; window: `${number} ${"s" | "m" | "h" | "d"}` }
> = {
  ai: { tokens: 5, window: "1 m" },
  write: { tokens: 30, window: "1 m" },
  view: { tokens: 120, window: "1 m" },
  read: { tokens: 120, window: "1 m" },
  sensitive: { tokens: 10, window: "10 m" },
};

let cachedRedis: Redis | null = null;
let redisLookupAttempted = false;

function getRedis(): Redis | null {
  if (redisLookupAttempted) return cachedRedis;
  redisLookupAttempted = true;
  const url = process.env.UPSTASH_REDIS_REST_URL;
  const token = process.env.UPSTASH_REDIS_REST_TOKEN;
  if (!url || !token) {
    if (process.env.NODE_ENV === "production") {
      console.warn(
        "[rate-limit] UPSTASH_REDIS_REST_URL / TOKEN not set — rate limiting is DISABLED. " +
          "Set them in your Vercel env to protect your endpoints.",
      );
    }
    return null;
  }
  cachedRedis = new Redis({ url, token });
  return cachedRedis;
}

const limiterCache = new Map<RateLimitCategory, Ratelimit>();

function getLimiter(category: RateLimitCategory): Ratelimit | null {
  const cached = limiterCache.get(category);
  if (cached) return cached;
  const redis = getRedis();
  if (!redis) return null;
  const { tokens, window } = LIMITS[category];
  const limiter = new Ratelimit({
    redis,
    limiter: Ratelimit.slidingWindow(tokens, window),
    analytics: false,
    prefix: `tomodachi:rl:${category}`,
  });
  limiterCache.set(category, limiter);
  return limiter;
}

export type RateLimitResult = {
  success: boolean;
  limit: number;
  remaining: number;
  reset: number; // epoch ms
  configured: boolean;
};

/**
 * Check the rate limit for the given category + identifier.
 * - `identifier` should be the Clerk userId for authed routes, or the
 *   client IP for anonymous routes.
 * - Returns `{ success: true, configured: false }` when Upstash isn't
 *   configured so dev / preview environments stay usable.
 */
export async function rateLimit(
  category: RateLimitCategory,
  identifier: string,
): Promise<RateLimitResult> {
  const limiter = getLimiter(category);
  if (!limiter) {
    return {
      success: true,
      limit: LIMITS[category].tokens,
      remaining: LIMITS[category].tokens,
      reset: Date.now(),
      configured: false,
    };
  }
  try {
    const r = await limiter.limit(identifier);
    return {
      success: r.success,
      limit: r.limit,
      remaining: r.remaining,
      reset: r.reset,
      configured: true,
    };
  } catch (err) {
    // Upstash unreachable — fail open so a Redis blip doesn't 503 the
    // whole app. Log it so it's visible in observability.
    console.error("[rate-limit] limiter error, failing open:", err);
    return {
      success: true,
      limit: LIMITS[category].tokens,
      remaining: LIMITS[category].tokens,
      reset: Date.now(),
      configured: true,
    };
  }
}

/**
 * Build a 429 response from a failed rate-limit check. Includes the
 * standard `Retry-After` header (seconds) plus the optional
 * `X-RateLimit-*` informational headers many clients expect.
 */
export function rateLimitResponse(result: RateLimitResult): NextResponse {
  const retryAfterSec = Math.max(
    1,
    Math.ceil((result.reset - Date.now()) / 1000),
  );
  return NextResponse.json(
    {
      error: "Too many requests. Please slow down.",
      retryAfter: retryAfterSec,
      resetAt: result.reset,
    },
    {
      status: 429,
      headers: {
        "Retry-After": String(retryAfterSec),
        "X-RateLimit-Limit": String(result.limit),
        "X-RateLimit-Remaining": String(result.remaining),
        "X-RateLimit-Reset": String(result.reset),
      },
    },
  );
}

/**
 * Convenience wrapper that combines `rateLimit()` + `rateLimitResponse()`.
 * Returns a 429 NextResponse on miss, otherwise null. Use as:
 *
 *   const limited = await enforceRateLimit("write", userId);
 *   if (limited) return limited;
 */
export async function enforceRateLimit(
  category: RateLimitCategory,
  identifier: string,
): Promise<NextResponse | null> {
  const r = await rateLimit(category, identifier);
  if (!r.success) return rateLimitResponse(r);
  return null;
}
