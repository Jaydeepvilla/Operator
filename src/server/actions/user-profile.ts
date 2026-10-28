"use server";

import { db } from "@/server/db";
import {
  users,
  profiles,
  userPreferences,
  notificationSettings,
  securitySettings,
  sessions,
  refreshTokens,
  loginHistory,
  auditLogs,
} from "@/server/db/schema";
import { eq, and, ne, desc } from "drizzle-orm";
import { auth, currentUser } from "@/lib/auth/server";
import { logoutAllDevices, logoutDevice } from "@/lib/auth/session";
import { revalidatePath } from "next/cache";
import { cookies, headers } from "next/headers";
import { hashPassword, verifyPassword } from "@/lib/auth/password";
import { analyzePasswordStrength } from "@/lib/auth/security-checks";
import { checkPasswordChangeRateLimit } from "@/lib/auth/rate-limit";
import { auditService } from "../services/audit";

/**
 * Returns personal user profile, preferences, settings, notification settings, and security settings.
 */
export async function getUserProfileAction() {
  try {
    const { userId } = await auth();
    if (!userId) {
      return { success: false, error: "Unauthorized" };
    }

    const [userRecord] = await db.select().from(users).where(eq(users.id, userId)).limit(1);
    if (!userRecord) {
      return { success: false, error: "User not found" };
    }

    let [profileRecord] = await db.select().from(profiles).where(eq(profiles.userId, userId)).limit(1);
    if (!profileRecord) {
      const [newProfile] = await db.insert(profiles).values({ userId }).returning();
      profileRecord = newProfile;
    }

    let [prefsRecord] = await db.select().from(userPreferences).where(eq(userPreferences.userId, userId)).limit(1);
    if (!prefsRecord) {
      const [newPrefs] = await db.insert(userPreferences).values({ userId }).returning();
      prefsRecord = newPrefs;
    }

    let [notifyRecord] = await db.select().from(notificationSettings).where(eq(notificationSettings.userId, userId)).limit(1);
    if (!notifyRecord) {
      const [newNotify] = await db.insert(notificationSettings).values({ userId }).returning();
      notifyRecord = newNotify;
    }

    let [securityRecord] = await db.select().from(securitySettings).where(eq(securitySettings.userId, userId)).limit(1);
    if (!securityRecord) {
      const [newSecurity] = await db.insert(securitySettings).values({ userId }).returning();
      securityRecord = newSecurity;
    }

    return {
      success: true,
      data: {
        user: {
          id: userRecord.id,
          email: userRecord.email,
          name: userRecord.name,
          firstName: userRecord.firstName,
          lastName: userRecord.lastName,
          avatar: userRecord.avatar,
          isVerified: userRecord.isVerified,
          status: userRecord.status,
          createdAt: userRecord.createdAt,
        },
        profile: profileRecord,
        preferences: prefsRecord,
        notifications: notifyRecord,
        security: securityRecord,
      },
    };
  } catch (error: any) {
    console.error("getUserProfileAction error:", error);
    return { success: false, error: "Failed to load personal settings" };
  }
}

/**
 * Updates user profile details in users and profiles tables.
 */
export async function updateUserProfileAction(data: {
  firstName: string;
  lastName: string;
  avatar?: string | null;
  phone?: string | null;
  bio?: string | null;
}) {
  try {
    const { userId } = await auth();
    if (!userId) return { success: false, error: "Unauthorized" };

    const name = `${data.firstName} ${data.lastName}`.trim();

    await db.transaction(async (tx) => {
      // Update users
      await tx
        .update(users)
        .set({
          firstName: data.firstName,
          lastName: data.lastName,
          name,
          avatar: data.avatar,
          updatedAt: new Date(),
        })
        .where(eq(users.id, userId));

      // Update/create profiles
      const [existingProfile] = await tx.select().from(profiles).where(eq(profiles.userId, userId)).limit(1);
      if (existingProfile) {
        await tx
          .update(profiles)
          .set({
            phone: data.phone,
            bio: data.bio,
            updatedAt: new Date(),
          })
          .where(eq(profiles.userId, userId));
      } else {
        await tx.insert(profiles).values({
          userId,
          phone: data.phone,
          bio: data.bio,
        });
      }
    });

    await auditService.log({
      userId,
      action: "profile_update",
      resource: "user_profile",
      resourceId: userId,
      metadata: { name },
    });

    revalidatePath("/profile");
    revalidatePath("/settings");
    revalidatePath("/dashboard");

    return { success: true };
  } catch (error: any) {
    console.error("updateUserProfileAction error:", error);
    return { success: false, error: "Failed to update profile info" };
  }
}

/**
 * Updates user theme, language, and timezone preferences.
 */
export async function updateUserPreferencesAction(data: {
  theme: string;
  language: string;
  timezone: string;
}) {
  try {
    const { userId } = await auth();
    if (!userId) return { success: false, error: "Unauthorized" };

    await db
      .update(userPreferences)
      .set({
        theme: data.theme,
        language: data.language,
        timezone: data.timezone,
        updatedAt: new Date(),
      })
      .where(eq(userPreferences.userId, userId));

    await auditService.log({
      userId,
      action: "preferences_update",
      resource: "user_preferences",
      resourceId: userId,
      metadata: data,
    });

    revalidatePath("/profile");
    return { success: true };
  } catch (error: any) {
    console.error("updateUserPreferencesAction error:", error);
    return { success: false, error: "Failed to update preferences" };
  }
}

/**
 * Updates email, SMS, and push notification settings toggles.
 */
export async function updateNotificationSettingsAction(data: {
  emailNotifications: boolean;
  smsNotifications: boolean;
  pushNotifications: boolean;
}) {
  try {
    const { userId } = await auth();
    if (!userId) return { success: false, error: "Unauthorized" };

    await db
      .update(notificationSettings)
      .set({
        emailNotifications: data.emailNotifications,
        smsNotifications: data.smsNotifications,
        pushNotifications: data.pushNotifications,
        updatedAt: new Date(),
      })
      .where(eq(notificationSettings.userId, userId));

    await auditService.log({
      userId,
      action: "notification_settings_update",
      resource: "notification_settings",
      resourceId: userId,
      metadata: data,
    });

    revalidatePath("/profile");
    return { success: true };
  } catch (error: any) {
    console.error("updateNotificationSettingsAction error:", error);
    return { success: false, error: "Failed to update notification toggles" };
  }
}

/**
 * Changes user credentials password.
 */
export async function changePasswordAction(data: any) {
  try {
    const { userId } = await auth();
    if (!userId) return { success: false, error: "Unauthorized" };

    let ipAddress: string | undefined;
    try {
      const reqHeaders = await headers();
      ipAddress = reqHeaders.get("x-forwarded-for")?.split(",")[0] || reqHeaders.get("x-real-ip") || undefined;
    } catch {}

    const rateLimit = await checkPasswordChangeRateLimit(userId, ipAddress);
    if (rateLimit.isLocked) {
      return { success: false, error: "Too many password change attempts. Please try again later." };
    }

    const { currentPassword, newPassword } = data;
    if (!currentPassword || !newPassword) {
      return { success: false, error: "Current and new passwords are required" };
    }

    if (typeof newPassword !== "string" || newPassword.length < 8 || newPassword.length > 128) {
      return { success: false, error: "New password must be between 8 and 128 characters long" };
    }

    const [user] = await db.select().from(users).where(eq(users.id, userId)).limit(1);
    if (!user || !user.passwordHash) {
      return { success: false, error: "User or password records not found" };
    }

    // Verify current password
    const isCurrentValid = await verifyPassword(currentPassword, user.passwordHash);
    if (!isCurrentValid) {
      return { success: false, error: "Current password is incorrect" };
    }

    // Validate complexity requirements
    const strengthResult = analyzePasswordStrength(newPassword, user.email, user.firstName || "", user.lastName || "");
    if (strengthResult.score < 4) {
      return {
        success: false,
        error: "Password does not meet complexity requirements: " + strengthResult.unmetRequirements.join(", "),
      };
    }

    // Prevent reuse of same password
    const isSameAsCurrent = await verifyPassword(newPassword, user.passwordHash);
    if (isSameAsCurrent) {
      return { success: false, error: "New password cannot be identical to your current password" };
    }

    const newPasswordHash = await hashPassword(newPassword);

    await db
      .update(users)
      .set({ passwordHash: newPasswordHash, updatedAt: new Date() })
      .where(eq(users.id, userId));

    await auditService.log({
      userId,
      action: "password_change",
      resource: "users",
      resourceId: userId,
    });

    // Invalidate other devices if checkbox selected
    if (data.logoutOtherDevices) {
      const cookieStore = await cookies();
      const currentSessionToken = cookieStore.get("session_token")?.value;

      if (currentSessionToken) {
        await db
          .delete(sessions)
          .where(and(eq(sessions.userId, userId), ne(sessions.id, currentSessionToken)));
        await db
          .delete(refreshTokens)
          .where(and(eq(refreshTokens.userId, userId), ne(refreshTokens.sessionId, currentSessionToken)));
      } else {
        await logoutAllDevices(userId);
      }
      
      await auditService.log({
        userId,
        action: "sessions_revocation",
        resource: "sessions",
        resourceId: userId,
        metadata: { scope: "all_except_current" },
      });
    }

    return { success: true };
  } catch (error: any) {
    console.error("changePasswordAction error:", error);
    return { success: false, error: "Failed to change password. Please verify your current password and try again." };
  }
}

/**
 * Returns active device sessions logged in for current user.
 */
export async function getUserSessionsAction() {
  try {
    const { userId } = await auth();
    if (!userId) return { success: false, error: "Unauthorized" };

    const activeSessions = await db
      .select()
      .from(sessions)
      .where(eq(sessions.userId, userId))
      .orderBy(desc(sessions.createdAt));

    const cookieStore = await cookies();
    const currentSessionToken = cookieStore.get("session_token")?.value;

    const formattedSessions = activeSessions.map((session) => ({
      id: session.id,
      userAgent: session.userAgent,
      ipAddress: session.ipAddress,
      isCurrent: session.id === currentSessionToken,
      isIdle: session.isIdle,
      expiresAt: session.expiresAt,
      createdAt: session.createdAt,
    }));

    return { success: true, sessions: formattedSessions };
  } catch (error: any) {
    console.error("getUserSessionsAction error:", error);
    return { success: false, error: "Failed to retrieve active sessions" };
  }
}

/**
 * Returns login history audit trail logs.
 */
export async function getUserLoginHistoryAction() {
  try {
    const { userId } = await auth();
    if (!userId) return { success: false, error: "Unauthorized" };

    const logs = await db
      .select()
      .from(loginHistory)
      .where(eq(loginHistory.userId, userId))
      .orderBy(desc(loginHistory.loginAt))
      .limit(30);

    return { success: true, history: logs };
  } catch (error: any) {
    console.error("getUserLoginHistoryAction error:", error);
    return { success: false, error: "Failed to retrieve login history" };
  }
}

/**
 * Terminates a single active device session.
 */
export async function logoutDeviceAction(sessionId: string) {
  try {
    const { userId } = await auth();
    if (!userId) return { success: false, error: "Unauthorized" };

    // Confirm session belongs to user
    const [session] = await db
      .select()
      .from(sessions)
      .where(and(eq(sessions.id, sessionId), eq(sessions.userId, userId)))
      .limit(1);

    if (!session) {
      return { success: false, error: "Session not found" };
    }

    await logoutDevice(sessionId);

    await auditService.log({
      userId,
      action: "session_deletion",
      resource: "sessions",
      resourceId: sessionId,
    });

    revalidatePath("/profile");
    return { success: true };
  } catch (error: any) {
    console.error("logoutDeviceAction error:", error);
    return { success: false, error: "Failed to terminate session" };
  }
}

/**
 * Terminates all other device sessions.
 */
export async function logoutOtherDevicesAction() {
  try {
    const { userId } = await auth();
    if (!userId) return { success: false, error: "Unauthorized" };

    const cookieStore = await cookies();
    const currentSessionToken = cookieStore.get("session_token")?.value;

    if (!currentSessionToken) {
      return { success: false, error: "Active session token missing" };
    }

    await db
      .delete(sessions)
      .where(and(eq(sessions.userId, userId), ne(sessions.id, currentSessionToken)));
    await db
      .delete(refreshTokens)
      .where(and(eq(refreshTokens.userId, userId), ne(refreshTokens.sessionId, currentSessionToken)));

    await auditService.log({
      userId,
      action: "sessions_revocation",
      resource: "sessions",
      resourceId: userId,
      metadata: { scope: "all_except_current" },
    });

    revalidatePath("/profile");
    return { success: true };
  } catch (error: any) {
    console.error("logoutOtherDevicesAction error:", error);
    return { success: false, error: "Failed to terminate other sessions" };
  }
}

/**
 * Deactivates user account and logs out.
 */
export async function deactivateAccountAction() {
  try {
    const { userId } = await auth();
    if (!userId) return { success: false, error: "Unauthorized" };

    await db
      .update(users)
      .set({ status: "deactivated", updatedAt: new Date() })
      .where(eq(users.id, userId));

    await auditService.log({
      userId,
      action: "account_deactivation",
      resource: "users",
      resourceId: userId,
    });

    await logoutAllDevices(userId);

    return { success: true };
  } catch (error: any) {
    console.error("deactivateAccountAction error:", error);
    return { success: false, error: "Failed to deactivate account" };
  }
}

/**
 * Soft deletes user account and logs out.
 */
export async function deleteAccountAction() {
  try {
    const { userId } = await auth();
    if (!userId) return { success: false, error: "Unauthorized" };

    await db
      .update(users)
      .set({ status: "deactivated", deletedAt: new Date(), updatedAt: new Date() })
      .where(eq(users.id, userId));

    await auditService.log({
      userId,
      action: "account_soft_delete",
      resource: "users",
      resourceId: userId,
    });

    await logoutAllDevices(userId);

    return { success: true };
  } catch (error: any) {
    console.error("deleteAccountAction error:", error);
    return { success: false, error: "Failed to delete account" };
  }
}
