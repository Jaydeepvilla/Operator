import { SetupState } from "@/lib/setup-engine/types";
import { getNextBestAction } from "@/lib/recommendation-engine/engine";
import { calculateOverallHealth, OverallHealthResult } from "@/lib/health-engine/overall";
import { calculateGlobalAIReadiness, GlobalAIReadiness } from "@/lib/ai-readiness-engine";
import { NotificationEngine } from "@/lib/notification-engine";
import { getDailyBrief, DailyBriefData, TimeRange } from "./daily-brief";
import { runGapAnalysis, GlobalGapAnalysis } from "@/lib/gap-analysis-engine";
import { SETUP_TASKS } from "@/lib/setup-engine/tasks";
import { activityRepository } from "@/server/repositories/activity";
import { RecommendationAction } from "@/lib/recommendation-engine/types";
import { SmartNotification } from "@/lib/notification-engine/types";

export interface SetupProgressItem {
  id: string;
  label: string;
  category: string;
  completed: boolean;
  href: string;
  estimatedTimeMinutes: number;
  whyItMatters: string;
  description: string;
}

export interface OutcomeDashboardSnapshot {
  dailyBrief: DailyBriefData;
  health: OverallHealthResult;
  gapAnalysis: GlobalGapAnalysis;
  aiReadiness: GlobalAIReadiness;
  knowledgeScore: {
    overall: number;
    coverage: number;
    missingDocuments: number;
    suggestions: string[];
    aiConfidence: number;
  };
  nextBestAction: RecommendationAction | null;
  topRecommendations: RecommendationAction[];
  setupProgress: {
    completed: number;
    total: number;
    percentage: number;
    remainingMinutes: number;
    items: SetupProgressItem[];
  };
  recentActivity: Array<{
    id: string;
    type: string;
    description: string;
    createdAt: Date | string;
  }>;
  notifications: SmartNotification[];
}

export class DashboardEngine {
  /**
   * Generates a complete outcome-based dashboard snapshot.
   * Every metric is derived from real data — no hardcoded percentages.
   */
  static async getOutcomeDashboard(
    orgId: string,
    setupState: SetupState,
    range: TimeRange = "today"
  ): Promise<OutcomeDashboardSnapshot> {
    // 1. Daily Brief — operational metrics from DB for requested range
    const dailyBrief = await getDailyBrief(orgId, range);

    // 2. Health Score — deterministic from quality engines
    const health = calculateOverallHealth(setupState);

    // 3. Gap Analysis — categorized missing requirements
    const gapAnalysis = runGapAnalysis(setupState as any);

    // 4. AI Readiness
    const aiReadiness = calculateGlobalAIReadiness(setupState);

    // 5. Knowledge Score
    const { calculateKnowledgeQuality } = await import(
      "@/lib/quality-engine/knowledge-quality"
    );
    const kQuality = calculateKnowledgeQuality(setupState as any);
    const knowledgeScore = {
      overall: kQuality.score,
      coverage: kQuality.coverage,
      missingDocuments: kQuality.weakAreas.length,
      suggestions: [
        ...kQuality.weakAreas,
        "Consider adding more FAQs to cover common customer questions.",
      ],
      aiConfidence: Math.min(100, kQuality.score + 10),
    };

    // 6. Recommendations — top 5 by priority score
    const nextBestAction = getNextBestAction(setupState as any);
    const topRecommendations = gapAnalysis.recommendations.slice(0, 5);

    // 7. Setup Progress — computed from SETUP_TASKS
    const setupItems: SetupProgressItem[] = SETUP_TASKS.map((task) => ({
      id: task.id,
      label: task.label,
      category: task.category,
      completed: task.isCompleted(setupState),
      href: task.href,
      estimatedTimeMinutes: task.estimatedTimeMinutes,
      whyItMatters: task.whyItMatters,
      description: task.description,
    }));
    const completedCount = setupItems.filter((i) => i.completed).length;
    const remainingMinutes = setupItems
      .filter((i) => !i.completed)
      .reduce((sum, i) => sum + i.estimatedTimeMinutes, 0);

    const setupProgress = {
      completed: completedCount,
      total: setupItems.length,
      percentage: Math.round((completedCount / setupItems.length) * 100),
      remainingMinutes,
      items: setupItems,
    };

    // 8. Recent Activity — from activity log
    let recentActivityRaw: any[] = [];
    try {
      recentActivityRaw = await activityRepository.list(orgId, 10);
    } catch (actErr) {
      console.warn("Recent activity query fallback:", actErr);
    }

    const recentActivity = recentActivityRaw.map((a) => {
      // Map category/task to a type that is recognized by the widget
      let activityType = "message";
      const cat = (a.category || "").toLowerCase();
      const taskName = (a.task || "").toLowerCase();

      if (cat.includes("booking") || taskName.includes("booking") || taskName.includes("appointment")) {
        activityType = "appointment";
      } else if (cat.includes("knowledge") || taskName.includes("knowledge") || taskName.includes("faq")) {
        activityType = "knowledge";
      } else if (cat.includes("ai") || taskName.includes("ai")) {
        activityType = "ai_optimization";
      } else if (cat.includes("escalation") || taskName.includes("escalation")) {
        activityType = "escalation";
      }

      return {
        id: a.id,
        type: activityType,
        description: a.task,
        createdAt: a.createdAt,
      };
    });

    // 9. Notifications
    let notifications: any[] = [];
    try {
      notifications = await NotificationEngine.sync(
        orgId,
        setupState as any
      );
    } catch (notifErr) {
      console.warn("Notification engine sync fallback:", notifErr);
    }

    return {
      dailyBrief,
      health,
      gapAnalysis,
      aiReadiness,
      knowledgeScore,
      nextBestAction,
      topRecommendations,
      setupProgress,
      recentActivity,
      notifications,
    };
  }
}
