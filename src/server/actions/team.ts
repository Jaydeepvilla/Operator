"use server";

import { requireOrganizationAccess } from "@/lib/auth/server";
import { revalidatePath } from "next/cache";
import { db } from "../db";
import { users, memberships } from "../db/schema";
import { eq, and } from "drizzle-orm";
import crypto from "crypto";

export async function getTeamMembersAction() {
  try {
    const { organizationId } = await requireOrganizationAccess();

    const rows = await db
      .select({
        membershipId: memberships.id,
        role: memberships.role,
        joinedAt: memberships.createdAt,
        userId: users.id,
        name: users.name,
        email: users.email,
        status: users.status,
      })
      .from(memberships)
      .innerJoin(users, eq(memberships.userId, users.id))
      .where(eq(memberships.organizationId, organizationId));

    const members = rows.map((r) => ({
      id: r.membershipId,
      name: r.name || r.email.split("@")[0],
      email: r.email,
      role: r.role,
      status: r.status === "active" ? "active" : "pending",
      joinedAt: new Date(r.joinedAt).toLocaleDateString("en-US", {
        month: "short",
        day: "2-digit",
        year: "numeric",
      }),
    }));

    return { success: true, data: members };
  } catch (error: any) {
    return { success: false, error: error?.message || "Failed to load team members" };
  }
}

export async function inviteTeamMemberAction(data: {
  name: string;
  email: string;
  role: "owner" | "admin" | "manager" | "staff";
}) {
  try {
    const { organizationId } = await requireOrganizationAccess();
    const email = data.email.toLowerCase().trim();
    const name = data.name.trim();

    // 1. Check if user already exists
    let [existingUser] = await db.select().from(users).where(eq(users.email, email));
    
    if (!existingUser) {
      const newUserId = `usr_${crypto.randomUUID()}`;
      [existingUser] = await db
        .insert(users)
        .values({
          id: newUserId,
          email,
          name,
          status: "active",
          isVerified: true,
        })
        .returning();
    }

    // 2. Check if already a member of this organization
    const [existingMembership] = await db
      .select()
      .from(memberships)
      .where(and(eq(memberships.organizationId, organizationId), eq(memberships.userId, existingUser.id)));

    if (existingMembership) {
      return { success: false, error: "This user is already a member of this organization." };
    }

    // 3. Create membership
    await db.insert(memberships).values({
      organizationId,
      userId: existingUser.id,
      role: data.role,
    });

    revalidatePath("/team");
    return { success: true };
  } catch (error: any) {
    return { success: false, error: error?.message || "Failed to invite team member" };
  }
}

export async function removeTeamMemberAction(membershipId: string) {
  try {
    const { organizationId } = await requireOrganizationAccess();

    await db
      .delete(memberships)
      .where(and(eq(memberships.id, membershipId), eq(memberships.organizationId, organizationId)));

    revalidatePath("/team");
    return { success: true };
  } catch (error: any) {
    return { success: false, error: error?.message || "Failed to remove team member" };
  }
}

export async function updateTeamMemberRoleAction(
  membershipId: string,
  role: "owner" | "admin" | "manager" | "staff"
) {
  try {
    const { organizationId } = await requireOrganizationAccess();

    await db
      .update(memberships)
      .set({ role, updatedAt: new Date() })
      .where(and(eq(memberships.id, membershipId), eq(memberships.organizationId, organizationId)));

    revalidatePath("/team");
    return { success: true };
  } catch (error: any) {
    return { success: false, error: error?.message || "Failed to update role" };
  }
}
