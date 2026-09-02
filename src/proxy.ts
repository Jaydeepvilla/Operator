import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

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
  // Always pass through: static assets, auth APIs, webhooks, widget, Next.js internals
  if (
    pathname.startsWith("/api/auth") ||
    pathname.startsWith("/api/webhooks") ||
    pathname.startsWith("/api/widget") ||
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
 * Edge-level route protection (Next.js 16 proxy convention).
 *
 * Named export required — Next.js 16 renamed middleware → proxy and
 * expects `export function proxy` (or `export default`).
 */
export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const sessionToken = request.cookies.get("session_token")?.value;
  const hasSession = !!sessionToken;

  // ── Public routes ────────────────────────────────────────────────────
  if (isPublicRoute(pathname)) {
    // Authenticated users visiting auth pages → redirect to dashboard
    // (dashboard layout will further redirect to /onboarding if needed)
    if (hasSession && isAuthPage(pathname)) {
      return NextResponse.redirect(new URL("/dashboard", request.url));
    }
    return NextResponse.next();
  }

  // ── Protected routes ─────────────────────────────────────────────────
  if (!sessionToken) {
    const signInUrl = new URL("/sign-in", request.url);
    // Remember the page they tried to access
    if (pathname !== "/dashboard") {
      signInUrl.searchParams.set("redirect", pathname);
    }
    return NextResponse.redirect(signInUrl);
  }

  return NextResponse.next();
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
