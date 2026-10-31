import { NextRequest, NextResponse } from "next/server";
import { getGoogleOAuthConfig, getGoogleRedirectUri } from "@/lib/auth/google-config";
import { validateIntendedDestination } from "@/lib/auth/router";
import { validatePlanIntent, serializePlanIntent, PLAN_INTENT_COOKIE } from "@/lib/billing/plan-intent";
import crypto from "crypto";

export async function GET(request: NextRequest) {
  const { clientId } = getGoogleOAuthConfig();

  if (!clientId) {
    return NextResponse.redirect(
      new URL("/sign-in?error=Google+OAuth+is+not+configured.+Please+set+GOOGLE_CLIENT_ID+and+GOOGLE_CLIENT_SECRET+in+your+environment+variables.", request.url)
    );
  }

  const host = request.headers.get("x-forwarded-host") || request.headers.get("host") || request.nextUrl.host;
  const redirectUri = getGoogleRedirectUri(host);
  const state = crypto.randomBytes(16).toString("hex");

  const googleAuthUrl = new URL("https://accounts.google.com/o/oauth2/v2/auth");
  googleAuthUrl.searchParams.set("client_id", clientId);
  googleAuthUrl.searchParams.set("redirect_uri", redirectUri);
  googleAuthUrl.searchParams.set("response_type", "code");
  googleAuthUrl.searchParams.set("scope", "openid email profile");
  googleAuthUrl.searchParams.set("state", state);
  googleAuthUrl.searchParams.set("access_type", "offline");
  googleAuthUrl.searchParams.set("prompt", "select_account");

  const rawRedirect = request.nextUrl.searchParams.get("redirect");
  const intendedRedirect = validateIntendedDestination(rawRedirect);
  const intent = request.nextUrl.searchParams.get("intent") || "login"; // "login" | "signup"

  // Capture plan intent if passed
  const plan = request.nextUrl.searchParams.get("plan");
  const interval = request.nextUrl.searchParams.get("interval");
  const currency = request.nextUrl.searchParams.get("currency");
  const planIntent = validatePlanIntent(plan, interval, currency);

  const response = NextResponse.redirect(googleAuthUrl.toString());
  response.cookies.set("google_oauth_state", state, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 15,
  });

  // Store the user's intent (login vs signup) for the callback to read
  response.cookies.set("google_oauth_intent", intent, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 15,
  });

  if (planIntent) {
    response.cookies.set(PLAN_INTENT_COOKIE, serializePlanIntent(planIntent), {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
      maxAge: 7 * 24 * 60 * 60,
    });
  }

  if (intendedRedirect) {
    response.cookies.set("intended_redirect", intendedRedirect, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
      maxAge: 60 * 15,
    });
  }

  return response;
}
