import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import crypto from "crypto";

// Match public routes
const PUBLIC_PATHS = [
  "/",
  "/pricing",
  "/features",
  "/about",
  "/contact",
  "/demo",
  "/integrations",
  "/security",
  "/docs",
  "/changelog",
  "/privacy",
  "/terms",
  "/book",
  "/sign-in",
  "/sign-up",
  "/login-success",
  "/auth-success",
  "/forgot-password",
  "/reset-password",
  "/verify-email",
  "/email-sent",
  "/email-verified",
  "/session-expired",
  "/account-locked",
  "/widget-frame",
  "/widget.js",
  "/api/health",
  // Auth API routes used before login (e.g. email availability check during sign-up,
  // session lookup for the client AuthProvider, and the logout endpoint)
  "/api/auth/check-email",
  "/api/auth/me",
  "/api/auth/logout",
];

// Pages that authenticated users should be redirected away from
const AUTH_PAGES = ["/sign-in", "/sign-up", "/forgot-password", "/reset-password"];

function isPublicRoute(pathname: string): boolean {
  // Always pass through: static assets, auth APIs, webhooks, widget, hosted booking, Next.js internals
  if (
    pathname.startsWith("/api/auth") ||
    pathname.startsWith("/api/webhooks") ||
    pathname.startsWith("/api/cron") ||
    pathname.startsWith("/api/voice") ||
    pathname.startsWith("/api/widget") ||
    pathname.startsWith("/widget-frame") ||
    pathname.startsWith("/widget.js") ||
    pathname.startsWith("/book") ||
    pathname.startsWith("/api/book") ||
    pathname.startsWith("/_next") ||
    pathname.includes(".")
  ) {
    return true;
  }

  return PUBLIC_PATHS.some((path) => {
    if (path === "/") {
      return pathname === "/";
    }
    return pathname === path || pathname.startsWith(path + "/");
  });
}

function isAuthPage(pathname: string): boolean {
  return AUTH_PAGES.some(
    (route) => pathname === route || pathname.startsWith(route + "/")
  );
}

/**
 * Edge-level route protection & telemetry correlation (Next.js 16 proxy convention).
 */
export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const sessionToken = request.cookies.get("session_token")?.value;
  const requestId = request.headers.get("x-request-id") || `req_${crypto.randomUUID().slice(0, 12)}`;

  // ── Public routes ────────────────────────────────────────────────────
  if (isPublicRoute(pathname)) {
    // If arriving at sign-in with logout intent, delete session cookies immediately
    if (pathname === "/sign-in" && request.nextUrl.searchParams.get("logout") === "true") {
      const response = NextResponse.next();
      response.cookies.delete("session_token");
      response.cookies.delete("refresh_token");
      response.cookies.delete("active_org_id");
      response.headers.set("x-request-id", requestId);
      return response;
    }

    if (pathname.startsWith("/api/widget") || pathname.startsWith("/widget-frame") || pathname.startsWith("/widget.js")) {
      if (request.method === "OPTIONS") {
        return new NextResponse(null, {
          status: 204,
          headers: {
            "Access-Control-Allow-Origin": "*",
            "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
            "Access-Control-Allow-Headers": "Content-Type, Authorization, x-request-id",
            "x-request-id": requestId,
          },
        });
      }
      const response = NextResponse.next();
      response.headers.set("Access-Control-Allow-Origin", "*");
      response.headers.set("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
      response.headers.set("Access-Control-Allow-Headers", "Content-Type, Authorization, x-request-id");
      response.headers.set("x-request-id", requestId);
      return response;
    }

    const publicReqHeaders = new Headers(request.headers);
    publicReqHeaders.set("x-pathname", pathname);
    publicReqHeaders.set("x-request-id", requestId);
    const response = NextResponse.next({
      request: {
        headers: publicReqHeaders,
      },
    });
    response.headers.set("x-request-id", requestId);
    return response;
  }

  // ── Protected routes ─────────────────────────────────────────────────
  if (!sessionToken) {
    if (pathname.startsWith("/api/")) {
      return NextResponse.json(
        { error: "Unauthorized" },
        {
          status: 401,
          headers: { "x-request-id": requestId },
        }
      );
    }
    const signInUrl = new URL("/sign-in", request.url);
    // Remember the page they tried to access
    if (pathname !== "/dashboard") {
      signInUrl.searchParams.set("redirect", pathname);
    }
    const redirectRes = NextResponse.redirect(signInUrl);
    redirectRes.headers.set("x-request-id", requestId);
    return redirectRes;
  }

  const requestHeaders = new Headers(request.headers);
  requestHeaders.set("x-pathname", pathname);
  requestHeaders.set("x-request-id", requestId);

  const response = NextResponse.next({
    request: {
      headers: requestHeaders,
    },
  });
  response.headers.set("x-request-id", requestId);
  return response;
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico, sitemap.xml, robots.txt (metadata files)
     */
    "/((?!_next/static|_next/image|favicon.ico|sitemap.xml|robots.txt).*)",
  ],
};
