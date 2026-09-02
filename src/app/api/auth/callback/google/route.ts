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
  const state = searchParams.get("state");
  const error = searchParams.get("error");
  const savedState = request.cookies.get("google_oauth_state")?.value;

  if (error || !code) {
    return NextResponse.redirect(
      new URL(`/sign-in?error=${encodeURIComponent(error || "Authorization cancelled")}`, request.url)
    );
  }

  // Validate state
  if (!state || !savedState || state !== savedState) {
    return NextResponse.redirect(
      new URL("/sign-in?error=Invalid+OAuth+state", request.url)
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
    // 1. Exchange authorization code for tokens
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

    // 2. Fetch user profile from Google
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
    const firstName = googleUser.given_name || name.split(" ")[0] || "";
    const lastName = googleUser.family_name || name.split(" ").slice(1).join(" ") || "";
    const avatar = googleUser.picture || null;

    if (!email) {
      return NextResponse.redirect(
        new URL("/sign-in?error=No+email+provided+by+Google", request.url)
      );
    }

    // 3. Find or Create User
    const [existingUser] = await db
      .select()
      .from(users)
      .where(eq(users.email, email))
      .limit(1);

    let userId: string;

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
    } else {
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

        // Create default organization
        const orgSlug = (firstName || "my-workspace").toLowerCase().replace(/[^a-z0-9]/g, "") + "-" + Math.floor(1000 + Math.random() * 9000);
        const [org] = await tx
          .insert(organizations)
          .values({
            name: `${firstName}'s Workspace`,
            slug: orgSlug,
            industry: "general",
            timezone: "UTC",
            verificationStatus: "unverified",
          })
          .returning({ id: organizations.id });

        if (org) {
          await tx.insert(memberships).values({
            userId,
            organizationId: org.id,
            role: "owner",
          });
        }
      });
    }

    // 4. Create Session
    const userAgent = request.headers.get("user-agent") || undefined;
    const ipAddress = request.headers.get("x-forwarded-for")?.split(",")[0] || request.headers.get("x-real-ip") || undefined;
    await createSession(userId, userAgent, ipAddress, true);

    await auditService.log({
      userId,
      action: "oauth_login",
      resource: "users",
      resourceId: userId,
      ipAddress,
      userAgent,
    });

    const response = NextResponse.redirect(new URL("/dashboard", request.url));
    response.cookies.delete("google_oauth_state");
    return response;
  } catch (err: any) {
    console.error("[Google OAuth] Unexpected error:", err);
    return NextResponse.redirect(
      new URL(`/sign-in?error=${encodeURIComponent(err.message || "An unexpected error occurred during Google sign in")}`, request.url)
    );
  }
}
