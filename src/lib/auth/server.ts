import { cookies } from "next/headers";
import { cache } from "react";
import { getSession } from "./session";
import { db } from "@/server/db";
import { users, memberships } from "@/server/db/schema";
import { eq, and } from "drizzle-orm";

export interface AuthResult {
  userId: string | null;
  orgId: string | null;
}

/**
 * Server-side authentication check returning the active userId and orgId.
 * Wrapped in React cache to avoid duplicate DB queries per request.
 */
export const auth = cache(async (): Promise<AuthResult> => {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get("session_token")?.value;
    if (!token) {
      return { userId: null, orgId: null };
    }

    const session = await getSession(token);
    if (!session) {
      return { userId: null, orgId: null };
    }

    // Check active_org_id cookie for multi-tenant switching
    const activeOrgCookie = cookieStore.get("active_org_id")?.value;

    let selectedOrgId: string | null = null;

    if (activeOrgCookie) {
      // Validate that the user actually belongs to this organization
      const [matchingMembership] = await db
        .select()
        .from(memberships)
        .where(
          and(
            eq(memberships.userId, session.userId),
            eq(memberships.organizationId, activeOrgCookie)
          )
        )
        .limit(1);

      if (matchingMembership) {
        selectedOrgId = matchingMembership.organizationId;
      }
    }

    // Fallback to primary membership if active_org_id is unset or invalid
    if (!selectedOrgId) {
      const [primaryMembership] = await db
        .select()
        .from(memberships)
        .where(eq(memberships.userId, session.userId))
        .limit(1);

      selectedOrgId = primaryMembership?.organizationId || null;
    }

    return {
      userId: session.userId,
      orgId: selectedOrgId,
    };
  } catch (error: any) {
    if (
      error &&
      (error.digest === "DYNAMIC_SERVER_USAGE" ||
        error.message?.includes("Dynamic server usage") ||
        error.name === "DynamicServerError")
    ) {
      throw error;
    }
    console.error("Error in server auth helper:", error);
    return { userId: null, orgId: null };
  }
});

/**
 * Returns the full user record of the currently logged-in user.
 * Wrapped in React cache to avoid duplicate DB queries per request.
 */
export const currentUser = cache(async () => {
  try {
    const { userId } = await auth();
    if (!userId) {
      return null;
    }

    const [user] = await db
      .select()
      .from(users)
      .where(eq(users.id, userId))
      .limit(1);

    return user || null;
  } catch (error: any) {
    if (
      error &&
      (error.digest === "DYNAMIC_SERVER_USAGE" ||
        error.message?.includes("Dynamic server usage") ||
        error.name === "DynamicServerError")
    ) {
      throw error;
    }
    console.error("Error retrieving current user:", error);
    return null;
  }
});
