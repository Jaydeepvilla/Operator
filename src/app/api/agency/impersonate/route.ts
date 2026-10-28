import { NextRequest, NextResponse } from "next/server";
import { agencyImpersonation } from "@/server/services/agency/impersonation";
import { auth } from "@/lib/auth/server";
import { db } from "@/server/db";
import { agencyMembers, agencyClients, clientWorkspaces } from "@/server/db/schema";
import { eq, and } from "drizzle-orm";

/**
 * API route to mount impersonation sessions.
 * Verifies the AES-256 token, verifies caller authorization, sets transit cookies,
 * and redirects to client dashboard views.
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

    // 1. Enforce authentication: only signed-in users can initiate impersonation
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.redirect(new URL("/sign-in", req.url));
    }

    // 2. Cryptographically verify token integrity & expiration
    const payload = agencyImpersonation.verifyImpersonationToken(token);

    // 3. Ensure the authenticated caller is the designated actor in the token
    if (userId !== payload.actorUserId) {
      console.warn(`[Impersonate Gateway] Actor identity mismatch: caller=${userId}, tokenActor=${payload.actorUserId}`);
      return NextResponse.redirect(
        new URL("/agency/clients?error=Actor+identity+mismatch", req.url)
      );
    }

    // 4. Verify caller has active membership in the designated agency
    const [membership] = await db
      .select({ id: agencyMembers.id })
      .from(agencyMembers)
      .where(
        and(
          eq(agencyMembers.userId, userId),
          eq(agencyMembers.agencyId, payload.agencyId)
        )
      )
      .limit(1);

    if (!membership) {
      console.warn(`[Impersonate Gateway] User ${userId} is not an authorized member of agency ${payload.agencyId}`);
      return NextResponse.redirect(
        new URL("/agency/clients?error=Unauthorized+agency+member", req.url)
      );
    }

    // 5. Verify the target organization is actively managed by this agency
    const [workspace] = await db
      .select({ id: clientWorkspaces.id })
      .from(clientWorkspaces)
      .innerJoin(agencyClients, eq(clientWorkspaces.agencyClientId, agencyClients.id))
      .where(
        and(
          eq(clientWorkspaces.organizationId, payload.targetOrganizationId),
          eq(agencyClients.agencyId, payload.agencyId)
        )
      )
      .limit(1);

    if (!workspace) {
      console.warn(`[Impersonate Gateway] Organization ${payload.targetOrganizationId} is not a valid workspace of agency ${payload.agencyId}`);
      return NextResponse.redirect(
        new URL("/agency/clients?error=Unauthorized+client+workspace", req.url)
      );
    }

    // Redirect to standard dashboard path with authorized cookies
    const redirectResponse = NextResponse.redirect(new URL("/dashboard", req.url));

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
    return NextResponse.redirect(
      new URL(`/agency/clients?error=${encodeURIComponent(error?.message || "Invalid or expired token")}`, req.url)
    );
  }
}
