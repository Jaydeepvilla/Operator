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
import { cookies, headers } from "next/headers";
import { revalidatePath } from "next/cache";
import { checkLoginRateLimit, recordLoginAttempt } from "@/lib/auth/rate-limit";
import { isReservedEmail, isDisposableEmail, analyzePasswordStrength } from "@/lib/auth/security-checks";
import crypto from "crypto";
import { notificationService } from "../services/notification";
import { auditService } from "../services/audit";
import { loginSchema, registrationSchema, forgotPasswordSchema, resetPasswordSchema } from "@/lib/validators";

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

    const reqHeaders = await headers();
    const userAgent = reqHeaders.get("user-agent") || undefined;
    const ipAddress = reqHeaders.get("x-forwarded-for")?.split(",")[0] || reqHeaders.get("x-real-ip") || undefined;

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
      await recordLoginAttempt(email, false, ipAddress, userAgent);
      return {
        success: false,
        code: "USER_NOT_FOUND",
        error: "No account found.",
      };
    }

    // 3. Check suspension
    if (user.status === "suspended") {
      await recordLoginAttempt(email, false, ipAddress, userAgent);
      return {
        success: false,
        error: "Your account has been suspended by an administrator.",
      };
    }

    // 4. Verify password complexity & correctness
    const isValid = user.passwordHash ? await verifyPassword(password, user.passwordHash) : false;
    if (!isValid) {
      await recordLoginAttempt(email, false, ipAddress, userAgent);
      return {
        success: false,
        error: "Invalid email or password",
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
      resourceId: sessionToken,
      ipAddress,
      userAgent,
    });

    return { success: true };
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

    const reqHeaders = await headers();
    const userAgent = reqHeaders.get("user-agent") || undefined;
    const ipAddress = reqHeaders.get("x-forwarded-for")?.split(",")[0] || reqHeaders.get("x-real-ip") || undefined;

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
      await db.update(users).set({ isVerified: true }).where(eq(users.id, userId));
      await createSession(userId, userAgent, ipAddress, true);

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
    console.log(`[Email Dispatch] Verification email link generated for ${emailClean}: ${verificationUrl}`);

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
      devToken: token
    };
  } catch (error: any) {
    console.error("Register action error:", error);
    return { success: false, error: error.message || "Failed to create account" };
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

    const [verification] = await db
      .select()
      .from(emailVerifications)
      .where(and(eq(emailVerifications.token, token), eq(emailVerifications.isUsed, false)))
      .limit(1);

    if (!verification || Date.now() > verification.expiresAt.getTime()) {
      return { success: false, error: "Invalid or expired verification token" };
    }

    const reqHeaders = await headers();
    const userAgent = reqHeaders.get("user-agent") || undefined;
    const ipAddress = reqHeaders.get("x-forwarded-for")?.split(",")[0] || reqHeaders.get("x-real-ip") || undefined;

    await db.transaction(async (tx) => {
      // Mark email as verified
      await tx
        .update(users)
        .set({ isVerified: true, updatedAt: new Date() })
        .where(eq(users.id, verification.userId));

      // Mark token as used
      await tx
        .update(emailVerifications)
        .set({ isUsed: true })
        .where(eq(emailVerifications.id, verification.id));
    });

    // Automatically create session on successful validation
    await createSession(verification.userId, userAgent, ipAddress, true);

    await auditService.log({
      userId: verification.userId,
      action: "email_verification",
      resource: "users",
      resourceId: verification.userId,
      ipAddress,
      userAgent,
    });

    return { success: true };
  } catch (error: any) {
    console.error("verifyEmailAction error:", error);
    return { success: false, error: error.message || "Verification failed" };
  }
}

/**
 * Generates and resends a verification email for unverified accounts.
 */
export async function resendVerificationAction(input: { email: string }) {
  try {
    const { email } = input;
    if (!email) return { success: false, error: "Email is required" };

    const emailClean = email.toLowerCase().trim();

    const [user] = await db
      .select()
      .from(users)
      .where(eq(users.email, emailClean))
      .limit(1);

    if (!user) return { success: false, error: "No account found with this email" };
    if (user.isVerified) return { success: false, error: "Email address is already verified" };

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
    console.log(`[Email Dispatch] Resending verification token link: ${verificationUrl}`);

    return { success: true };
  } catch (error: any) {
    console.error("resendVerificationAction error:", error);
    return { success: false, error: error.message || "Failed to resend verification email" };
  }
}

/**
 * Handles forgot password request. Creates secure reset tokens.
 */
export async function forgotPasswordAction(input: any) {
  try {
    const { email } = input;
    if (!email) return { success: false, error: "Email is required" };

    const emailClean = email.toLowerCase().trim();

    const [user] = await db
      .select({ id: users.id, firstName: users.firstName })
      .from(users)
      .where(eq(users.email, emailClean))
      .limit(1);

    if (!user) {
      // Return success to prevent email enumeration attacks
      return { success: true };
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
    console.log(`[Email Dispatch] Password reset link generated: ${resetUrl}`);

    return { success: true };
  } catch (error: any) {
    console.error("ForgotPasswordAction error:", error);
    return { success: false, error: "Failed to request password reset" };
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

    const [resetRecord] = await db
      .select()
      .from(passwordResetTokens)
      .where(and(eq(passwordResetTokens.token, token), eq(passwordResetTokens.isUsed, false)))
      .limit(1);

    if (!resetRecord || Date.now() > resetRecord.expiresAt.getTime()) {
      return { success: false, error: "Invalid or expired reset token" };
    }

    const [user] = await db.select().from(users).where(eq(users.id, resetRecord.userId)).limit(1);
    if (!user) return { success: false, error: "User record not found" };

    // Validate new password complexity
    const strengthResult = analyzePasswordStrength(password, user.email, user.firstName || "", user.lastName || "");
    if (strengthResult.score < 4) {
      return {
        success: false,
        error: "Password does not meet complexity requirements: " + strengthResult.unmetRequirements.join(", "),
      };
    }

    const passwordHashVal = await hashPassword(password);

    await db.transaction(async (tx) => {
      // 1. Update password
      await tx
        .update(users)
        .set({ passwordHash: passwordHashVal, updatedAt: new Date() })
        .where(eq(users.id, resetRecord.userId));

      // 2. Mark token as used
      await tx
        .update(passwordResetTokens)
        .set({ isUsed: true })
        .where(eq(passwordResetTokens.id, resetRecord.id));
    });

    const reqHeaders = await headers();
    const userAgent = reqHeaders.get("user-agent") || undefined;
    const ipAddress = reqHeaders.get("x-forwarded-for")?.split(",")[0] || reqHeaders.get("x-real-ip") || undefined;

    // 3. Invalidate other active sessions (prevent credentials reuse)
    await logoutAllDevices(resetRecord.userId);

    // 4. Automatically log in user
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
    return { success: false, error: error.message || "Failed to reset password" };
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

