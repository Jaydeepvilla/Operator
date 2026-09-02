import { NextRequest, NextResponse } from "next/server";
import { getGoogleOAuthConfig } from "@/lib/auth/google-config";
import { db } from "@/server/db";
import {
  users,
  profiles,
  userPreferences,
  userSettings,
  notificationSettings,
  securitySettings,
  organizations,
  memberships,
} from "@/server/db/schema";
import { eq } from "drizzle-orm";
import { createSession } from "@/lib/auth/session";
import { auditService } from "@/server/services/audit";
import crypto from "crypto";

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const code = searchParams.get("code");
  const error = searchParams.get("error");

  if (error || !code) {
    return NextResponse.redirect(
      new URL(`/sign-in?error=${encodeURIComponent(error || "Google authorization was cancelled")}`, request.url)
    );
  }

  const { clientId, clientSecret } = getGoogleOAuthConfig();
  if (!clientId || !clientSecret) {
    return NextResponse.redirect(
      new URL("/sign-in?error=Google+OAuth+credentials+missing", request.url)
    );
  }

  const host = request.headers.get("x-forwarded-host") || request.headers.get("host") || request.nextUrl.host;
  const proto = request.headers.get("x-forwarded-proto") || (process.env.NODE_ENV === "production" ? "https" : "http");
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || `${proto}://${host}`;
  const redirectUri = `${baseUrl}/api/auth/callback/google`;

  try {
    // 1. Exchange authorization code for tokens directly with Google
    const tokenResponse = await fetch("https://oauth2.googleapis.com/token", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        code,
        client_id: clientId,
        client_secret: clientSecret,
        redirect_uri: redirectUri,
        grant_type: "authorization_code",
      }),
    });

    if (!tokenResponse.ok) {
      const errData = await tokenResponse.text();
      console.error("[Google OAuth] Token error:", errData);
      return NextResponse.redirect(
        new URL("/sign-in?error=Failed+to+exchange+Google+token", request.url)
      );
    }

    const tokenData = await tokenResponse.json();
    const accessToken = tokenData.access_token;

    // 2. Fetch user profile from Google UserInfo endpoint
    const userinfoResponse = await fetch("https://www.googleapis.com/oauth2/v2/userinfo", {
      headers: { Authorization: `Bearer ${accessToken}` },
    });

    if (!userinfoResponse.ok) {
      return NextResponse.redirect(
        new URL("/sign-in?error=Failed+to+fetch+Google+user+profile", request.url)
      );
    }

    const googleUser = await userinfoResponse.json();
    const email = googleUser.email?.toLowerCase().trim();
    const name = googleUser.name || googleUser.given_name || "Google User";
    const firstName = googleUser.given_name || name.split(" ")[0] || "User";
    const lastName = googleUser.family_name || name.split(" ").slice(1).join(" ") || "";
    const avatar = googleUser.picture || null;

    if (!email) {
      return NextResponse.redirect(
        new URL("/sign-in?error=No+email+provided+by+Google", request.url)
      );
    }

    // 3. Find or Create User in database
    const [existingUser] = await db
      .select()
      .from(users)
      .where(eq(users.email, email))
      .limit(1);

    let userId: string;
    let targetRedirect = "/onboarding";

    if (existingUser) {
      userId = existingUser.id;
      await db
        .update(users)
        .set({
          isVerified: true,
          avatar: existingUser.avatar || avatar,
          updatedAt: new Date(),
        })
        .where(eq(users.id, userId));

      // Check if user has an existing verified organization
      const userMemberships = await db
        .select({
          orgId: memberships.organizationId,
          verificationStatus: organizations.verificationStatus,
        })
        .from(memberships)
        .leftJoin(organizations, eq(memberships.organizationId, organizations.id))
        .where(eq(memberships.userId, userId));

      const hasVerifiedOrg = userMemberships.some(
        (m) => m.verificationStatus === "verified"
      );

      targetRedirect = hasVerifiedOrg ? "/dashboard" : "/onboarding";
    } else {
      // First-time user creation
      userId = "usr_" + crypto.randomUUID().replace(/-/g, "");
      await db.transaction(async (tx) => {
        await tx.insert(users).values({
          id: userId,
          email,
          name,
          firstName,
          lastName,
          avatar,
          isVerified: true,
          acceptTerms: true,
          acceptPrivacy: true,
          marketingConsent: false,
          status: "active",
        });

        await tx.insert(profiles).values({ userId });
        await tx.insert(userPreferences).values({ userId });
        await tx.insert(userSettings).values({ userId });
        await tx.insert(notificationSettings).values({ userId });
        await tx.insert(securitySettings).values({ userId });
      });

      targetRedirect = "/onboarding";
    }

    // 4. Create Session in DB
    const userAgent = request.headers.get("user-agent") || undefined;
    const ipAddress = request.headers.get("x-forwarded-for")?.split(",")[0] || request.headers.get("x-real-ip") || undefined;
    const { sessionToken, refreshToken } = await createSession(userId, userAgent, ipAddress, true);

    await auditService.log({
      userId,
      action: existingUser ? "oauth_login" : "oauth_registration",
      resource: "users",
      resourceId: userId,
      ipAddress,
      userAgent,
    });

    const sessionExpiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);
    const refreshExpiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);

    // 5. Construct redirect response and explicitly set HttpOnly cookies
    const response = NextResponse.redirect(new URL(targetRedirect, request.url));

    response.cookies.set("session_token", sessionToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
      expires: sessionExpiresAt,
    });

    if (refreshToken) {
      response.cookies.set("refresh_token", refreshToken, {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "lax",
        path: "/",
        expires: refreshExpiresAt,
      });
    }

    response.cookies.delete("google_oauth_state");
    return response;
  } catch (err: any) {
    console.error("[Google OAuth] Unexpected error:", err);
    return NextResponse.redirect(
      new URL(`/sign-in?error=${encodeURIComponent(err.message || "An unexpected error occurred during Google sign in")}`, request.url)
    );
  }
}
