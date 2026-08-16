import { cookies } from "next/headers";
import { db } from "@/server/db";
import { sessions, refreshTokens, devices } from "@/server/db/schema";
import { eq, and } from "drizzle-orm";
import crypto from "crypto";

export interface SessionData {
  id: string;
  userId: string;
  userAgent: string | null;
  ipAddress: string | null;
  fingerprint: string | null;
  isIdle: boolean;
  rememberMe: boolean;
  expiresAt: Date;
  createdAt: Date;
  updatedAt: Date;
}

/**
 * Creates a database session and a refresh token, writing the secure HttpOnly cookies.
 */
export async function createSession(
  userId: string,
  userAgent?: string,
  ipAddress?: string,
  rememberMe = false,
  fingerprint?: string
): Promise<{ sessionToken: string; refreshToken: string }> {
  const sessionToken = crypto.randomBytes(32).toString("hex");
  
  // Expiration settings: 30 days if rememberMe, else 2 hours for standard session in DB
  const sessionExpiryDuration = rememberMe ? 30 * 24 * 60 * 60 * 1000 : 2 * 60 * 60 * 1000;
  const sessionExpiresAt = new Date(Date.now() + sessionExpiryDuration);

  // Insert session
  await db.insert(sessions).values({
    id: sessionToken,
    userId,
    userAgent: userAgent || null,
    ipAddress: ipAddress || null,
    fingerprint: fingerprint || null,
    isIdle: false,
    rememberMe,
    expiresAt: sessionExpiresAt,
  });

  // Set session cookie
  try {
    const cookieStore = await cookies();
    cookieStore.set("session_token", sessionToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
      // If rememberMe is false, omit expires to make it a session-lifetime cookie
      ...(rememberMe ? { expires: sessionExpiresAt } : {}),
    });
  } catch (e) {}

  // Create and set Refresh Token (expires in 30 days)
  const refreshTokenVal = crypto.randomBytes(32).toString("hex");
  const refreshExpiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);
  const refreshTokenId = crypto.randomBytes(16).toString("hex");

  await db.insert(refreshTokens).values({
    id: refreshTokenId,
    token: refreshTokenVal,
    userId,
    sessionId: sessionToken,
    userAgent: userAgent || null,
    ipAddress: ipAddress || null,
    expiresAt: refreshExpiresAt,
    isRevoked: false,
  });

  try {
    const cookieStore = await cookies();
    cookieStore.set("refresh_token", refreshTokenVal, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "strict",
      path: "/api/auth/refresh", // only expose to refresh endpoint
      expires: refreshExpiresAt,
    });
  } catch (e) {}

  // Track browser fingerprint/device if provided
  if (fingerprint) {
    const [existingDevice] = await db
      .select()
      .from(devices)
      .where(and(eq(devices.userId, userId), eq(devices.fingerprint, fingerprint)))
      .limit(1);

    if (existingDevice) {
      await db
        .update(devices)
        .set({ lastActive: new Date() })
        .where(eq(devices.id, existingDevice.id));
    } else {
      // Parse basic device name from User-Agent
      let deviceName = "Unknown Device";
      if (userAgent) {
        if (userAgent.includes("Windows")) deviceName = "Windows Device";
        else if (userAgent.includes("Macintosh")) deviceName = "Mac Device";
        else if (userAgent.includes("iPhone")) deviceName = "iPhone";
        else if (userAgent.includes("Android")) deviceName = "Android Device";
      }

      await db.insert(devices).values({
        userId,
        fingerprint,
        name: deviceName,
        type: userAgent && /Mobile|Android|iPhone/i.test(userAgent) ? "mobile" : "desktop",
      });
    }
  }

  return { sessionToken, refreshToken: refreshTokenVal };
}

/**
 * Rotates an active session ID to prevent session fixation.
 */
export async function rotateSession(
  currentToken: string,
  userAgent?: string,
  ipAddress?: string
): Promise<string | null> {
  const [session] = await db.select().from(sessions).where(eq(sessions.id, currentToken)).limit(1);
  if (!session || Date.now() > session.expiresAt.getTime()) return null;

  const newSessionToken = crypto.randomBytes(32).toString("hex");
  
  await db.transaction(async (tx) => {
    // Insert new session with same attributes
    await tx.insert(sessions).values({
      id: newSessionToken,
      userId: session.userId,
      userAgent: userAgent || session.userAgent,
      ipAddress: ipAddress || session.ipAddress,
      fingerprint: session.fingerprint,
      isIdle: session.isIdle,
      rememberMe: session.rememberMe,
      expiresAt: session.expiresAt,
      createdAt: session.createdAt,
    });

    // Update refresh tokens pointing to this session
    await tx
      .update(refreshTokens)
      .set({ sessionId: newSessionToken })
      .where(eq(refreshTokens.sessionId, currentToken));

    // Delete old session
    await tx.delete(sessions).where(eq(sessions.id, currentToken));
  });

  try {
    const cookieStore = await cookies();
    cookieStore.set("session_token", newSessionToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
      ...(session.rememberMe ? { expires: session.expiresAt } : {}),
    });
  } catch (e) {}

  return newSessionToken;
}

/**
 * Refreshes session tokens. Detects replay attacks and revokes all user sessions if a compromised refresh token is reused.
 */
export async function refreshSession(
  refreshTokenVal: string,
  userAgent?: string,
  ipAddress?: string
): Promise<{ sessionToken: string; refreshToken: string } | null> {
  const [tokenRecord] = await db
    .select()
    .from(refreshTokens)
    .where(eq(refreshTokens.token, refreshTokenVal))
    .limit(1);

  if (!tokenRecord) return null;

  // REPLAY ATTACK DETECTION: If the token is already revoked, revoke all sessions for this user!
  if (tokenRecord.isRevoked || Date.now() > tokenRecord.expiresAt.getTime()) {
    console.warn(`[Security Alert] Revoked or expired refresh token reuse detected for User ${tokenRecord.userId}. Invalidating all sessions!`);
    await logoutAllDevices(tokenRecord.userId);
    return null;
  }

  // Revoke current refresh token
  await db
    .update(refreshTokens)
    .set({ isRevoked: true })
    .where(eq(refreshTokens.id, tokenRecord.id));

  // Get active session
  const [session] = await db
    .select()
    .from(sessions)
    .where(eq(sessions.id, tokenRecord.sessionId))
    .limit(1);

  if (!session) return null;

  // Create new session & rotated refresh token
  const result = await createSession(
    tokenRecord.userId,
    userAgent || tokenRecord.userAgent || undefined,
    ipAddress || tokenRecord.ipAddress || undefined,
    session.rememberMe,
    session.fingerprint || undefined
  );

  // Clean up old session
  await db.delete(sessions).where(eq(sessions.id, tokenRecord.sessionId));

  return result;
}

/**
 * Retrieves a session from the database and extends its expiry if close to expiration.
 */
export async function getSession(token: string): Promise<SessionData | null> {
  const [session] = await db.select().from(sessions).where(eq(sessions.id, token)).limit(1);
  if (!session) return null;
  
  if (Date.now() > session.expiresAt.getTime()) {
    await deleteSession(token);
    return null;
  }
  
  // Extend session if it expires in less than 7 days and rememberMe is enabled
  if (session.rememberMe && session.expiresAt.getTime() - Date.now() < 7 * 24 * 60 * 60 * 1000) {
    const expiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);
    await db.update(sessions).set({ expiresAt }).where(eq(sessions.id, token));
    
    const cookieStore = await cookies();
    cookieStore.set("session_token", token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      expires: expiresAt,
      path: "/",
    });
    session.expiresAt = expiresAt;
  }
  
  return session;
}

/**
 * Deletes a session and its associated refresh tokens from database, clearing cookies.
 */
export async function deleteSession(token: string): Promise<void> {
  await db.delete(sessions).where(eq(sessions.id, token));
  await db.delete(refreshTokens).where(eq(refreshTokens.sessionId, token));
  
  try {
    const cookieStore = await cookies();
    cookieStore.delete("session_token");
    cookieStore.delete("refresh_token");
  } catch (e) {}
}

/**
 * Log out a single specific session.
 */
export async function logoutDevice(sessionId: string): Promise<void> {
  await db.delete(sessions).where(eq(sessions.id, sessionId));
  await db.delete(refreshTokens).where(eq(refreshTokens.sessionId, sessionId));
}

/**
 * Deletes all active sessions for a specific user (force logout all).
 */
export async function logoutAllDevices(userId: string): Promise<void> {
  await db.delete(sessions).where(eq(sessions.userId, userId));
  await db.delete(refreshTokens).where(eq(refreshTokens.userId, userId));
  
  try {
    const cookieStore = await cookies();
    cookieStore.delete("session_token");
    cookieStore.delete("refresh_token");
  } catch (e) {
    // Ignore context errors if run outside request scope
  }
}
