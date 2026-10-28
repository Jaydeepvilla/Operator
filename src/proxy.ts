import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import crypto from "crypto";
import { validateIntendedDestination } from "@/lib/auth/router";

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
  "/api/auth/check-email",
  "/api/auth/me",
  "/api/auth/logout",
  "/api/auth/refresh",
  "/api/auth/login/google",
  "/api/auth/callback/google",
];

// Pages that authenticated users should be redirected away from
const AUTH_PAGES = ["/sign-in", "/sign-up", "/forgot-password", "/reset-password"];

const STATIC_ASSET_REGEX = /\.(ico|png|jpg|jpeg|gif|svg|webp|css|js|map|woff|woff2|ttf|eot)$/i;

const PUBLIC_API_PREFIXES = [
  "/api/auth/login",
  "/api/auth/callback",
  "/api/auth/check-email",
  "/api/auth/logout",
  "/api/auth/refresh",
  "/api/auth/me",
  "/api/webhooks",
  "/api/cron",
  "/api/voice",
  "/api/widget",
  "/api/create-order",
  "/api/verify-payment",
  "/api/book",
];

function isPublicRoute(pathname: string): boolean {
  // Static assets and Next.js internals
  if (pathname.startsWith("/_next") || (!pathname.startsWith("/api/") && STATIC_ASSET_REGEX.test(pathname))) {
    return true;
  }

  // Public API endpoints
  if (PUBLIC_API_PREFIXES.some((prefix) => pathname.startsWith(prefix))) {
    return true;
  }

  // Standalone public routes
  if (
    pathname.startsWith("/checkout-demo") ||
    pathname.startsWith("/widget-frame") ||
    pathname.startsWith("/widget.js") ||
    pathname.startsWith("/book")
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

  // ── Method tampering protection ─────────────────────────────────────
  const DISALLOWED_METHODS = ["TRACE", "TRACK"];
  if (DISALLOWED_METHODS.includes(request.method)) {
    return new NextResponse("Method Not Allowed", { status: 405 });
  }

  // ── Oversized request payload protection (resource exhaustion defense) ─
  const contentLength = request.headers.get("content-length");
  if (contentLength) {
    const bytes = parseInt(contentLength, 10);
    const isUploadPath = pathname.includes("/upload") || pathname.includes("/media") || pathname.includes("/ingest");
    const maxLimit = isUploadPath ? 10 * 1024 * 1024 : 2 * 1024 * 1024;
    if (!isNaN(bytes) && bytes > maxLimit) {
      return NextResponse.json(
        { error: "Payload Too Large: Request exceeds maximum allowed size." },
        { status: 413, headers: { "x-request-id": requestId } }
      );
    }
  }

  // ── Privileged debug/diagnostic route protection in production ────────
  if (process.env.NODE_ENV === "production") {
    if (pathname.startsWith("/api/debug") || pathname === "/api/sentry-example-api") {
      return new NextResponse("Not Found", { status: 404 });
    }
  }

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
      const safeRedirect = validateIntendedDestination(pathname);
      if (safeRedirect) {
        signInUrl.searchParams.set("redirect", safeRedirect);
      }
    }
    const redirectRes = NextResponse.redirect(signInUrl);
    redirectRes.headers.set("x-request-id", requestId);
    return redirectRes;
  }

  // ── CSRF protection for mutating API requests using session cookies ────
  if (pathname.startsWith("/api/") && ["POST", "PUT", "DELETE", "PATCH"].includes(request.method)) {
    const origin = request.headers.get("origin");
    const host = request.headers.get("host");
    if (origin && host) {
      try {
        const originHost = new URL(origin).host;
        if (originHost !== host) {
          return NextResponse.json(
            { error: "Forbidden: Cross-site request forgery protection rejected this request." },
            { status: 403, headers: { "x-request-id": requestId } }
          );
        }
      } catch {
        return NextResponse.json(
          { error: "Forbidden: Invalid origin header." },
          { status: 403, headers: { "x-request-id": requestId } }
        );
      }
    }
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
  // Prevent cross-tenant data leakage via downstream proxy/browser caches
  response.headers.set("Cache-Control", "private, no-cache, no-store, max-age=0, must-revalidate");
  response.headers.set("Pragma", "no-cache");
  response.headers.set("Expires", "0");
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
