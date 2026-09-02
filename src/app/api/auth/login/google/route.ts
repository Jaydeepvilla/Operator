import { NextRequest, NextResponse } from "next/server";
import { getGoogleOAuthConfig } from "@/lib/auth/google-config";
import crypto from "crypto";

export async function GET(request: NextRequest) {
  const { clientId } = getGoogleOAuthConfig();

  if (!clientId) {
    return NextResponse.redirect(
      new URL("/sign-in?error=Google+OAuth+is+not+configured.+Please+set+GOOGLE_CLIENT_ID+and+GOOGLE_CLIENT_SECRET+in+your+environment+variables.", request.url)
    );
  }

  const origin = request.nextUrl.origin;
  const redirectUri = `${origin}/api/auth/callback/google`;
  const state = crypto.randomBytes(16).toString("hex");

  const googleAuthUrl = new URL("https://accounts.google.com/o/oauth2/v2/auth");
  googleAuthUrl.searchParams.set("client_id", clientId);
  googleAuthUrl.searchParams.set("redirect_uri", redirectUri);
  googleAuthUrl.searchParams.set("response_type", "code");
  googleAuthUrl.searchParams.set("scope", "openid email profile");
  googleAuthUrl.searchParams.set("state", state);
  googleAuthUrl.searchParams.set("access_type", "offline");
  googleAuthUrl.searchParams.set("prompt", "select_account");

  const response = NextResponse.redirect(googleAuthUrl.toString());
  response.cookies.set("google_oauth_state", state, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 10, // 10 minutes
  });

  return response;
}
