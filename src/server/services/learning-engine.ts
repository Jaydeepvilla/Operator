import { db } from "../db";
import {
  conversationEvents,
  widgetEvents,
  conversationFeedback,
  conversationMessages,
  conversations,
  faqItems,
  aiLearningSignals,
  aiImprovementProposals,
  organizations,
} from "../db/schema";
import { eq, and, gte, sql, desc, count } from "drizzle-orm";
import { llmRegistry } from "./llm";

// ============================================================
// SIGNAL AGGREGATOR — Processes raw events into learning signals
// ============================================================

interface AggregatedSignal {
  organizationId: string;
  signalCategory: string;
  signalType: string;
  frequency: number;
  samplePayloads: any[];
  severity: string;
}

function getAggregationWindow(): string {
  const now = new Date();
  const hour = now.getUTCHours();
  const window = Math.floor(hour / 6) * 6;
  return `${now.toISOString().split("T")[0]}_${String(window).padStart(2, "0")}-${String(window + 6).padStart(2, "0")}`;
}

function calculateSeverity(frequency: number, type: string): string {
  if (type === "llm_fallback" && frequency >= 5) return "critical";
  if (type === "rag_empty_result" && frequency >= 10) return "high";
  if (type === "low_confidence_intent" && frequency >= 8) return "high";
  if (frequency >= 20) return "high";
  if (frequency >= 10) return "medium";
  return "low";
}

const SIGNAL_CATEGORY_MAP: Record<string, string> = {
  rag_empty_result: "knowledge_gap",
  low_confidence_intent: "intent_gap",
  llm_fallback: "quality_degradation",
  escalated: "escalation_pattern",
};

export const signalAggregator = {
  /**
   * Process raw conversation_events and widget_events since the last window
   * into aggregated ai_learning_signals.
   */
  async processSignals(): Promise<AggregatedSignal[]> {
    const window = getAggregationWindow();
    const sixHoursAgo = new Date(Date.now() - 6 * 60 * 60 * 1000);

    console.log(`[LearningEngine] Processing signals for window: ${window}`);

    // Get all orgs that have events in this window
    const recentEvents = await db
      .select({
        organizationId: conversationEvents.organizationId,
        eventType: conversationEvents.eventType,
        payload: conversationEvents.payload,
      })
      .from(conversationEvents)
      .where(gte(conversationEvents.createdAt, sixHoursAgo));

    // Group by org + event type
    const grouped = new Map<string, { payloads: any[]; count: number }>();

    for (const event of recentEvents) {
      const learningTypes = [
        "rag_empty_result",
        "low_confidence_intent",
        "llm_fallback",
        "escalated",
      ];
      if (!learningTypes.includes(event.eventType)) continue;

      const key = `${event.organizationId}::${event.eventType}`;
      const entry = grouped.get(key) || { payloads: [], count: 0 };
      entry.count++;
      if (entry.payloads.length < 5) {
        entry.payloads.push(event.payload);
      }
      grouped.set(key, entry);
    }

    const signals: AggregatedSignal[] = [];

    for (const [key, data] of grouped.entries()) {
      const [orgId, eventType] = key.split("::");
      const category = SIGNAL_CATEGORY_MAP[eventType] || "ux_friction";
      const severity = calculateSeverity(data.count, eventType);

      // Check if signal already exists for this window
      const existing = await db
        .select()
        .from(aiLearningSignals)
        .where(
          and(
            eq(aiLearningSignals.organizationId, orgId),
            eq(aiLearningSignals.signalType, eventType),
            eq(aiLearningSignals.aggregationWindow, window)
          )
        );

      if (existing.length === 0) {
        await db.insert(aiLearningSignals).values({
          organizationId: orgId,
          signalCategory: category,
          signalType: eventType,
          frequency: data.count,
          samplePayloads: data.payloads,
          aggregationWindow: window,
          severity,
        });

        signals.push({
          organizationId: orgId,
          signalCategory: category,
          signalType: eventType,
          frequency: data.count,
          samplePayloads: data.payloads,
          severity,
        });
      }
    }

    // Also check for low feedback scores
    const lowRatings = await db
      .select({
        organizationId: conversationFeedback.organizationId,
        cnt: count(),
      })
      .from(conversationFeedback)
      .where(gte(conversationFeedback.createdAt, sixHoursAgo))
      .groupBy(conversationFeedback.organizationId);

    for (const row of lowRatings) {
      const orgId = row.organizationId;
      const ratingCount = Number(row.cnt);

      if (ratingCount >= 3) {
        const existing = await db
          .select()
          .from(aiLearningSignals)
          .where(
            and(
              eq(aiLearningSignals.organizationId, orgId),
              eq(aiLearningSignals.signalType, "low_satisfaction"),
              eq(aiLearningSignals.aggregationWindow, window)
            )
          );

        if (existing.length === 0) {
          await db.insert(aiLearningSignals).values({
            organizationId: orgId,
            signalCategory: "quality_degradation",
            signalType: "low_satisfaction",
            frequency: ratingCount,
            samplePayloads: [],
            aggregationWindow: window,
            severity: ratingCount >= 10 ? "high" : "medium",
          });
        }
      }
    }

    console.log(`[LearningEngine] Processed ${signals.length} new signals`);
    return signals;
  },
};

// ============================================================
// PATTERN DETECTOR — Analyzes signals and generates proposals
// ============================================================

export const patternDetector = {
  /**
   * Analyze unprocessed learning signals and generate improvement proposals.
   */
  async analyzeAndPropose(): Promise<number> {
    const unprocessed = await db
      .select()
      .from(aiLearningSignals)
      .where(sql`${aiLearningSignals.processedAt} IS NULL`)
      .orderBy(desc(aiLearningSignals.createdAt));

    let proposalCount = 0;

    for (const signal of unprocessed) {
      try {
        const proposals = await this.generateProposalsForSignal(signal);

        for (const proposal of proposals) {
          await db.insert(aiImprovementProposals).values({
            organizationId: signal.organizationId,
            signalId: signal.id,
            ...proposal,
          });
          proposalCount++;
        }

        // Mark signal as processed
        await db
          .update(aiLearningSignals)
          .set({ processedAt: new Date() })
          .where(eq(aiLearningSignals.id, signal.id));
      } catch (err) {
        console.error(`[PatternDetector] Error processing signal ${signal.id}:`, err);
      }
    }

    console.log(`[LearningEngine] Generated ${proposalCount} improvement proposals`);
    return proposalCount;
  },

  async generateProposalsForSignal(signal: any): Promise<any[]> {
    const proposals: any[] = [];

    switch (signal.signalType) {
      case "rag_empty_result":
        proposals.push(...(await this.handleKnowledgeGap(signal)));
        break;
      case "low_confidence_intent":
        proposals.push(...(await this.handleIntentGap(signal)));
        break;
      case "llm_fallback":
        proposals.push(...this.handleLLMFallback(signal));
        break;
      case "escalated":
        proposals.push(...this.handleEscalationPattern(signal));
        break;
      case "low_satisfaction":
        proposals.push(...this.handleLowSatisfaction(signal));
        break;
    }

    return proposals;
  },

  /**
   * Knowledge Gap → Propose FAQ additions based on unanswered queries
   */
  async handleKnowledgeGap(signal: any): Promise<any[]> {
    const payloads = signal.samplePayloads as any[];
    if (!payloads || payloads.length === 0) return [];

    const userQueries = payloads
      .map((p: any) => p.userMessage)
      .filter(Boolean)
      .slice(0, 5);

    if (userQueries.length === 0) return [];

    // Use LLM to generate FAQ draft
    try {
      const provider = llmRegistry.getProvider();
      const result = await provider.generateCompletion(
        [
          {
            role: "system",
            content: `You are a knowledge base curator for a business AI receptionist. 
Given the following customer questions that the AI could NOT answer from the knowledge base, 
generate FAQ entries that the business owner should add.
Return a JSON array of objects: [{ "question": "...", "suggestedAnswer": "...", "category": "..." }]
Generate 1-3 FAQ entries. Use professional, helpful language. Leave answer placeholders where business-specific details are needed.`,
          },
          {
            role: "user",
            content: `Unanswered customer queries:\n${userQueries.map((q: string, i: number) => `${i + 1}. "${q}"`).join("\n")}`,
          },
        ],
        { temperature: 0.3, jsonMode: true }
      );

      const faqDrafts = JSON.parse(result.content.trim());

      return (Array.isArray(faqDrafts) ? faqDrafts : []).map((faq: any) => ({
        proposalType: "faq_addition",
        title: `Add FAQ: "${faq.question?.substring(0, 60)}"`,
        description: `${signal.frequency} customers asked about this topic but got no answer. Suggested FAQ:\nQ: ${faq.question}\nA: ${faq.suggestedAnswer}`,
        safetyLevel: "review_required", // FAQ content needs human review
        status: "pending",
        proposedChanges: {
          type: "faq_addition",
          question: faq.question,
          suggestedAnswer: faq.suggestedAnswer,
          category: faq.category || "General",
        },
        impactEstimate: {
          affectedConversations: signal.frequency,
          severity: signal.severity,
        },
      }));
    } catch (err) {
      console.warn("[PatternDetector] LLM unavailable for FAQ generation:", err);
      return [
        {
          proposalType: "faq_addition",
          title: `Knowledge gap detected: ${signal.frequency} unanswered queries`,
          description: `Customers asked questions the knowledge base couldn't answer. Sample queries: ${userQueries.slice(0, 3).join(", ")}`,
          safetyLevel: "review_required",
          status: "pending",
          proposedChanges: { type: "faq_addition", sampleQueries: userQueries },
          impactEstimate: {
            affectedConversations: signal.frequency,
            severity: signal.severity,
          },
        },
      ];
    }
  },

  /**
   * Intent Gap → Propose new keywords for the intent classifier
   */
  async handleIntentGap(signal: any): Promise<any[]> {
    const payloads = signal.samplePayloads as any[];
    if (!payloads || payloads.length === 0) return [];

    const samples = payloads.slice(0, 5).map((p: any) => ({
      message: p.userMessage,
      classifiedAs: p.intent,
      confidence: p.confidence,
    }));

    return [
      {
        proposalType: "intent_keyword",
        title: `Intent classifier gap: ${signal.frequency} low-confidence classifications`,
        description: `The intent classifier returned low confidence (< 0.6) for ${signal.frequency} messages. This suggests missing keywords or new intent types. Sample messages that confused the classifier are included.`,
        safetyLevel: "review_required",
        status: "pending",
        proposedChanges: {
          type: "intent_keyword_addition",
          samples,
          suggestedAction: "Review samples and add relevant keywords to intent.ts rule-based matchers",
        },
        impactEstimate: {
          affectedConversations: signal.frequency,
          severity: signal.severity,
        },
      },
    ];
  },

  /**
   * LLM Fallback → Alert about AI quality degradation
   */
  handleLLMFallback(signal: any): any[] {
    return [
      {
        proposalType: "infrastructure_alert",
        title: `LLM provider fallback: ${signal.frequency} failures in 6h`,
        description: `The primary LLM provider failed ${signal.frequency} times, triggering fallback to deterministic responses. This degrades answer quality.`,
        safetyLevel: signal.severity === "critical" ? "review_required" : "auto_safe",
        status: "pending",
        proposedChanges: {
          type: "infrastructure_alert",
          action: "Check LLM API keys, quotas, and billing. Consider adding a secondary provider.",
        },
        impactEstimate: {
          affectedConversations: signal.frequency,
          severity: signal.severity,
        },
      },
    ];
  },

  /**
   * Escalation Pattern → Analyze why conversations escalate
   */
  handleEscalationPattern(signal: any): any[] {
    if (signal.frequency < 3) return []; // Only flag patterns, not one-offs

    return [
      {
        proposalType: "escalation_analysis",
        title: `High escalation rate: ${signal.frequency} escalations in 6h`,
        description: `${signal.frequency} conversations were escalated to human agents. This may indicate missing knowledge, poor AI responses, or a genuine surge in complex queries.`,
        safetyLevel: "review_required",
        status: "pending",
        proposedChanges: {
          type: "escalation_analysis",
          action: "Review escalated conversations to identify common themes and add missing knowledge.",
        },
        impactEstimate: {
          affectedConversations: signal.frequency,
          severity: signal.severity,
        },
      },
    ];
  },

  /**
   * Low Satisfaction → Flag for quality review
   */
  handleLowSatisfaction(signal: any): any[] {
    return [
      {
        proposalType: "quality_review",
        title: `Low satisfaction detected: ${signal.frequency} feedback entries`,
        description: `Customer satisfaction signals indicate quality issues. Review recent conversations for common pain points.`,
        safetyLevel: "review_required",
        status: "pending",
        proposedChanges: {
          type: "quality_review",
          action: "Review conversations with low ratings and identify improvement areas in prompts, knowledge base, or booking flow.",
        },
        impactEstimate: {
          affectedConversations: signal.frequency,
          severity: signal.severity,
        },
      },
    ];
  },
};

// ============================================================
// PROPOSAL APPLICATOR — Safely applies auto_safe proposals
// ============================================================

export const proposalApplicator = {
  /**
   * Apply proposals that are marked as auto_safe and approved.
   * Currently supports: infrastructure_alert auto-acknowledgment.
   * FAQ additions and intent keywords require human review.
   */
  async applyAutoSafe(): Promise<number> {
    const autoSafe = await db
      .select()
      .from(aiImprovementProposals)
      .where(
        and(
          eq(aiImprovementProposals.safetyLevel, "auto_safe"),
          eq(aiImprovementProposals.status, "pending")
        )
      );

    let appliedCount = 0;

    for (const proposal of autoSafe) {
      try {
        // For now, auto_safe proposals are just acknowledged
        // More sophisticated auto-apply logic can be added per proposal type
        await db
          .update(aiImprovementProposals)
          .set({
            status: "applied",
            appliedAt: new Date(),
            appliedBy: "auto",
            updatedAt: new Date(),
          })
          .where(eq(aiImprovementProposals.id, proposal.id));

        appliedCount++;
      } catch (err) {
        console.error(`[ProposalApplicator] Failed to apply proposal ${proposal.id}:`, err);
      }
    }

    console.log(`[LearningEngine] Auto-applied ${appliedCount} safe proposals`);
    return appliedCount;
  },
};

// ============================================================
// LEARNING ENGINE — Main orchestrator for the self-improving loop
// ============================================================

export const learningEngine = {
  /**
   * Run the complete learning cycle:
   * 1. Aggregate raw events into signals
   * 2. Analyze signals and generate proposals
   * 3. Auto-apply safe proposals
   */
  async runCycle(): Promise<{
    signals: number;
    proposals: number;
    autoApplied: number;
  }> {
    console.log("[LearningEngine] === Starting learning cycle ===");
    const startTime = Date.now();

    // Step 1: Aggregate signals
    const signals = await signalAggregator.processSignals();

    // Step 2: Generate proposals from signals
    const proposalCount = await patternDetector.analyzeAndPropose();

    // Step 3: Auto-apply safe proposals
    const autoApplied = await proposalApplicator.applyAutoSafe();

    const duration = Date.now() - startTime;
    console.log(
      `[LearningEngine] === Cycle complete in ${duration}ms: ${signals.length} signals, ${proposalCount} proposals, ${autoApplied} auto-applied ===`
    );

    return {
      signals: signals.length,
      proposals: proposalCount,
      autoApplied,
    };
  },

  /**
   * Get dashboard summary for an organization
   */
  async getDashboardSummary(organizationId: string) {
    const recentSignals = await db
      .select()
      .from(aiLearningSignals)
      .where(eq(aiLearningSignals.organizationId, organizationId))
      .orderBy(desc(aiLearningSignals.createdAt))
      .limit(20);

    const pendingProposals = await db
      .select()
      .from(aiImprovementProposals)
      .where(
        and(
          eq(aiImprovementProposals.organizationId, organizationId),
          eq(aiImprovementProposals.status, "pending")
        )
      )
      .orderBy(desc(aiImprovementProposals.createdAt));

    const appliedProposals = await db
      .select()
      .from(aiImprovementProposals)
      .where(
        and(
          eq(aiImprovementProposals.organizationId, organizationId),
          eq(aiImprovementProposals.status, "applied")
        )
      )
      .orderBy(desc(aiImprovementProposals.appliedAt))
      .limit(10);

    // Aggregate signal categories
    const signalSummary: Record<string, number> = {};
    for (const s of recentSignals) {
      signalSummary[s.signalCategory] = (signalSummary[s.signalCategory] || 0) + s.frequency;
    }

    return {
      recentSignals,
      pendingProposals,
      appliedProposals,
      signalSummary,
      totalPending: pendingProposals.length,
      totalApplied: appliedProposals.length,
    };
  },
};
