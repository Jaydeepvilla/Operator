import crypto from "crypto";
import { db } from "../../db";
import { agencyAuditLogs } from "../../db/schema";

function getImpersonationKey(): Buffer {
  const secret = process.env.IMPERSONATION_SECRET;
  if (!secret) {
    if (process.env.NODE_ENV === "production") {
      throw new Error("[Agency Impersonation] Fatal: IMPERSONATION_SECRET environment variable is required in production.");
    }
    return crypto.createHash("sha256").update("operator-dev-impersonation-secret-key-2026").digest();
  }
  return crypto.createHash("sha256").update(secret).digest();
}

const GCM_IV_LENGTH = 12;

export interface ImpersonationPayload {
  agencyId: string;
  actorUserId: string;
  targetOrganizationId: string;
  expiresAt: number;
}

export const agencyImpersonation = {
  /**
   * Generates an authenticated encrypted token (AES-256-GCM) that allows agency staff to impersonate a client workspace
   */
  async generateImpersonationToken(options: {
    agencyId: string;
    actorUserId: string;
    targetOrganizationId: string;
  }): Promise<string> {
    const { agencyId, actorUserId, targetOrganizationId } = options;

    try {
      const payload: ImpersonationPayload = {
        agencyId,
        actorUserId,
        targetOrganizationId,
        expiresAt: Date.now() + 15 * 60 * 1000, // 15 minutes expiration
      };

      const key = getImpersonationKey();
      const iv = crypto.randomBytes(GCM_IV_LENGTH);
      const cipher = crypto.createCipheriv("aes-256-gcm", key, iv);
      let encrypted = cipher.update(JSON.stringify(payload), "utf8", "hex");
      encrypted += cipher.final("hex");
      const authTag = cipher.getAuthTag();

      // Format: iv:authTag:ciphertext
      const token = `${iv.toString("hex")}:${authTag.toString("hex")}:${encrypted}`;

      // Insert audit log record (resilient to transient log failures)
      try {
        await db
          .insert(agencyAuditLogs)
          .values({
            agencyId,
            userId: actorUserId,
            action: "impersonation-start",
            targetId: targetOrganizationId,
            details: { timestamp: new Date().toISOString() },
          });
      } catch (logErr) {
        console.warn("[Agency Impersonation] Failed to record audit log:", logErr);
      }

      return token;
    } catch (e) {
      console.error("[Agency Impersonation] Token generation failed:", e);
      throw new Error("Failed to generate impersonation session");
    }
  },

  /**
   * Decrypts and cryptographically verifies an impersonation token
   */
  verifyImpersonationToken(token: string): ImpersonationPayload {
    try {
      const parts = token.split(":");
      let decrypted: string;

      if (parts.length === 3) {
        // Authenticated AES-256-GCM token: iv:authTag:ciphertext
        const [ivHex, authTagHex, encryptedHex] = parts;
        const key = getImpersonationKey();
        const iv = Buffer.from(ivHex, "hex");
        const authTag = Buffer.from(authTagHex, "hex");
        const decipher = crypto.createDecipheriv("aes-256-gcm", key, iv);
        decipher.setAuthTag(authTag);
        decrypted = decipher.update(encryptedHex, "hex", "utf8");
        decrypted += decipher.final("utf8");
      } else if (parts.length === 2) {
        // Legacy CBC token compatibility fallback
        const [ivHex, encryptedHex] = parts;
        const key = getImpersonationKey();
        const iv = Buffer.from(ivHex, "hex");
        const decipher = crypto.createDecipheriv("aes-256-cbc", key, iv);
        decrypted = decipher.update(encryptedHex, "hex", "utf8");
        decrypted += decipher.final("utf8");
      } else {
        throw new Error("Invalid token format");
      }

      const payload = JSON.parse(decrypted) as ImpersonationPayload;

      // Verify expiration
      if (Date.now() > payload.expiresAt) {
        throw new Error("Token expired");
      }

      return payload;
    } catch (e: any) {
      console.error("[Agency Impersonation] Verification failed:", e);
      throw new Error(e?.message || "Token verification failure");
    }
  },

  /**
   * Logs an audit event when an impersonation session terminates
   */
  async logImpersonationEnd(agencyId: string, actorUserId: string, targetOrganizationId: string) {
    try {
      await db
        .insert(agencyAuditLogs)
        .values({
          agencyId,
          userId: actorUserId,
          action: "impersonation-end",
          targetId: targetOrganizationId,
          details: { timestamp: new Date().toISOString() },
        });
    } catch (e) {
      console.error("[Agency Impersonation] Failed to log impersonation-end audit trail:", e);
    }
  }
};
