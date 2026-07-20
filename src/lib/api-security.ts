import { createClient } from "@supabase/supabase-js";
import { NextResponse } from "next/server.js";

type RateEntry = {
  count: number;
  resetAt: number;
};

type SecurityOptions = {
  bucket: string;
  limit: number;
  windowMs: number;
};

type SecurityResult =
  | { ok: true; userId: string; headers: Record<string, string> }
  | { ok: false; response: NextResponse };

const globalRateStore = globalThis as typeof globalThis & {
  playNextRateLimits?: Map<string, RateEntry>;
};

const rateStore = globalRateStore.playNextRateLimits ?? new Map<string, RateEntry>();
globalRateStore.playNextRateLimits = rateStore;

function jsonError(message: string, status: number, headers: Record<string, string> = {}) {
  return NextResponse.json({ error: message }, { status, headers });
}

function bearerToken(request: Request) {
  const authorization = request.headers.get("authorization") ?? "";
  const match = authorization.match(/^Bearer\s+([^\s]+)$/i);
  const token = match?.[1] ?? "";
  return token.length <= 4096 ? token : "";
}

function consumeRateLimit(key: string, limit: number, windowMs: number) {
  const now = Date.now();
  const current = rateStore.get(key);
  const entry = !current || current.resetAt <= now
    ? { count: 0, resetAt: now + windowMs }
    : current;

  entry.count += 1;
  rateStore.set(key, entry);

  // Prevent an indefinitely growing map in long-lived development/server processes.
  if (rateStore.size > 5_000) {
    for (const [storedKey, storedEntry] of rateStore) {
      if (storedEntry.resetAt <= now) rateStore.delete(storedKey);
    }
  }

  return {
    allowed: entry.count <= limit,
    remaining: Math.max(0, limit - entry.count),
    resetSeconds: Math.max(1, Math.ceil((entry.resetAt - now) / 1000)),
  };
}

export async function protectApi(
  request: Request,
  options: SecurityOptions
): Promise<SecurityResult> {
  const token = bearerToken(request);
  if (!token) {
    return { ok: false, response: jsonError("Authentication required.", 401) };
  }

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !anonKey) {
    console.error("Missing Supabase server authentication configuration.");
    return { ok: false, response: jsonError("Service configuration error.", 500) };
  }

  const client = createClient(url, anonKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const { data, error } = await client.auth.getUser(token);

  if (error || !data.user) {
    return { ok: false, response: jsonError("Your session is invalid or expired.", 401) };
  }

  const rate = consumeRateLimit(
    `${options.bucket}:${data.user.id}`,
    options.limit,
    options.windowMs
  );
  const headers = {
    "X-RateLimit-Limit": String(options.limit),
    "X-RateLimit-Remaining": String(rate.remaining),
    "X-RateLimit-Reset": String(rate.resetSeconds),
    "Cache-Control": "no-store",
  };

  if (!rate.allowed) {
    return {
      ok: false,
      response: jsonError("Too many requests. Please wait a moment and try again.", 429, {
        ...headers,
        "Retry-After": String(rate.resetSeconds),
      }),
    };
  }

  return { ok: true, userId: data.user.id, headers };
}
