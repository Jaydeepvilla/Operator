import { NextRequest, NextResponse } from "next/server";
import { cookies, headers } from "next/headers";
import { db } from "@/server/db";
import {
  users,
  profiles,
  userPreferences,
  userSettings,
  notificationSettings,
  securitySettings,
  loginHistory,
  memberships,
} from "@/server/db/schema";
import { eq } from "drizzle-orm";
import { createSession } from "@/lib/auth/session";
import { auditService } from "@/server/services/audit";
import crypto from "crypto";
import { getGoogleOAuthConfig } from "@/lib/auth/google-config";

function getAppUrl(request: NextRequest): string {
  const envUrl = process.env.NEXT_PUBLIC_APP_URL?.trim();
  if (envUrl && (envUrl.startsWith("http://") || envUrl.startsWith("https://"))) {
    return envUrl.replace(/\/$/, "");
  }
  const proto = request.headers.get("x-forwarded-proto") || (request.nextUrl.protocol ? request.nextUrl.protocol.replace(":", "") : "https");
  const host = request.headers.get("x-forwarded-host") || request.headers.get("host") || request.nextUrl.host || "operator-azure.vercel.app";
  return `${proto}://${host}`;
}

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const code = searchParams.get("code");
    const state = searchParams.get("state");
    const errorParam = searchParams.get("error");

    const appUrl = getAppUrl(request);

    // 1. Handle error parameters from Google OAuth
    if (errorParam) {
      console.error(`[OAuth Callback] Google OAuth error parameter: ${errorParam}`);
      return NextResponse.redirect(`${appUrl}/sign-in?error=google_auth_failed`);
    }

    if (!code || !state) {
      console.error("[OAuth Callback] Missing code or state parameters from callback.");
      return NextResponse.redirect(`${appUrl}/sign-in?error=invalid_oauth_request`);
    }

    // 2. Validate state token to prevent CSRF attacks
    const cookieStore = await cookies();
    const storedState = cookieStore.get("oauth_state")?.value;
    cookieStore.delete("oauth_state"); // delete immediately to prevent reuse

    if (!storedState || storedState !== state) {
      console.error("[OAuth Callback] CSRF State token mismatch or expired.");
      return NextResponse.redirect(`${appUrl}/sign-in?error=state_mismatch`);
    }

    // 3. Exchange OAuth code for access token
    const { clientId, clientSecret } = getGoogleOAuthConfig();
    const redirectUri = `${appUrl}/api/auth/callback/google`;

    const tokenResponse = await fetch("https://oauth2.googleapis.com/token", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        client_id: clientId || "",
        client_secret: clientSecret || "",
        code,
        grant_type: "authorization_code",
        redirect_uri: redirectUri,
      }),
    });

    if (!tokenResponse.ok) {
      const errorText = await tokenResponse.text();
      console.error(`[OAuth Callback] Code-to-token exchange failed. Status: ${tokenResponse.status}, Response: ${errorText}`);
      return NextResponse.redirect(`${appUrl}/sign-in?error=token_exchange_failed`);
    }

    const tokenData = await tokenResponse.json();
    const { access_token } = tokenData;

    // 4. Retrieve user profile info from Google UserInfo endpoint
    const userinfoResponse = await fetch("https://www.googleapis.com/oauth2/v3/userinfo", {
      headers: { Authorization: `Bearer ${access_token}` },
    });

    if (!userinfoResponse.ok) {
      console.error("[OAuth Callback] UserInfo request failed.");
      return NextResponse.redirect(`${appUrl}/sign-in?error=profile_fetch_failed`);
    }

    const googleUser = await userinfoResponse.json();
    const { email, name, given_name, family_name, picture } = googleUser;

    if (!email) {
      console.error("[OAuth Callback] Google UserInfo profile contains no email address.");
      return NextResponse.redirect(`${appUrl}/sign-in?error=missing_email`);
    }

    const emailClean = email.toLowerCase().trim();

    // 5. Query user database
    let [user] = await db
      .select()
      .from(users)
      .where(eq(users.email, emailClean))
      .limit(1);

    const reqHeaders = await headers();
    const userAgent = reqHeaders.get("user-agent") || undefined;
    const ipAddress = reqHeaders.get("x-forwarded-for")?.split(",")[0] || reqHeaders.get("x-real-ip") || undefined;

    if (!user) {
      // 6. User doesn't exist yet, insert new user + default configurations
      const userId = "usr_" + crypto.randomUUID().replace(/-/g, "");

      await db.transaction(async (tx) => {
        await tx.insert(users).values({
          id: userId,
          email: emailClean,
          name: name || `${given_name || ""} ${family_name || ""}`.trim() || "Google User",
          firstName: given_name || null,
          lastName: family_name || null,
          avatar: picture || null,
          isVerified: true,
          acceptTerms: true,
          acceptPrivacy: true,
          marketingConsent: false,
          status: "active",
        });

        // Initialize user setting rows
        await tx.insert(profiles).values({ userId });
        await tx.insert(userPreferences).values({ userId });
        await tx.insert(userSettings).values({ userId });
        await tx.insert(notificationSettings).values({ userId });
        await tx.insert(securitySettings).values({ userId });
      });

      // Load reference
      const [newUser] = await db
        .select()
        .from(users)
        .where(eq(users.id, userId))
        .limit(1);
      user = newUser;

      await auditService.log({
        userId: user.id,
        action: "registration",
        resource: "users",
        resourceId: user.id,
        ipAddress,
        userAgent,
      });
    } else {
      // 7. Handle suspended/deactivated accounts
      if (user.status === "suspended") {
        console.warn(`[OAuth Callback] Suspended user ${user.id} tried to log in via Google.`);
        return NextResponse.redirect(`${appUrl}/sign-in?error=account_suspended`);
      }

      if (user.status === "deactivated" || user.deletedAt) {
        await db
          .update(users)
          .set({ status: "active", deletedAt: null, updatedAt: new Date() })
          .where(eq(users.id, user.id));

        await auditService.log({
          userId: user.id,
          action: "account_restoration",
          resource: "users",
          resourceId: user.id,
          ipAddress,
          userAgent,
        });
      }

      // Update avatar image link if it was missing
      if (!user.avatar && picture) {
        await db
          .update(users)
          .set({ avatar: picture, updatedAt: new Date() })
          .where(eq(users.id, user.id));
      }
    }

    // 8. Create secure HTTP-only cookies
    const { sessionToken } = await createSession(user.id, userAgent, ipAddress, true);

    // 9. Record login history
    let browser = "Unknown";
    let os = "Unknown";
    let device = "Desktop";
    if (userAgent) {
      if (userAgent.includes("Chrome")) browser = "Chrome";
      else if (userAgent.includes("Safari") && !userAgent.includes("Chrome")) browser = "Safari";
      else if (userAgent.includes("Firefox")) browser = "Firefox";

      if (userAgent.includes("Windows")) os = "Windows";
      else if (userAgent.includes("Mac")) os = "macOS";
      else if (userAgent.includes("Linux")) os = "Linux";

      if (/mobile|android|iphone/i.test(userAgent)) device = "Mobile";
    }

    await db.insert(loginHistory).values({
      userId: user.id,
      ipAddress: ipAddress || null,
      userAgent: userAgent || null,
      browser,
      os,
      device,
    });

    await auditService.log({
      userId: user.id,
      action: "login",
      resource: "sessions",
      resourceId: sessionToken,
      ipAddress,
      userAgent,
    });

    // 10. Smart redirect: New users without an organization go to /onboarding, existing go to /dashboard
    const [membership] = await db
      .select({ id: memberships.id })
      .from(memberships)
      .where(eq(memberships.userId, user.id))
      .limit(1);

    const redirectPath = membership ? "/dashboard" : "/onboarding";
    return NextResponse.redirect(`${appUrl}${redirectPath}`);
  } catch (error) {
    console.error("[OAuth Callback] Unexpected crash:", error);
    const appUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
    return NextResponse.redirect(`${appUrl}/sign-in?error=internal_server_error`);
  }
}
