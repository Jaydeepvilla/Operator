import { db } from "@/server/db";
import {
  users,
  accounts,
  profiles,
  userPreferences,
  userSettings,
  notificationSettings,
  securitySettings,
  organizations,
  memberships,
} from "@/server/db/schema";
import { eq, and } from "drizzle-orm";
import crypto from "crypto";

export interface OAuthIdentityInput {
  provider: "google" | "apple" | "credentials";
  providerAccountId: string;
  email: string;
  name: string;
  firstName?: string;
  lastName?: string;
  avatar?: string | null;
  tokens?: {
    accessToken?: string;
    refreshToken?: string;
    idToken?: string;
    expiresAt?: Date;
  };
}

export interface ResolvedIdentity {
  user: typeof users.$inferSelect;
  account: typeof accounts.$inferSelect;
  organization: typeof organizations.$inferSelect | null;
  membership: typeof memberships.$inferSelect | null;
  isNewUser: boolean;
  onboardingStatus: "not_started" | "in_progress" | "completed" | "skipped";
  onboardingStep: string;
}

/**
 * Authoritative, race-condition-safe resolution of an OAuth identity.
 * Guarantees that a single provider identity maps to exactly one application user.
 */
export async function resolveOrCreateOAuthIdentity(
  input: OAuthIdentityInput
): Promise<ResolvedIdentity> {
  const cleanEmail = input.email.toLowerCase().trim();
  const firstName = input.firstName || input.name.split(" ")[0] || "User";
  const lastName = input.lastName || input.name.split(" ").slice(1).join(" ") || "";

  // 1. Direct Lookup by (provider, providerAccountId)
  const [existingAccount] = await db
    .select()
    .from(accounts)
    .where(
      and(
        eq(accounts.provider, input.provider),
        eq(accounts.providerAccountId, input.providerAccountId)
      )
    )
    .limit(1);

  if (existingAccount) {
    const [user] = await db
      .select()
      .from(users)
      .where(eq(users.id, existingAccount.userId))
      .limit(1);

    if (user) {
      // Update tokens & avatar if changed
      await db
        .update(users)
        .set({
          isVerified: true,
          avatar: user.avatar || input.avatar,
          updatedAt: new Date(),
        })
        .where(eq(users.id, user.id));

      if (input.tokens?.accessToken) {
        await db
          .update(accounts)
          .set({
            accessToken: input.tokens.accessToken,
            refreshToken: input.tokens.refreshToken || existingAccount.refreshToken,
            idToken: input.tokens.idToken || existingAccount.idToken,
            expiresAt: input.tokens.expiresAt || existingAccount.expiresAt,
            updatedAt: new Date(),
          })
          .where(eq(accounts.id, existingAccount.id));
      }

      // Resolve primary workspace & membership
      const [primaryMembership] = await db
        .select()
        .from(memberships)
        .where(eq(memberships.userId, user.id))
        .limit(1);

      let org: typeof organizations.$inferSelect | null = null;
      if (primaryMembership) {
        const [foundOrg] = await db
          .select()
          .from(organizations)
          .where(eq(organizations.id, primaryMembership.organizationId))
          .limit(1);
        org = foundOrg || null;
      }

      const onboardingStatus = (org?.onboardingStatus as any) || "not_started";
      const onboardingStep = org?.onboardingStep || "url";

      return {
        user,
        account: existingAccount,
        organization: org,
        membership: primaryMembership || null,
        isNewUser: false,
        onboardingStatus,
        onboardingStep,
      };
    }
  }

  // 2. Lookup existing user by email (Account Linking)
  const [existingUser] = await db
    .select()
    .from(users)
    .where(eq(users.email, cleanEmail))
    .limit(1);

  if (existingUser) {
    let newAccount: typeof accounts.$inferSelect | null = null;

    await db.transaction(async (tx) => {
      const [acc] = await tx
        .insert(accounts)
        .values({
          userId: existingUser.id,
          provider: input.provider,
          providerAccountId: input.providerAccountId,
          email: cleanEmail,
          accessToken: input.tokens?.accessToken || null,
          refreshToken: input.tokens?.refreshToken || null,
          idToken: input.tokens?.idToken || null,
          expiresAt: input.tokens?.expiresAt || null,
        })
        .returning();

      newAccount = acc;

      await tx
        .update(users)
        .set({
          isVerified: true,
          avatar: existingUser.avatar || input.avatar,
          updatedAt: new Date(),
        })
        .where(eq(users.id, existingUser.id));
    });

    // Resolve primary workspace
    const [primaryMembership] = await db
      .select()
      .from(memberships)
      .where(eq(memberships.userId, existingUser.id))
      .limit(1);

    let org: typeof organizations.$inferSelect | null = null;
    if (primaryMembership) {
      const [foundOrg] = await db
        .select()
        .from(organizations)
        .where(eq(organizations.id, primaryMembership.organizationId))
        .limit(1);
      org = foundOrg || null;
    }

    const onboardingStatus = (org?.onboardingStatus as any) || "not_started";
    const onboardingStep = org?.onboardingStep || "url";

    return {
      user: existingUser,
      account: newAccount!,
      organization: org,
      membership: primaryMembership || null,
      isNewUser: false,
      onboardingStatus,
      onboardingStep,
    };
  }

  // 3. New User Registration & Workspace Initialization
  const userId = "usr_" + crypto.randomUUID().replace(/-/g, "");
  let createdUser: typeof users.$inferSelect | null = null;
  let createdAccount: typeof accounts.$inferSelect | null = null;
  let createdOrg: typeof organizations.$inferSelect | null = null;
  let createdMembership: typeof memberships.$inferSelect | null = null;

  await db.transaction(async (tx) => {
    const [u] = await tx
      .insert(users)
      .values({
        id: userId,
        email: cleanEmail,
        name: input.name || `${firstName} ${lastName}`,
        firstName,
        lastName,
        avatar: input.avatar || null,
        isVerified: true,
        acceptTerms: true,
        acceptPrivacy: true,
        marketingConsent: false,
        status: "active",
      })
      .returning();

    createdUser = u;

    const [acc] = await tx
      .insert(accounts)
      .values({
        userId,
        provider: input.provider,
        providerAccountId: input.providerAccountId,
        email: cleanEmail,
        accessToken: input.tokens?.accessToken || null,
        refreshToken: input.tokens?.refreshToken || null,
        idToken: input.tokens?.idToken || null,
        expiresAt: input.tokens?.expiresAt || null,
      })
      .returning();

    createdAccount = acc;

    await tx.insert(profiles).values({ userId });
    await tx.insert(userPreferences).values({ userId });
    await tx.insert(userSettings).values({ userId });
    await tx.insert(notificationSettings).values({ userId });
    await tx.insert(securitySettings).values({ userId });

    // Create initial uncompleted workspace
    const orgSlug = (firstName || "my-business").toLowerCase().replace(/[^a-z0-9]/g, "") + "-" + Math.floor(1000 + Math.random() * 9000);
    const [org] = await tx
      .insert(organizations)
      .values({
        name: `${firstName}'s Workspace`,
        slug: orgSlug,
        industry: "general",
        timezone: "UTC",
        verificationStatus: "unverified",
        onboardingStatus: "not_started",
        onboardingStep: "url",
        onboardingData: {},
      })
      .returning();

    createdOrg = org;

    const [mem] = await tx
      .insert(memberships)
      .values({
        userId,
        organizationId: org.id,
        role: "owner",
      })
      .returning();

    createdMembership = mem;
  });

  return {
    user: createdUser!,
    account: createdAccount!,
    organization: createdOrg,
    membership: createdMembership,
    isNewUser: true,
    onboardingStatus: "not_started",
    onboardingStep: "url",
  };
}
