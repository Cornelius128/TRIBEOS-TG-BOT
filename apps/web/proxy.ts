import { auth } from "@/lib/auth";
import { NextResponse } from "next/server";
import { clientIp, rateLimit } from "@/lib/rate-limit";

// First matching prefix wins.
const API_LIMITS = [
  { prefix: "/api/auth/callback", limit: 10, windowMs: 60_000 },
  { prefix: "/api/groups/challenge", limit: 5, windowMs: 10 * 60_000 },
  { prefix: "/api/auth/record-fingerprint", limit: 10, windowMs: 60_000 },
  { prefix: "/api/health", limit: 60, windowMs: 60_000 },
  { prefix: "/api/", limit: 120, windowMs: 60_000 },
];

export const proxy = auth((req) => {
  const { nextUrl, auth: session } = req;

  if (nextUrl.pathname.startsWith("/api/")) {
    const rule = API_LIMITS.find((r) => nextUrl.pathname.startsWith(r.prefix))!;
    const result = rateLimit(`${rule.prefix}:${clientIp(req.headers)}`, rule.limit, rule.windowMs);
    if (!result.ok) {
      return NextResponse.json(
        { error: "Too many requests. Please slow down." },
        { status: 429, headers: { "Retry-After": String(result.retryAfterSeconds) } }
      );
    }
    return NextResponse.next();
  }

  const isLoggedIn = !!session?.user;
  const isDashboard = nextUrl.pathname.startsWith("/dashboard");

  if (isDashboard && !isLoggedIn) {
    const redirect = encodeURIComponent(nextUrl.pathname + nextUrl.search);
    return NextResponse.redirect(new URL(`/auth/telegram?redirect=${redirect}`, nextUrl));
  }

  return NextResponse.next();
});

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|.*\\..*).*)"],
};
