import { NextRequest, NextResponse } from "next/server";
import { agencyImpersonation } from "@/server/services/agency/impersonation";

/**
 * API route to mount impersonation sessions.
 * Verifies the AES-256 token, sets transit cookies, and redirects to client dashboard views.
 */
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const token = searchParams.get("token");
    const action = searchParams.get("action"); // check if ending session

    // If ending impersonation session
    if (action === "end") {
      const activeImpersonationToken =
        req.cookies.get("operator_impersonate_token")?.value ||
        req.cookies.get("nexx_impersonate_token")?.value;

      if (activeImpersonationToken) {
        try {
          const payload = agencyImpersonation.verifyImpersonationToken(activeImpersonationToken);
          await agencyImpersonation.logImpersonationEnd(
            payload.agencyId,
            payload.actorUserId,
            payload.targetOrganizationId
          );
        } catch (e) {
          console.warn("[Impersonate Gateway] Failed to log impersonation-end audit:", e);
        }
      }
      const redirectResponse = NextResponse.redirect(new URL("/agency/clients", req.url));
      
      // Clear canonical and legacy cookies
      redirectResponse.cookies.set("operator_impersonate_org_id", "", { maxAge: 0, path: "/" });
      redirectResponse.cookies.set("operator_impersonate_actor_id", "", { maxAge: 0, path: "/" });
      redirectResponse.cookies.set("operator_impersonate_token", "", { maxAge: 0, path: "/" });
      redirectResponse.cookies.set("nexx_impersonate_org_id", "", { maxAge: 0, path: "/" });
      redirectResponse.cookies.set("nexx_impersonate_actor_id", "", { maxAge: 0, path: "/" });
      redirectResponse.cookies.set("nexx_impersonate_token", "", { maxAge: 0, path: "/" });
      
      return redirectResponse;
    }

    if (!token) {
      return NextResponse.json({ error: "Missing session token credentials" }, { status: 400 });
    }

    // Verify token
    const payload = agencyImpersonation.verifyImpersonationToken(token);
    // Redirect to standard dashboard path
    const redirectResponse = NextResponse.redirect(new URL("/dashboard", req.url));

    // Store secure HTTP-only cookies
    const maxAge = Math.max(0, Math.floor((payload.expiresAt - Date.now()) / 1000));

    redirectResponse.cookies.set("operator_impersonate_org_id", payload.targetOrganizationId, {
      path: "/",
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge,
    });

    redirectResponse.cookies.set("operator_impersonate_actor_id", payload.actorUserId, {
      path: "/",
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge,
    });

    redirectResponse.cookies.set("operator_impersonate_token", token, {
      path: "/",
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge,
    });

    return redirectResponse;
  } catch (error: any) {
    console.error("[Impersonate Gateway] Secure login failed:", error);
    // Redirect back to agency dashboard with error info
    return NextResponse.redirect(
      new URL(`/agency/clients?error=${encodeURIComponent(error?.message || "Invalid or expired token")}`, req.url)
    );
  }
}
