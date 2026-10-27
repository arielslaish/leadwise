// Two layers of protection for the Anthropic budget:
//  1. per-IP daily limit (one visitor can't spam uploads)
//  2. global daily cap (even many IPs together can't drain credits)
// Uses Upstash Redis in production. Locally, falls back to in-memory counters.
// In production without Redis configured, it fails closed (blocks everything).

import { timingSafeEqual } from "node:crypto";
import { Ratelimit } from "@upstash/ratelimit";
import { Redis } from "@upstash/redis";
import { DAILY_UPLOADS_PER_IP } from "@/config/rubric";

const url = process.env.UPSTASH_REDIS_REST_URL ?? process.env.KV_REST_API_URL;
const token = process.env.UPSTASH_REDIS_REST_TOKEN ?? process.env.KV_REST_API_TOKEN;
const redis = url && token ? new Redis({ url, token }) : null;

type Limiter = { limit: (key: string) => Promise<{ success: boolean; reset: number }> };

function memoryLimiter(max: number): Limiter {
  const hits = new Map<string, { count: number; reset: number }>();
  return {
    async limit(key) {
      const now = Date.now();
      const entry = hits.get(key);
      if (!entry || entry.reset < now) {
        const reset = now + 24 * 60 * 60 * 1000;
        hits.set(key, { count: 1, reset });
        return { success: true, reset };
      }
      entry.count += 1;
      return { success: entry.count <= max, reset: entry.reset };
    },
  };
}

function makeLimiter(prefix: string, max: number): Limiter {
  if (redis) {
    return new Ratelimit({ redis, prefix, limiter: Ratelimit.fixedWindow(max, "1 d") });
  }
  return memoryLimiter(max);
}

export const limits = {
  scorePerIp: makeLimiter("le:score:ip", Number(process.env.DAILY_UPLOADS_PER_IP ?? DAILY_UPLOADS_PER_IP)),
  scoreGlobal: makeLimiter("le:score:global", Number(process.env.DAILY_UPLOADS_GLOBAL ?? 150)),
  capturePerIp: makeLimiter("le:capture:ip", 5),
};

export function clientIp(req: Request): string {
  // Vercel sets x-real-ip; x-forwarded-for is the fallback (first hop is the client).
  return (
    req.headers.get("x-real-ip") ??
    req.headers.get("x-forwarded-for")?.split(",")[0].trim() ??
    "unknown"
  );
}

// The site owner sets OWNER_KEY in Vercel and opens the site once with
// ?owner=<key>; the browser then sends it on every upload and skips both limits.
// The Anthropic console spend limit remains the hard backstop.
export function isOwner(req: Request): boolean {
  const expected = process.env.OWNER_KEY;
  const given = req.headers.get("x-owner-key");
  if (!expected || !given) return false;
  const a = Buffer.from(expected);
  const b = Buffer.from(given);
  return a.length === b.length && timingSafeEqual(a, b);
}

export type LimitResult = { ok: true } | { ok: false; status: number; error: string };

export async function checkScoreLimits(ip: string): Promise<LimitResult> {
  if (!redis && process.env.NODE_ENV === "production") {
    return { ok: false, status: 503, error: "Rate limiter not configured." };
  }
  const perIp = await limits.scorePerIp.limit(ip);
  if (!perIp.success) {
    return { ok: false, status: 429, error: "Daily limit reached for your network. Try again tomorrow." };
  }
  const global = await limits.scoreGlobal.limit("all");
  if (!global.success) {
    return { ok: false, status: 429, error: "The demo hit today's global limit. Try again tomorrow." };
  }
  return { ok: true };
}
