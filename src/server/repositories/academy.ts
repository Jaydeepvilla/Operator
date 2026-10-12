import { db } from "../db";
import { founderLearningProgress } from "../db/schema";
import { eq, and } from "drizzle-orm";

export interface FounderProgressRecord {
  id: string;
  userId: string;
  organizationId: string;
  currentModuleId: string;
  modulesStarted: string[];
  lessonsCompleted: string[];
  exercisesPassed: string[];
  workflowsPracticed: string[];
  unresolvedBlockers: any[];
  recommendedNextLesson: string;
  simulatorResults: Record<string, any>;
  lastActivityAt: Date;
  createdAt: Date;
  updatedAt: Date;
}

export const academyRepository = {
  async getOrCreateProgress(userId: string, organizationId: string): Promise<FounderProgressRecord> {
    const [existing] = await db
      .select()
      .from(founderLearningProgress)
      .where(
        and(
          eq(founderLearningProgress.userId, userId),
          eq(founderLearningProgress.organizationId, organizationId)
        )
      );

    if (existing) {
      return existing as FounderProgressRecord;
    }

    const [created] = await db
      .insert(founderLearningProgress)
      .values({
        userId,
        organizationId,
        currentModuleId: "module-1",
        modulesStarted: ["module-1"],
        lessonsCompleted: [],
        exercisesPassed: [],
        workflowsPracticed: [],
        unresolvedBlockers: [],
        recommendedNextLesson: "module-1-lesson-1",
        simulatorResults: {},
        lastActivityAt: new Date(),
        updatedAt: new Date(),
      })
      .returning();

    return created as FounderProgressRecord;
  },

  async completeLesson(
    userId: string,
    organizationId: string,
    lessonId: string,
    nextLessonId?: string
  ): Promise<FounderProgressRecord> {
    const current = await this.getOrCreateProgress(userId, organizationId);
    const completedSet = new Set(current.lessonsCompleted || []);
    completedSet.add(lessonId);

    // If lesson belongs to a module, ensure that module is in modulesStarted
    const moduleIdMatch = lessonId.match(/^(module-\d+)/);
    const startedSet = new Set(current.modulesStarted || []);
    if (moduleIdMatch) {
      startedSet.add(moduleIdMatch[1]);
    }

    const [updated] = await db
      .update(founderLearningProgress)
      .set({
        lessonsCompleted: Array.from(completedSet),
        modulesStarted: Array.from(startedSet),
        recommendedNextLesson: nextLessonId || current.recommendedNextLesson,
        lastActivityAt: new Date(),
        updatedAt: new Date(),
      })
      .where(
        and(
          eq(founderLearningProgress.userId, userId),
          eq(founderLearningProgress.organizationId, organizationId)
        )
      )
      .returning();

    return updated as FounderProgressRecord;
  },

  async passExercise(
    userId: string,
    organizationId: string,
    exerciseId: string
  ): Promise<FounderProgressRecord> {
    const current = await this.getOrCreateProgress(userId, organizationId);
    const exerciseSet = new Set(current.exercisesPassed || []);
    exerciseSet.add(exerciseId);

    const [updated] = await db
      .update(founderLearningProgress)
      .set({
        exercisesPassed: Array.from(exerciseSet),
        lastActivityAt: new Date(),
        updatedAt: new Date(),
      })
      .where(
        and(
          eq(founderLearningProgress.userId, userId),
          eq(founderLearningProgress.organizationId, organizationId)
        )
      )
      .returning();

    return updated as FounderProgressRecord;
  },

  async recordWorkflowPracticed(
    userId: string,
    organizationId: string,
    workflowId: string
  ): Promise<FounderProgressRecord> {
    const current = await this.getOrCreateProgress(userId, organizationId);
    const workflowSet = new Set(current.workflowsPracticed || []);
    workflowSet.add(workflowId);

    const [updated] = await db
      .update(founderLearningProgress)
      .set({
        workflowsPracticed: Array.from(workflowSet),
        lastActivityAt: new Date(),
        updatedAt: new Date(),
      })
      .where(
        and(
          eq(founderLearningProgress.userId, userId),
          eq(founderLearningProgress.organizationId, organizationId)
        )
      )
      .returning();

    return updated as FounderProgressRecord;
  },

  async recordSimulatorResult(
    userId: string,
    organizationId: string,
    scenarioId: string,
    result: { success: boolean; details?: any; timestamp?: string }
  ): Promise<FounderProgressRecord> {
    const current = await this.getOrCreateProgress(userId, organizationId);
    const results = (current.simulatorResults as Record<string, any>) || {};
    results[scenarioId] = {
      ...result,
      timestamp: result.timestamp || new Date().toISOString(),
    };

    const [updated] = await db
      .update(founderLearningProgress)
      .set({
        simulatorResults: results,
        lastActivityAt: new Date(),
        updatedAt: new Date(),
      })
      .where(
        and(
          eq(founderLearningProgress.userId, userId),
          eq(founderLearningProgress.organizationId, organizationId)
        )
      )
      .returning();

    return updated as FounderProgressRecord;
  },

  async resetProgress(userId: string, organizationId: string): Promise<FounderProgressRecord> {
    const [updated] = await db
      .update(founderLearningProgress)
      .set({
        currentModuleId: "module-1",
        modulesStarted: ["module-1"],
        lessonsCompleted: [],
        exercisesPassed: [],
        workflowsPracticed: [],
        unresolvedBlockers: [],
        recommendedNextLesson: "module-1-lesson-1",
        simulatorResults: {},
        lastActivityAt: new Date(),
        updatedAt: new Date(),
      })
      .where(
        and(
          eq(founderLearningProgress.userId, userId),
          eq(founderLearningProgress.organizationId, organizationId)
        )
      )
      .returning();

    return updated as FounderProgressRecord;
  },
};
