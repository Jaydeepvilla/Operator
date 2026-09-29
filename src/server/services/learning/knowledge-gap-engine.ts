/**
 * OPERATOR AI — KNOWLEDGE GAP & CONFLICT ENGINE
 * Tracks unanswered questions with frequency counters, clusters normalized topics,
 * detects contradictory knowledge across services and FAQs, and isolates data per organization.
 */

import { db } from "../../db";
import {
  aiKnowledgeGaps,
  aiKnowledgeConflicts,
  aiLearningSignals,
  faqItems,
  services,
  businessProfiles,
} from "../../db/schema";
import { eq, and, sql, desc } from "drizzle-orm";

export function normalizeTopic(query: string): string {
  return query
    .toLowerCase()
    .replace(/[^\w\s]/g, " ")
    .replace(/\b(do|does|did|can|could|would|will|should|you|we|i|is|are|was|were|the|a|an|of|for|at|on|in|to|about|please|tell|me|what|how|where|when|who|which|have|has|had|provide|offer|get|give)\b/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function calculateWordSimilarity(a: string, b: string): number {
  const wordsA = new Set(a.split(" ").filter(w => w.length > 2));
  const wordsB = new Set(b.split(" ").filter(w => w.length > 2));
  if (wordsA.size === 0 || wordsB.size === 0) return 0;
  const intersection = new Set([...wordsA].filter(x => wordsB.has(x)));
  const union = new Set([...wordsA, ...wordsB]);
  return intersection.size / union.size;
}


export const knowledgeGapEngine = {
  /**
   * Record a knowledge gap for an unanswered user query.
   * Clusters identical or near-identical queries and tracks frequency.
   */
  async recordGap(params: {
    organizationId: string;
    queryText: string;
    conversationId?: string;
    gapType?: "unknown" | "conflicting" | "ambiguous" | "outdated";
    metadata?: Record<string, any>;
  }) {
    const { organizationId, queryText, conversationId, gapType = "unknown", metadata = {} } = params;
    const normalized = normalizeTopic(queryText);

    if (!normalized || normalized.length < 3) return null;

    try {
      // Find existing open gap with matching or similar normalized topic in this organization
      const openGaps = await db
        .select()
        .from(aiKnowledgeGaps)
        .where(
          and(
            eq(aiKnowledgeGaps.organizationId, organizationId),
            eq(aiKnowledgeGaps.status, "open")
          )
        );

      const matchedGap = openGaps.find(
        (g) => g.normalizedTopic === normalized || calculateWordSimilarity(g.normalizedTopic, normalized) >= 0.65
      );

      if (matchedGap) {
        const gap = matchedGap;
        const newFreq = gap.frequency + 1;
        const samples = Array.isArray(gap.sampleConversations) ? gap.sampleConversations : [];
        if (samples.length < 10) {
          samples.push({
            conversationId: conversationId || "unknown",
            query: queryText.substring(0, 200),
            recordedAt: new Date().toISOString(),
          });
        }

        await db
          .update(aiKnowledgeGaps)
          .set({
            frequency: newFreq,
            sampleConversations: samples,
            lastSeenAt: new Date(),
            updatedAt: new Date(),
          })
          .where(eq(aiKnowledgeGaps.id, gap.id));

        // If repeated (frequency >= 3), ensure high-priority learning signal is recorded
        if (newFreq >= 3) {
          await db.insert(aiLearningSignals).values({
            organizationId,
            signalCategory: "knowledge_gap",
            signalType: "repeated_unanswered_query",
            frequency: newFreq,
            samplePayloads: samples,
            aggregationWindow: `gap_${gap.id}`,
            severity: newFreq >= 10 ? "critical" : "high",
            metadata: { gapId: gap.id, normalizedTopic: normalized },
          }).catch(() => {});
        }

        return { gapId: gap.id, frequency: newFreq, isNew: false };
      }

      // Insert new knowledge gap record
      const [newGap] = await db
        .insert(aiKnowledgeGaps)
        .values({
          organizationId,
          queryText: queryText.substring(0, 300),
          normalizedTopic: normalized,
          frequency: 1,
          gapType,
          status: "open",
          sampleConversations: [
            {
              conversationId: conversationId || "unknown",
              query: queryText.substring(0, 200),
              recordedAt: new Date().toISOString(),
            },
          ],
        })
        .returning();

      return { gapId: newGap.id, frequency: 1, isNew: true };
    } catch (err) {
      console.error("[KnowledgeGapEngine] Error recording gap:", err);
      return null;
    }
  },

  /**
   * Scan for contradictory knowledge across Services, FAQs, and Business Profile.
   * e.g. Price for service X in `services` differs from price in `faqItems`.
   */
  async detectConflicts(organizationId: string) {
    const conflictsFound: Array<{
      topic: string;
      description: string;
      sourceA: string;
      sourceB: string;
      severity: "low" | "medium" | "high" | "critical";
    }> = [];

    try {
      const [orgServices, orgFaqs, [profile]] = await Promise.all([
        db.select().from(services).where(and(eq(services.organizationId, organizationId), eq(services.isActive, true))),
        db.select().from(faqItems).where(and(eq(faqItems.organizationId, organizationId), eq(faqItems.isActive, true))),
        db.select().from(businessProfiles).where(eq(businessProfiles.organizationId, organizationId)),
      ]);

      // Check Services vs FAQs pricing contradictions
      for (const service of orgServices) {
        const serviceName = service.name.toLowerCase();
        const servicePrice = parseFloat(service.price || "0");

        for (const faq of orgFaqs) {
          const faqText = `${faq.question} ${faq.answer}`.toLowerCase();
          if (faqText.includes(serviceName)) {
            // Find price mentions in FAQ: e.g. $100, $50
            const matches = faq.answer.match(/\$(\d+(\.\d{2})?)/g);
            if (matches) {
              for (const match of matches) {
                const faqPrice = parseFloat(match.replace("$", ""));
                if (!isNaN(faqPrice) && Math.abs(faqPrice - servicePrice) > 0.01) {
                  conflictsFound.push({
                    topic: `Pricing Conflict: ${service.name}`,
                    description: `Service catalog lists "${service.name}" at $${servicePrice}, but FAQ "${faq.question}" states ${match}.`,
                    sourceA: `Services Catalog: $${servicePrice}`,
                    sourceB: `FAQ ("${faq.question}"): ${match}`,
                    severity: "high",
                  });
                }
              }
            }
          }
        }
      }

      // Save new conflicts if not already recorded
      for (const conflict of conflictsFound) {
        const existing = await db
          .select()
          .from(aiKnowledgeConflicts)
          .where(
            and(
              eq(aiKnowledgeConflicts.organizationId, organizationId),
              eq(aiKnowledgeConflicts.topic, conflict.topic),
              eq(aiKnowledgeConflicts.status, "open")
            )
          );

        if (existing.length === 0) {
          await db.insert(aiKnowledgeConflicts).values({
            organizationId,
            topic: conflict.topic,
            description: conflict.description,
            sourceA: conflict.sourceA,
            sourceB: conflict.sourceB,
            severity: conflict.severity,
            status: "open",
          });
        }
      }
    } catch (err) {
      console.error("[KnowledgeGapEngine] Conflict detection error:", err);
    }

    return conflictsFound;
  },

  /**
   * List open knowledge gaps for an organization
   */
  async listGaps(organizationId: string) {
    return db
      .select()
      .from(aiKnowledgeGaps)
      .where(eq(aiKnowledgeGaps.organizationId, organizationId))
      .orderBy(desc(aiKnowledgeGaps.frequency), desc(aiKnowledgeGaps.lastSeenAt));
  },

  /**
   * Mark a knowledge gap as resolved (optionally linked to a newly created FAQ item)
   */
  async resolveGap(gapId: string, organizationId: string, resolvedFaqId?: string) {
    return db
      .update(aiKnowledgeGaps)
      .set({
        status: "resolved",
        resolvedFaqId: resolvedFaqId || null,
        updatedAt: new Date(),
      })
      .where(and(eq(aiKnowledgeGaps.id, gapId), eq(aiKnowledgeGaps.organizationId, organizationId)));
  },
};
