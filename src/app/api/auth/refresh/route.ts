import { NextRequest, NextResponse } from "next/server";
import { refreshSession } from "@/lib/auth/session";

/**
 * Endpoint for renewing expired session tokens via the secure HttpOnly refresh token.
 * Features automated rotation and replay attack detection.
 */
export async function POST(request: NextRequest) {
  try {
    const refreshToken = request.cookies.get("refresh_token")?.value;

    if (!refreshToken) {
      return NextResponse.json({ error: "Missing refresh token" }, { status: 401 });
    }

    const userAgent = request.headers.get("user-agent") || undefined;
    const ipAddress =
      request.headers.get("x-forwarded-for")?.split(",")[0] ||
      request.headers.get("x-real-ip") ||
      undefined;

    const result = await refreshSession(refreshToken, userAgent, ipAddress);

    if (!result) {
      const response = NextResponse.json(
        { error: "Invalid, expired, or reused refresh token" },
        { status: 401 }
      );
      response.cookies.delete("session_token");
      response.cookies.delete("refresh_token");
      return response;
    }

    const response = NextResponse.json({ success: true });

    response.cookies.set("session_token", result.sessionToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
    });

    response.cookies.set("refresh_token", result.refreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "strict",
      path: "/api/auth/refresh",
      expires: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
    });

    return response;
  } catch (error: any) {
    console.error("API /api/auth/refresh error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
