import { db } from "../db";
import { operationalExceptions } from "../db/schema";
import { eq, and, desc, sql } from "drizzle-orm";

export const exceptionsRepository = {
  async list(organizationId: string, status?: string, category?: string) {
    const conditions = [eq(operationalExceptions.organizationId, organizationId)];
    if (status && status !== "all") {
      conditions.push(eq(operationalExceptions.status, status));
    }
    if (category && category !== "all") {
      conditions.push(eq(operationalExceptions.category, category));
    }

    return await db
      .select()
      .from(operationalExceptions)
      .where(and(...conditions))
      .orderBy(desc(operationalExceptions.createdAt));
  },

  async findById(id: string) {
    const [record] = await db
      .select()
      .from(operationalExceptions)
      .where(eq(operationalExceptions.id, id));
    return record || null;
  },

  async updateStatus(
    id: string,
    status: "pending" | "investigating" | "resolved" | "ignored",
    notes?: string,
    resolvedBy?: string
  ) {
    const updatePayload: Record<string, any> = {
      status,
      updatedAt: new Date(),
    };
    if (notes) {
      updatePayload.resolutionNotes = notes;
    }
    if (status === "resolved") {
      updatePayload.resolvedAt = new Date();
      if (resolvedBy) updatePayload.resolvedBy = resolvedBy;
    }

    const [updated] = await db
      .update(operationalExceptions)
      .set(updatePayload)
      .where(eq(operationalExceptions.id, id))
      .returning();

    return updated || null;
  },

  async recordRetry(id: string, outcome: { success: boolean; error?: string; timestamp?: string }) {
    const record = await this.findById(id);
    if (!record) return null;

    const currentHistory = Array.isArray(record.retryHistory) ? record.retryHistory : [];
    const newEntry = {
      attemptNumber: record.retryCount + 1,
      timestamp: outcome.timestamp || new Date().toISOString(),
      success: outcome.success,
      error: outcome.error || null,
    };

    const [updated] = await db
      .update(operationalExceptions)
      .set({
        retryCount: record.retryCount + 1,
        retryHistory: [...currentHistory, newEntry],
        status: outcome.success ? "resolved" : "investigating",
        resolvedAt: outcome.success ? new Date() : record.resolvedAt,
        updatedAt: new Date(),
      })
      .where(eq(operationalExceptions.id, id))
      .returning();

    return updated;
  },
};
