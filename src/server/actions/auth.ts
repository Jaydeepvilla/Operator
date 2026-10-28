"use server";

import { db } from "@/server/db";
import {
  users,
  profiles,
  memberships,
  organizations,
  emailVerifications,
  passwordResetTokens,
  loginHistory,
  userPreferences,
  userSettings,
  notificationSettings,
  securitySettings,
  sessions,
  refreshTokens,
} from "@/server/db/schema";
import { eq, and, gte, desc, or } from "drizzle-orm";
import { hashPassword, verifyPassword } from "@/lib/auth/password";
import { createSession, deleteSession, logoutAllDevices } from "@/lib/auth/session";
import { currentUser, auth } from "@/lib/auth/server";
import { resolveUserDestination } from "@/lib/auth/router";
import { cookies, headers } from "next/headers";
import { revalidatePath } from "next/cache";
import { checkLoginRateLimit, recordLoginAttempt, checkPasswordResetRateLimit, checkTokenAttemptRateLimit } from "@/lib/auth/rate-limit";
import { isReservedEmail, isDisposableEmail, analyzePasswordStrength } from "@/lib/auth/security-checks";
import crypto from "crypto";
import { notificationService } from "../services/notification";
import { auditService } from "../services/audit";
import { loginSchema, registrationSchema, forgotPasswordSchema, resetPasswordSchema } from "@/lib/validators";

async function getSafeRequestMetadata() {
  try {
    const reqHeaders = await headers();
    const userAgent = reqHeaders.get("user-agent") || undefined;
    const ipAddress = reqHeaders.get("x-forwarded-for")?.split(",")[0] || reqHeaders.get("x-real-ip") || undefined;
    return { userAgent, ipAddress };
  } catch {
    return { userAgent: undefined, ipAddress: undefined };
  }
}

/**
 * Handles credentials verification, rate limiting lockout, suspension, deactivation restore, and session setup.
 */
export async function loginAction(input: any) {
  try {
    const parsed = loginSchema.safeParse(input);
    if (!parsed.success) {
      return { success: false, error: parsed.error.issues[0]?.message || "Validation failed" };
    }
    const { email, password, rememberMe } = parsed.data;

    const { userAgent, ipAddress } = await getSafeRequestMetadata();

    // 1. Check lockout duration (brute force protection)
    const lockoutState = await checkLoginRateLimit(email, ipAddress);
    if (lockoutState.isLocked) {
      const mins = Math.ceil((lockoutState.remainingTime || 0) / 60);
      return {
        success: false,
        error: `Too many failed login attempts. Your account has been temporarily locked. Please try again in ${mins} minute${mins !== 1 ? "s" : ""}.`,
      };
    }

    // 2. Retrieve user
    const [user] = await db
      .select()
      .from(users)
      .where(eq(users.email, email.toLowerCase().trim()))
      .limit(1);

    if (!user) {
      // Mitigate timing-based user enumeration attacks with dummy hash verification
      try {
        await verifyPassword(password, "$argon2id$v=19$m=65536,t=3,p=4$1PAO1l04bdFb8Pz2Tg7lZw$HldwXI6gkl7VEkvgriyHa3fCRngVGE6AbCePZ5wrKWQ");
      } catch {}
      await recordLoginAttempt(email, false, ipAddress, userAgent);
      return {
        success: false,
        error: "Invalid email or password",
      };
    }

    // 3. Verify password correctness (constant-time verification to prevent enumeration)
    const isValid = user.passwordHash ? await verifyPassword(password, user.passwordHash) : false;
    if (!isValid) {
      await recordLoginAttempt(email, false, ipAddress, userAgent);
      return {
        success: false,
        error: "Invalid email or password",
      };
    }

    // 4. Check suspension after validating credentials (prevents account existence enumeration)
    if (user.status === "suspended") {
      await recordLoginAttempt(email, false, ipAddress, userAgent);
      return {
        success: false,
        error: "Your account has been suspended by an administrator.",
      };
    }

    // 5. Auto-restore user status if deactivated or soft deleted
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

    // 6. Record successful attempt
    await recordLoginAttempt(email, true, ipAddress, userAgent);

    // 7. Initialize sessions & refresh token cookies
    const { sessionToken } = await createSession(user.id, userAgent, ipAddress, rememberMe);

    // Set active organization cookie if user belongs to an org
    try {
      const [membership] = await db
        .select()
        .from(memberships)
        .where(eq(memberships.userId, user.id))
        .limit(1);

      if (membership?.organizationId) {
        const cookieStore = await cookies();
        cookieStore.set({
          name: "active_org_id",
          value: membership.organizationId,
          httpOnly: true,
          secure: false,
          sameSite: "lax",
          path: "/",
        });
      }
    } catch (e) {
      console.error("ACTIVE ORG COOKIE SET ERROR:", e);
    }

    // 8. Log browser/OS device attributes
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
      resourceId: sessionToken.slice(0, 8) + "...",
      ipAddress,
      userAgent,
    });

    const resolution = await resolveUserDestination(user.id);

    return {
      success: true,
      destination: resolution.destination,
      isCompleted: resolution.hasVerifiedOrg,
    };
  } catch (error: any) {
    console.error("Login action error:", error);
    return { success: false, error: "An unexpected error occurred. Please try again." };
  }
}

/**
 * Handles credentials registration, duplicate checking, and dispatching verification tokens.
 */
export async function registerAction(input: any) {
  try {
    const parsed = registrationSchema.safeParse(input);
    if (!parsed.success) {
      return { success: false, error: parsed.error.issues[0]?.message || "Validation failed" };
    }

    const { name, firstName, lastName, email, password, acceptTerms, acceptPrivacy, marketingConsent } = parsed.data;

    const emailClean = email.toLowerCase().trim();

    // 1. Check duplicate
    const [existing] = await db
      .select({ id: users.id })
      .from(users)
      .where(eq(users.email, emailClean))
      .limit(1);

    if (existing) {
      return {
        success: false,
        code: "EMAIL_EXISTS",
        error: "This email is already registered.",
      };
    }

    // 2. Check reserved administrative names
    if (isReservedEmail(emailClean)) {
      return { success: false, error: "This email address prefix is reserved." };
    }

    // 3. Check disposable email domain list
    if (isDisposableEmail(emailClean)) {
      return { success: false, error: "Disposable email addresses are not allowed." };
    }

    // 4. Validate password strength
    const strengthResult = analyzePasswordStrength(password, emailClean, firstName, lastName);
    if (strengthResult.score < 4) {
      return {
        success: false,
        error: "Password does not meet complexity requirements: " + strengthResult.unmetRequirements.join(", "),
      };
    }

    const passwordHashVal = await hashPassword(password);
    const userId = "usr_" + crypto.randomUUID().replace(/-/g, "");

    const { userAgent, ipAddress } = await getSafeRequestMetadata();

    // 5. Create user and configurations inside transaction
    await db.transaction(async (tx) => {
      await tx.insert(users).values({
        id: userId,
        email: emailClean,
        name: name || `${firstName} ${lastName}`,
        firstName,
        lastName,
        passwordHash: passwordHashVal,
        isVerified: false,
        acceptTerms,
        acceptPrivacy,
        marketingConsent,
        status: "active",
      });

      await tx.insert(profiles).values({ userId });
      await tx.insert(userPreferences).values({ userId });
      await tx.insert(userSettings).values({ userId });
      await tx.insert(notificationSettings).values({ userId });
      await tx.insert(securitySettings).values({ userId });
    });

    // 6. If SMTP is not configured, auto-verify and create session directly
    const isDirectAuth = !process.env.SMTP_USER;
    if (isDirectAuth) {
      // Auto-verify + create placeholder workspace atomically
      await db.transaction(async (tx) => {
        await tx.update(users).set({ isVerified: true }).where(eq(users.id, userId));
        
        // Create placeholder workspace (matching identity.ts pattern)
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

        await tx
          .insert(memberships)
          .values({
            userId,
            organizationId: org.id,
            role: "owner",
          });
      });

      await createSession(userId, userAgent, ipAddress, true);

      // Use authoritative routing instead of hardcoded redirect
      const resolution = await resolveUserDestination(userId);

      await auditService.log({
        userId,
        action: "registration_direct",
        resource: "users",
        resourceId: userId,
        ipAddress,
        userAgent,
      });

      return {
        success: true,
        requiresVerification: false,
        destination: resolution.destination,
        isCompleted: resolution.hasVerifiedOrg,
      };
    }

    // 7. Generate verification token
    const token = crypto.randomBytes(32).toString("hex");
    const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours

    await db.insert(emailVerifications).values({
      token,
      userId,
      email: emailClean,
      expiresAt,
    });

    // 8. Dispatch verification email
    const subject = "Verify your email address - Operator AI";
    const verificationUrl = `${process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000"}/verify-email?token=${token}`;
    const html = `
      <h2>Verify your email address</h2>
      <p>Hi ${firstName},</p>
      <p>Welcome to Operator! Please verify your email by clicking the link below:</p>
      <p><a href="${verificationUrl}">${verificationUrl}</a></p>
      <p>This verification link expires in 24 hours.</p>
    `;

    await notificationService.sendEmail(emailClean, subject, html);
    console.info(`[Email Dispatch] Verification email dispatched to ${emailClean}`);

    await auditService.log({
      userId,
      action: "registration",
      resource: "users",
      resourceId: userId,
      ipAddress,
      userAgent,
    });

    return { 
      success: true, 
      requiresVerification: true,
    };
  } catch (error: any) {
    console.error("Register action error:", error);
    return { success: false, error: "Failed to create account. Please verify your details and try again." };
  }
}

/**
 * Handles user logout. Removes session and clears cookies.
 */
export async function logoutAction() {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get("session_token")?.value;
    if (token) {
      await deleteSession(token);
    }
    cookieStore.delete("session_token");
    cookieStore.delete("refresh_token");
    cookieStore.delete("active_org_id");
    return { success: true };
  } catch (error) {
    console.error("Logout action error:", error);
    return { success: false, error: "Failed to log out" };
  }
}

/**
 * Validates email verification token and creates session.
 */
export async function verifyEmailAction(input: { token: string }) {
  try {
    const { token } = input;
    if (!token) return { success: false, error: "Token is required" };

    const { userAgent, ipAddress } = await getSafeRequestMetadata();

    const rateLimit = await checkTokenAttemptRateLimit(ipAddress, "verify_email");
    if (rateLimit.isLocked) {
      return { success: false, error: "Too many attempts. Please try again later." };
    }

    const now = new Date();

    // Atomic consumption to prevent race condition / token reuse
    const verifiedUser = await db.transaction(async (tx) => {
      const [updatedToken] = await tx
        .update(emailVerifications)
        .set({ isUsed: true })
        .where(
          and(
            eq(emailVerifications.token, token),
            eq(emailVerifications.isUsed, false),
            gte(emailVerifications.expiresAt, now)
          )
        )
        .returning();

      if (!updatedToken) {
        return null;
      }

      await tx
        .update(users)
        .set({ isVerified: true, updatedAt: new Date() })
        .where(eq(users.id, updatedToken.userId));

      return updatedToken.userId;
    });

    if (!verifiedUser) {
      return { success: false, error: "Invalid or expired verification token" };
    }

    // Automatically create session on successful validation
    await createSession(verifiedUser, userAgent, ipAddress, true);

    await auditService.log({
      userId: verifiedUser,
      action: "email_verification",
      resource: "users",
      resourceId: verifiedUser,
      ipAddress,
      userAgent,
    });

    return { success: true };
  } catch (error: any) {
    console.error("verifyEmailAction error:", error);
    return { success: false, error: "Verification failed or token has expired." };
  }
}

/**
 * Generates and resends a verification email for unverified accounts.
 */
export async function resendVerificationAction(input: { email: string }) {
  try {
    const { email } = input;
    if (!email) return { success: false, error: "Email is required" };

    const { ipAddress } = await getSafeRequestMetadata();
    const emailClean = email.toLowerCase().trim();

    const rateLimit = await checkPasswordResetRateLimit(emailClean, ipAddress);
    if (rateLimit.isLocked) {
      return { success: false, error: "Too many verification requests. Please try again later." };
    }

    const [user] = await db
      .select()
      .from(users)
      .where(eq(users.email, emailClean))
      .limit(1);

    // Anti-enumeration: uniform response whether account exists or is already verified
    if (!user || user.isVerified || user.status === "suspended") {
      return { success: true, message: "If an unverified account matches that email, a verification link has been sent." };
    }

    // Invalidate old tokens
    await db
      .update(emailVerifications)
      .set({ isUsed: true })
      .where(and(eq(emailVerifications.userId, user.id), eq(emailVerifications.isUsed, false)));

    const token = crypto.randomBytes(32).toString("hex");
    const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000);

    await db.insert(emailVerifications).values({
      token,
      userId: user.id,
      email: emailClean,
      expiresAt,
    });

    const subject = "Verify your email address - Operator AI";
    const verificationUrl = `${process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000"}/verify-email?token=${token}`;
    const html = `
      <h2>Verify your email address</h2>
      <p>Hi ${user.firstName || "there"},</p>
      <p>Please verify your email address by clicking the link below:</p>
      <p><a href="${verificationUrl}">${verificationUrl}</a></p>
      <p>This verification link expires in 24 hours.</p>
    `;

    await notificationService.sendEmail(emailClean, subject, html);
    console.info(`[Email Dispatch] Resending verification token dispatched to ${emailClean}`);

    return { success: true, message: "If an unverified account matches that email, a verification link has been sent." };
  } catch (error: any) {
    console.error("resendVerificationAction error:", error);
    return { success: false, error: "Failed to resend verification email. Please try again later." };
  }
}

/**
 * Handles forgot password request. Creates secure reset tokens.
 */
export async function forgotPasswordAction(input: any) {
  try {
    const { email } = input;
    if (!email) return { success: false, error: "Email is required" };

    const { ipAddress } = await getSafeRequestMetadata();
    const emailClean = email.toLowerCase().trim();

    const rateLimit = await checkPasswordResetRateLimit(emailClean, ipAddress);
    if (rateLimit.isLocked) {
      return { success: false, error: "Too many password reset requests. Please try again later." };
    }

    const [user] = await db
      .select({ id: users.id, firstName: users.firstName, status: users.status })
      .from(users)
      .where(eq(users.email, emailClean))
      .limit(1);

    // Anti-enumeration: Return success whether user exists or not, and avoid resetting suspended accounts
    if (!user || user.status === "suspended") {
      return { success: true, message: "If an account matches that email, a password reset link has been sent." };
    }

    // Invalidate old reset tokens
    await db
      .update(passwordResetTokens)
      .set({ isUsed: true })
      .where(and(eq(passwordResetTokens.userId, user.id), eq(passwordResetTokens.isUsed, false)));

    const token = crypto.randomBytes(32).toString("hex");
    const expiresAt = new Date(Date.now() + 1 * 60 * 60 * 1000); // 1 hour

    await db.insert(passwordResetTokens).values({
      token,
      userId: user.id,
      expiresAt,
    });

    const subject = "Reset your password - Operator AI";
    const resetUrl = `${process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000"}/reset-password?token=${token}`;
    const html = `
      <h2>Reset your password</h2>
      <p>Hi ${user.firstName || "there"},</p>
      <p>We received a request to reset your password. Click the link below to verify and configure a new password:</p>
      <p><a href="${resetUrl}">${resetUrl}</a></p>
      <p>This password reset link expires in 1 hour. If you did not make this request, ignore this message.</p>
    `;

    await notificationService.sendEmail(emailClean, subject, html);
    console.info(`[Email Dispatch] Password reset dispatched to ${emailClean}`);

    return { success: true, message: "If an account matches that email, a password reset link has been sent." };
  } catch (error: any) {
    console.error("ForgotPasswordAction error:", error);
    return { success: false, error: "Failed to request password reset. Please try again later." };
  }
}

/**
 * Validates password reset token, updates password, logs out all other sessions, and logs in user.
 */
export async function resetPasswordAction(input: any) {
  try {
    const { token, password } = input;
    if (!token || !password) {
      return { success: false, error: "Token and password are required" };
    }

    const { userAgent, ipAddress } = await getSafeRequestMetadata();

    const rateLimit = await checkTokenAttemptRateLimit(ipAddress, "reset_password");
    if (rateLimit.isLocked) {
      return { success: false, error: "Too many attempts. Please try again later." };
    }

    const now = new Date();

    // Atomic consumption to prevent race conditions and token reuse
    const [resetRecord] = await db.transaction(async (tx) => {
      return await tx
        .update(passwordResetTokens)
        .set({ isUsed: true })
        .where(
          and(
            eq(passwordResetTokens.token, token),
            eq(passwordResetTokens.isUsed, false),
            gte(passwordResetTokens.expiresAt, now)
          )
        )
        .returning();
    });

    if (!resetRecord) {
      return { success: false, error: "Invalid or expired reset token" };
    }

    const [user] = await db.select().from(users).where(eq(users.id, resetRecord.userId)).limit(1);
    if (!user || user.status === "suspended") {
      return { success: false, error: "This account cannot be recovered. Please contact support." };
    }

    // Validate new password complexity
    const strengthResult = analyzePasswordStrength(password, user.email, user.firstName || "", user.lastName || "");
    if (strengthResult.score < 4) {
      return {
        success: false,
        error: "Password does not meet complexity requirements: " + strengthResult.unmetRequirements.join(", "),
      };
    }

    const passwordHashVal = await hashPassword(password);

    await db
      .update(users)
      .set({ passwordHash: passwordHashVal, updatedAt: new Date() })
      .where(eq(users.id, resetRecord.userId));

    // Invalidate other active sessions (prevent credentials reuse)
    await logoutAllDevices(resetRecord.userId);

    // Automatically log in user
    await createSession(resetRecord.userId, userAgent, ipAddress, true);

    await auditService.log({
      userId: resetRecord.userId,
      action: "password_reset",
      resource: "users",
      resourceId: resetRecord.userId,
      ipAddress,
      userAgent,
    });

    return { success: true };
  } catch (error: any) {
    console.error("ResetPasswordAction error:", error);
    return { success: false, error: "Failed to reset password. Please try again." };
  }
}

/**
 * Backwards compatible helper returning the local user session to prevent dashboard crashes.
 */
export async function syncLocalUser() {
  const user = await currentUser();
  if (!user) return null;
  return {
    id: user.id,
    email: user.email,
    name: user.name || null,
    avatar: user.avatar || null,
  };
}

/**
 * Multi-Tenant Org Switcher: Returns all organizations the current user belongs to.
 */
export async function getUserOrganizationsAction() {
  try {
    const { userId, orgId } = await auth();
    if (!userId) {
      return { success: false, error: "Unauthorized", organizations: [] };
    }

    const userMemberships = await db
      .select({
        membershipId: memberships.id,
        role: memberships.role,
        createdAt: memberships.createdAt,
        organization: {
          id: organizations.id,
          name: organizations.name,
          slug: organizations.slug,
          industry: organizations.industry,
          logo: organizations.logo,
        },
      })
      .from(memberships)
      .innerJoin(organizations, eq(memberships.organizationId, organizations.id))
      .where(eq(memberships.userId, userId))
      .orderBy(desc(memberships.createdAt));

    const orgList = userMemberships.map((m) => ({
      id: m.organization.id,
      name: m.organization.name,
      slug: m.organization.slug,
      industry: m.organization.industry,
      logoUrl: m.organization.logo,
      role: m.role,
      isCurrent: m.organization.id === orgId,
    }));

    return {
      success: true,
      currentOrgId: orgId,
      organizations: orgList,
    };
  } catch (error: any) {
    console.error("getUserOrganizationsAction error:", error);
    return { success: false, error: error?.message || "Failed to list organizations", organizations: [] };
  }
}

/**
 * Multi-Tenant Org Switcher: Sets the active organization context cookie and invalidates caches.
 */
export async function switchOrganizationAction(targetOrganizationId: string) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return { success: false, error: "Unauthorized" };
    }

    // Verify membership in target organization
    const [targetMembership] = await db
      .select()
      .from(memberships)
      .where(
        and(
          eq(memberships.userId, userId),
          eq(memberships.organizationId, targetOrganizationId)
        )
      )
      .limit(1);

    if (!targetMembership) {
      return { success: false, error: "Access denied: You are not a member of this organization." };
    }

    // Set active_org_id cookie
    const cookieStore = await cookies();
    cookieStore.set("active_org_id", targetOrganizationId, {
      path: "/",
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: 60 * 60 * 24 * 30, // 30 days
    });

    await auditService.log({
      userId,
      organizationId: targetOrganizationId,
      action: "organization_switched",
      resource: "organizations",
      resourceId: targetOrganizationId,
    });

    revalidatePath("/dashboard");
    revalidatePath("/(dashboard)", "layout");
    revalidatePath("/", "layout");

    return { success: true, organizationId: targetOrganizationId };
  } catch (error: any) {
    console.error("switchOrganizationAction error:", error);
    return { success: false, error: error?.message || "Failed to switch organization" };
  }
}

