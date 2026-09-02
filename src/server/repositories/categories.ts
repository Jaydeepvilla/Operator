import { eq, and } from "drizzle-orm";
import { db } from "../db";
import { knowledgeCategories } from "../db/schema";

export interface NewKnowledgeCategory {
  organizationId: string;
  name: string;
  slug: string;
  description?: string | null;
  icon?: string;
  priority?: string;
  color?: string;
  sortOrder?: number;
  status?: string;
  aiWeight?: string;
  parentId?: string | null;
  visibility?: "public" | "internal" | "ai_only";
  aiInstructions?: string | null;
  isArchived?: boolean;
  createdById?: string | null;
  updatedById?: string | null;
  metadata?: any;
}

export const categoriesRepository = {
  async list(organizationId: string, includeArchived = false) {
    const conditions = [eq(knowledgeCategories.organizationId, organizationId)];
    if (!includeArchived) {
      conditions.push(eq(knowledgeCategories.isArchived, false));
    }
    
    return db
      .select()
      .from(knowledgeCategories)
      .where(and(...conditions))
      .orderBy(knowledgeCategories.sortOrder, knowledgeCategories.name);
  },

  async getById(id: string) {
    const [item] = await db
      .select()
      .from(knowledgeCategories)
      .where(eq(knowledgeCategories.id, id));
    return item || null;
  },

  async getBySlug(organizationId: string, slug: string) {
    const [item] = await db
      .select()
      .from(knowledgeCategories)
      .where(
        and(
          eq(knowledgeCategories.organizationId, organizationId),
          eq(knowledgeCategories.slug, slug)
        )
      );
    return item || null;
  },

  async create(item: NewKnowledgeCategory) {
    const [newItem] = await db.insert(knowledgeCategories).values(item).returning();
    return newItem;
  },

  async update(id: string, organizationId: string, item: Partial<NewKnowledgeCategory>) {
    const [updated] = await db
      .update(knowledgeCategories)
      .set({ ...item, updatedAt: new Date() })
      .where(and(eq(knowledgeCategories.id, id), eq(knowledgeCategories.organizationId, organizationId)))
      .returning();
    return updated;
  },

  async delete(id: string, organizationId: string) {
    await db
      .delete(knowledgeCategories)
      .where(and(eq(knowledgeCategories.id, id), eq(knowledgeCategories.organizationId, organizationId)));
  },
};
