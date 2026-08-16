import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import crypto from "crypto";

function getAppUrl(request: NextRequest): string {
  if (process.env.NEXT_PUBLIC_APP_URL) {
    return process.env.NEXT_PUBLIC_APP_URL.replace(/\/$/, "");
  }
  const proto = request.headers.get("x-forwarded-proto") || (request.nextUrl.protocol ? request.nextUrl.protocol.replace(":", "") : "http");
  const host = request.headers.get("x-forwarded-host") || request.headers.get("host") || request.nextUrl.host || "localhost:3000";
  return `${proto}://${host}`;
}

export async function GET(request: NextRequest) {
  try {
    const clientId = process.env.GOOGLE_CLIENT_ID;
    if (!clientId) {
      console.error("[OAuth] Missing GOOGLE_CLIENT_ID environment variable.");
      return NextResponse.json({ error: "Google OAuth is not configured on the server." }, { status: 500 });
    }

    const appUrl = getAppUrl(request);
    const redirectUri = `${appUrl}/api/auth/callback/google`;

    // 1. Generate a secure random CSRF token
    const state = crypto.randomBytes(32).toString("hex");

    // 2. Set state cookie for callback verification
    const cookieStore = await cookies();
    cookieStore.set("oauth_state", state, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: 600, // 10 minutes
      path: "/",
    });

    // 3. Construct OAuth URL
    const googleAuthUrl = `https://accounts.google.com/o/oauth2/v2/auth?client_id=${encodeURIComponent(
      clientId
    )}&redirect_uri=${encodeURIComponent(
      redirectUri
    )}&response_type=code&scope=openid%20email%20profile&state=${encodeURIComponent(
      state
    )}&access_type=offline&prompt=consent`;

    return NextResponse.redirect(googleAuthUrl);
  } catch (error) {
    console.error("[OAuth] Google login initiation error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
