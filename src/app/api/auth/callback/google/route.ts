import { NextRequest, NextResponse } from "next/server";
import { getGoogleOAuthConfig, getGoogleRedirectUri } from "@/lib/auth/google-config";
import { resolveOrCreateOAuthIdentity } from "@/lib/auth/identity";
import { resolveUserDestination } from "@/lib/auth/router";
import { createSession } from "@/lib/auth/session";
import { auditService } from "@/server/services/audit";

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const code = searchParams.get("code");
  const error = searchParams.get("error");
  const intendedRedirect = searchParams.get("redirect") || request.cookies.get("intended_redirect")?.value;
  const oauthIntent = request.cookies.get("google_oauth_intent")?.value || "login"; // "login" | "signup"

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
  const redirectUri = getGoogleRedirectUri(host);

  try {
    // 1. Exchange authorization code with Google
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
      console.error("[Google OAuth] Token exchange error:", errData);
      return NextResponse.redirect(
        new URL("/sign-in?error=Failed+to+exchange+Google+token", request.url)
      );
    }

    const tokenData = await tokenResponse.json();
    const accessToken = tokenData.access_token;
    const refreshToken = tokenData.refresh_token;
    const idToken = tokenData.id_token;
    const expiresAt = tokenData.expires_in ? new Date(Date.now() + tokenData.expires_in * 1000) : undefined;

    // 2. Fetch verified user profile from Google UserInfo
    const userinfoResponse = await fetch("https://www.googleapis.com/oauth2/v2/userinfo", {
      headers: { Authorization: `Bearer ${accessToken}` },
    });

    if (!userinfoResponse.ok) {
      return NextResponse.redirect(
        new URL("/sign-in?error=Failed+to+fetch+Google+user+profile", request.url)
      );
    }

    const googleUser = await userinfoResponse.json();
    const providerAccountId = googleUser.id || googleUser.sub;
    const email = googleUser.email?.toLowerCase().trim();
    const name = googleUser.name || googleUser.given_name || "Google User";
    const firstName = googleUser.given_name || name.split(" ")[0] || "User";
    const lastName = googleUser.family_name || name.split(" ").slice(1).join(" ") || "";
    const avatar = googleUser.picture || null;

    if (!email || !providerAccountId) {
      return NextResponse.redirect(
        new URL("/sign-in?error=Incomplete+profile+returned+from+Google", request.url)
      );
    }

    // 3. Canonical Identity Resolution (Atomically find or create User & Account)
    const identity = await resolveOrCreateOAuthIdentity({
      provider: "google",
      providerAccountId: String(providerAccountId),
      email,
      name,
      firstName,
      lastName,
      avatar,
      tokens: {
        accessToken,
        refreshToken,
        idToken,
        expiresAt,
      },
    });

    // 4. Create Authenticated Session
    const userAgent = request.headers.get("user-agent") || undefined;
    const ipAddress = request.headers.get("x-forwarded-for")?.split(",")[0] || request.headers.get("x-real-ip") || undefined;
    const { sessionToken, refreshToken: appRefreshToken } = await createSession(
      identity.user.id,
      userAgent,
      ipAddress,
      true
    );

    await auditService.log({
      userId: identity.user.id,
      action: identity.isNewUser ? "oauth_registration" : "oauth_login",
      resource: "users",
      resourceId: identity.user.id,
      ipAddress,
      userAgent,
    });

    // 5. Authoritatively Resolve Target Destination
    const { destination } = await resolveUserDestination(
      identity.user.id,
      intendedRedirect,
      identity.organization?.id
    );

    const sessionExpiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);
    const refreshExpiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);

    // 6. Direct to Login-Success Transition Screen with Cookies
    // Determine UX mode:
    //   - New user → "signup" (welcome + onboarding)
    //   - Existing user who came through signup → "account_exists" (explain + continue)
    //   - Existing user who came through login → "signin" (welcome back)
    let uiMode: string;
    if (identity.isNewUser) {
      uiMode = "signup";
    } else if (oauthIntent === "signup") {
      uiMode = "account_exists";
    } else {
      uiMode = "signin";
    }

    const successUrl = new URL("/login-success", request.url);
    successUrl.searchParams.set("redirect", destination);
    successUrl.searchParams.set("firstTime", String(identity.isNewUser));
    successUrl.searchParams.set("mode", uiMode);

    const response = NextResponse.redirect(successUrl);

    response.cookies.set("session_token", sessionToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
      expires: sessionExpiresAt,
    });

    if (appRefreshToken) {
      response.cookies.set("refresh_token", appRefreshToken, {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "lax",
        path: "/",
        expires: refreshExpiresAt,
      });
    }

    if (identity.organization?.id) {
      response.cookies.set("active_org_id", identity.organization.id, {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "lax",
        path: "/",
        expires: sessionExpiresAt,
      });
    }

    response.cookies.delete("google_oauth_state");
    response.cookies.delete("google_oauth_intent");
    response.cookies.delete("intended_redirect");
    return response;
  } catch (err: any) {
    console.error("[Google OAuth] Unexpected callback error:", err);
    return NextResponse.redirect(
      new URL(`/sign-in?error=${encodeURIComponent(err.message || "An unexpected authentication error occurred")}`, request.url)
    );
  }
}
