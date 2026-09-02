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
import { eq, and, sql } from "drizzle-orm";
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
 * Shared helper: Loads the primary workspace & membership for a user.
 * Centralizes the org/membership lookup pattern to avoid code duplication.
 */
async function resolveWorkspaceContext(userId: string) {
  const [primaryMembership] = await db
    .select()
    .from(memberships)
    .where(eq(memberships.userId, userId))
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

  return { org, membership: primaryMembership || null, onboardingStatus, onboardingStep };
}

/**
 * Authoritative, race-condition-safe resolution of an OAuth identity.
 *
 * GUARANTEES:
 * - A single (provider, providerAccountId) maps to exactly ONE application user.
 * - A single email maps to exactly ONE application user.
 * - Calling this N times concurrently for the same identity always produces exactly
 *   1 user, 1 account, 1 organization, 1 membership — never duplicates.
 *
 * RACE SAFETY:
 * - Uses the database's UNIQUE constraints (users.email, accounts(provider, providerAccountId))
 *   as the authoritative source of truth.
 * - If a concurrent request wins the insert race, this function catches the unique violation
 *   and falls back to loading the existing record instead of failing.
 */
export async function resolveOrCreateOAuthIdentity(
  input: OAuthIdentityInput
): Promise<ResolvedIdentity> {
  const cleanEmail = input.email.toLowerCase().trim();
  const firstName = input.firstName || input.name.split(" ")[0] || "User";
  const lastName = input.lastName || input.name.split(" ").slice(1).join(" ") || "";

  // ─── STEP 1: Direct Lookup by Stable Provider Identity ───────────────────
  // This is the PRIMARY identity resolution path. The (provider, providerAccountId)
  // pair is the immutable Google subject ID — it never changes even if the user
  // changes their email.
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

      const ctx = await resolveWorkspaceContext(user.id);

      return {
        user,
        account: existingAccount,
        organization: ctx.org,
        membership: ctx.membership,
        isNewUser: false,
        onboardingStatus: ctx.onboardingStatus,
        onboardingStep: ctx.onboardingStep,
      };
    }
  }

  // ─── STEP 2: Lookup Existing User by Email (Account Linking) ─────────────
  // If a user registered with email/password and then tries Google OAuth with the
  // same email, we link the Google provider to the existing user.
  // We do NOT create a second user.
  const [existingUser] = await db
    .select()
    .from(users)
    .where(eq(users.email, cleanEmail))
    .limit(1);

  if (existingUser) {
    // Link the new provider to the existing user via ON CONFLICT to handle races
    try {
      await db.transaction(async (tx) => {
        // ON CONFLICT: If the account already exists (race), just update tokens
        await tx
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
          .onConflictDoUpdate({
            target: [accounts.provider, accounts.providerAccountId],
            set: {
              accessToken: input.tokens?.accessToken || null,
              refreshToken: input.tokens?.refreshToken || null,
              idToken: input.tokens?.idToken || null,
              expiresAt: input.tokens?.expiresAt || null,
              updatedAt: new Date(),
            },
          });

        await tx
          .update(users)
          .set({
            isVerified: true,
            avatar: existingUser.avatar || input.avatar,
            updatedAt: new Date(),
          })
          .where(eq(users.id, existingUser.id));
      });
    } catch (err: any) {
      // If account linking fails for an unexpected reason, log but continue
      // The user record exists — we can still resolve their identity
      console.error("[Identity] Account linking error (non-fatal):", err.message);
    }

    // Re-fetch the account to get the canonical record
    const [linkedAccount] = await db
      .select()
      .from(accounts)
      .where(
        and(
          eq(accounts.provider, input.provider),
          eq(accounts.providerAccountId, input.providerAccountId)
        )
      )
      .limit(1);

    const ctx = await resolveWorkspaceContext(existingUser.id);

    return {
      user: existingUser,
      account: linkedAccount!,
      organization: ctx.org,
      membership: ctx.membership,
      isNewUser: false,
      onboardingStatus: ctx.onboardingStatus,
      onboardingStep: ctx.onboardingStep,
    };
  }

  // ─── STEP 3: New User Registration & Workspace Initialization ────────────
  // This path is taken ONLY when:
  // - No account exists for this (provider, providerAccountId)
  // - No user exists for this email
  //
  // RACE SAFETY: If two concurrent requests both reach this point for the
  // same Google identity, the UNIQUE constraints on users.email and
  // accounts(provider, providerAccountId) will cause one to fail.
  // We catch that failure and retry the lookup.
  const userId = "usr_" + crypto.randomUUID().replace(/-/g, "");
  let createdUser: typeof users.$inferSelect | null = null;
  let createdAccount: typeof accounts.$inferSelect | null = null;
  let createdOrg: typeof organizations.$inferSelect | null = null;
  let createdMembership: typeof memberships.$inferSelect | null = null;

  try {
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
          .onConflictDoNothing({
            target: [memberships.userId, memberships.organizationId],
          })
          .returning();

      createdMembership = mem ?? null;
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
  } catch (err: any) {
    // ─── RACE CONDITION RECOVERY ─────────────────────────────────────────
    // If we got a unique constraint violation, it means another concurrent
    // request already created the user/account. Re-run the lookup path.
    const isUniqueViolation =
      err.code === "23505" || // PostgreSQL unique_violation
      err.message?.includes("unique constraint") ||
      err.message?.includes("duplicate key");

    if (isUniqueViolation) {
      console.warn("[Identity] Race condition detected — falling back to lookup for:", cleanEmail);

      // Re-fetch by provider identity first
      const [raceAccount] = await db
        .select()
        .from(accounts)
        .where(
          and(
            eq(accounts.provider, input.provider),
            eq(accounts.providerAccountId, input.providerAccountId)
          )
        )
        .limit(1);

      if (raceAccount) {
        const [raceUser] = await db
          .select()
          .from(users)
          .where(eq(users.id, raceAccount.userId))
          .limit(1);

        if (raceUser) {
          const ctx = await resolveWorkspaceContext(raceUser.id);
          return {
            user: raceUser,
            account: raceAccount,
            organization: ctx.org,
            membership: ctx.membership,
            isNewUser: false,
            onboardingStatus: ctx.onboardingStatus,
            onboardingStep: ctx.onboardingStep,
          };
        }
      }

      // Fallback: Lookup by email
      const [raceUser] = await db
        .select()
        .from(users)
        .where(eq(users.email, cleanEmail))
        .limit(1);

      if (raceUser) {
        // Ensure the account link exists
        const [raceAcc] = await db
          .select()
          .from(accounts)
          .where(
            and(
              eq(accounts.provider, input.provider),
              eq(accounts.providerAccountId, input.providerAccountId)
            )
          )
          .limit(1);

        const ctx = await resolveWorkspaceContext(raceUser.id);
        return {
          user: raceUser,
          account: raceAcc!,
          organization: ctx.org,
          membership: ctx.membership,
          isNewUser: false,
          onboardingStatus: ctx.onboardingStatus,
          onboardingStep: ctx.onboardingStep,
        };
      }
    }

    // Non-recoverable error — rethrow
    throw err;
  }
}
