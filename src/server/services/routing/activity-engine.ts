/**
 * Meaningful User Activity & Interrupted Workflow Engine
 * 
 * Tracks critical lifecycle events server-side and identifies actionable
 * unfinished user workflows to dynamically resume on login or return.
 */

import { db } from "../../db";
import { businessActivityLog, bookingRules, calendarConnections, organizations } from "../../db/schema";
import { eq, desc, and } from "drizzle-orm";
import { MeaningfulEventType, InterruptedWorkflow } from "./types";
import { importsRepository } from "../../repositories/imports";

export class MeaningfulActivityEngine {
  /**
   * Records a meaningful lifecycle event to the database.
   */
  static async recordEvent(
    organizationId: string,
    eventType: MeaningfulEventType,
    metadata: Record<string, any> = {}
  ): Promise<void> {
    try {
      await db.insert(businessActivityLog).values({
        organizationId,
        category: "meaningful_activity",
        task: eventType,
        impact: "high",
        metadata: {
          eventType,
          recordedAt: new Date().toISOString(),
          ...metadata,
        },
      });
    } catch (err) {
      console.warn("[MeaningfulActivityEngine] Failed to record event:", err);
    }
  }

  /**
   * Retrieves the last meaningful action logged for the organization.
   */
  static async getLastMeaningfulAction(organizationId: string): Promise<{
    action: MeaningfulEventType | null;
    timestamp: Date | null;
    metadata: Record<string, any>;
  }> {
    try {
      const [lastLog] = await db
        .select()
        .from(businessActivityLog)
        .where(
          and(
            eq(businessActivityLog.organizationId, organizationId),
            eq(businessActivityLog.category, "meaningful_activity")
          )
        )
        .orderBy(desc(businessActivityLog.createdAt))
        .limit(1);

      if (!lastLog) {
        return { action: null, timestamp: null, metadata: {} };
      }

      const meta = (lastLog.metadata as any) || {};
      return {
        action: (lastLog.task as MeaningfulEventType) || null,
        timestamp: lastLog.createdAt,
        metadata: meta,
      };
    } catch {
      return { action: null, timestamp: null, metadata: {} };
    }
  }

  /**
   * Inspects database state to determine if the organization has an active, actionable
   * unfinished workflow that should take priority on return.
   */
  static async detectInterruptedWorkflow(
    organizationId: string,
    onboardingStatus: string,
    onboardingStep?: string
  ): Promise<InterruptedWorkflow | null> {
    try {
      // 1. Check Onboarding Incomplete
      if (onboardingStatus && onboardingStatus !== "completed") {
        const step = onboardingStep && onboardingStep !== "url" ? onboardingStep : "business";
        return {
          type: "onboarding",
          targetRoute: `/onboarding?step=${step}`,
          reason: "INTERRUPTED_ONBOARDING_STEP",
          actionableMessage: `Resume onboarding at step: ${step}`,
          updatedAt: new Date(),
        };
      }

      // 2. Check Unfinished Website Import / Knowledge Ingestion
      const recentImports = await importsRepository.list(organizationId).catch(() => []);
      const activeImport = recentImports.find(
        (imp: any) => imp.status === "in_progress" || imp.status === "pending" || imp.status === "crawling"
      );

      if (activeImport) {
        return {
          type: "knowledge_import",
          targetRoute: "/kb?tab=import",
          reason: "INTERRUPTED_KNOWLEDGE_IMPORT",
          actionableMessage: "Continue your website import",
          metadata: { importId: activeImport.id, url: activeImport.url },
          updatedAt: new Date(activeImport.createdAt || Date.now()),
        };
      }

      // 3. Check Interrupted Calendar Connection
      // If organization has booking rules enabled but 0 calendar connections
      const [rules, connections] = await Promise.all([
        db.query.bookingRules.findFirst({
          where: eq(bookingRules.organizationId, organizationId),
        }).catch(() => null),
        db.query.calendarConnections.findMany({
          where: eq(calendarConnections.organizationId, organizationId),
        }).catch(() => []),
      ]);

      if (rules && connections.length === 0) {
        // Only trigger if an attempt was previously made (logged in activity)
        const lastAction = await this.getLastMeaningfulAction(organizationId);
        if (
          lastAction.action === "CALENDAR_DISCONNECTED" ||
          lastAction.action === "SETTINGS_CHANGED"
        ) {
          return {
            type: "calendar_setup",
            targetRoute: "/settings/booking",
            reason: "INTERRUPTED_CALENDAR_SETUP",
            actionableMessage: "Complete your calendar integration for online booking",
            updatedAt: lastAction.timestamp || new Date(),
          };
        }
      }

      return null;
    } catch (err) {
      console.warn("[MeaningfulActivityEngine] detectInterruptedWorkflow fallback:", err);
      return null;
    }
  }
}
