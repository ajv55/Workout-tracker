import "server-only";

import { Redis } from "@upstash/redis";
import { Ratelimit } from "@upstash/ratelimit";
import { isIP } from "node:net";

type Operation = "signin" | "register";

type LimitResult =
  | { status: "allowed" }
  | { status: "blocked"; retryAfter: number }
  | { status: "unavailable" };

let limiters: Record<Operation, Ratelimit> | undefined;

export function getRateLimitIdentifier(
  headers: Pick<Headers, "get">,
): string | null {
  if (process.env.VERCEL === "1") {
    const ip = headers.get("x-forwarded-for")?.trim();

    return ip && isIP(ip) ? ip : null;
  }

  // Local tests share one counter; ignore caller-supplied IP headers.
  if (process.env.NODE_ENV !== "production") {
    return "local-development";
  }

  return null;
}

function getLimiters() {
  if (limiters) {
    return limiters;
  }

  const redis = Redis.fromEnv();
  const environment =
    process.env.VERCEL_ENV ?? process.env.NODE_ENV ?? "development";

  limiters = {
    signin: new Ratelimit({
      redis,
      limiter: Ratelimit.slidingWindow(10, "15 m"),
      prefix: `workout-tracker:${environment}:signin`,
      timeout: 3000,
      analytics: false,
      ephemeralCache: false,
    }),
    register: new Ratelimit({
      redis,
      limiter: Ratelimit.slidingWindow(5, "15 m"),
      prefix: `workout-tracker:${environment}:register`,
      timeout: 3000,
      analytics: false,
      ephemeralCache: false,
    }),
  };

  return limiters;
}

export async function checkRateLimit(
  operation: Operation,
  identifier: string,
): Promise<LimitResult> {
  try {
    const result = await getLimiters()[operation].limit(identifier);

    if (result.reason === "timeout") {
      return { status: "unavailable" };
    }

    if (!result.success) {
      return {
        status: "blocked",
        retryAfter: Math.max(
          1,
          Math.ceil((result.reset - Date.now()) / 1000),
        ),
      };
    }

    return { status: "allowed" };
  } catch {
    console.error("Authentication rate limiter unavailable", { operation });
    return { status: "unavailable" };
  }
}