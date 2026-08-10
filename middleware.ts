import { auth } from "@/auth";
import { NextResponse } from "next/server";
import { NextRequest } from "next/server";

// Simple in-memory rate limiter
const limiter = new Map<string, { count: number; resetAt: number }>();

function rateLimitCheck(request: NextRequest): NextResponse | null {
  const { pathname } = request.nextUrl;

  // Only apply to public booking/availability APIs
  if (pathname.startsWith("/api/bookings") || pathname.startsWith("/api/availability")) {
    const ip = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || 
               request.headers.get("x-real-ip") || 
               "anonymous";
    const now = Date.now();
    const windowMs = 60 * 1000; // 1 minute window
    const maxRequests = 30; // 30 requests per minute

    const record = limiter.get(ip) || { count: 0, resetAt: now + windowMs };

    if (now > record.resetAt) {
      record.count = 1;
      record.resetAt = now + windowMs;
    } else {
      record.count += 1;
    }

    limiter.set(ip, record);

    if (record.count > maxRequests) {
      return NextResponse.json(
        { success: false, message: "Terlalu banyak request. Coba lagi nanti." },
        { status: 429 }
      );
    }
  }

  return null;
}

export default auth((req) => {
  // Apply rate limiting first
  const rateLimitResponse = rateLimitCheck(req);
  if (rateLimitResponse) return rateLimitResponse;

  const isLoggedIn = !!req.auth;
  const isOnAdmin = req.nextUrl.pathname.startsWith("/admin");
  const isOnLogin = req.nextUrl.pathname === "/login";

  if (isOnAdmin) {
    if (!isLoggedIn) {
      return NextResponse.redirect(new URL("/login", req.nextUrl));
    }
    if (req.auth?.user?.role !== "ADMIN") {
      return NextResponse.redirect(new URL("/", req.nextUrl));
    }
  }

  if (isOnLogin && isLoggedIn) {
    return NextResponse.redirect(new URL("/admin/dashboard", req.nextUrl));
  }

  return NextResponse.next();
});

export const config = {
  matcher: ["/admin/:path*", "/login", "/api/:path*"],
};