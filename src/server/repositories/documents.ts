import { eq, and } from "drizzle-orm";
import { db } from "../db";
import { knowledgeDocuments } from "../db/schema";

export interface NewKnowledgeDocument {
  organizationId: string;
  sourceId?: string | null;
  categoryId?: string | null;
  name: string;
  fileType: string;
  fileSize?: number | null;
  filePath?: string | null;
  status?: string;
  isArchived?: boolean;
  metadata?: Record<string, any>;
}

export const documentsRepository = {
  async list(organizationId: string, isArchived: boolean = false) {
    return db
      .select()
      .from(knowledgeDocuments)
      .where(
        and(
          eq(knowledgeDocuments.organizationId, organizationId),
          eq(knowledgeDocuments.isArchived, isArchived)
        )
      )
      .orderBy(knowledgeDocuments.createdAt);
  },

  async getById(id: string) {
    const [item] = await db
      .select()
      .from(knowledgeDocuments)
      .where(eq(knowledgeDocuments.id, id));
    return item || null;
  },

  async getBySourceAndName(organizationId: string, sourceId: string, name: string) {
    const [item] = await db
      .select()
      .from(knowledgeDocuments)
      .where(
        and(
          eq(knowledgeDocuments.organizationId, organizationId),
          eq(knowledgeDocuments.sourceId, sourceId),
          eq(knowledgeDocuments.name, name)
        )
      );
    return item || null;
  },

  async create(item: NewKnowledgeDocument) {
    const [newItem] = await db.insert(knowledgeDocuments).values(item).returning();
    return newItem;
  },

  async update(id: string, organizationId: string, item: Partial<NewKnowledgeDocument>) {
    const [updated] = await db
      .update(knowledgeDocuments)
      .set({ ...item, updatedAt: new Date() })
      .where(and(eq(knowledgeDocuments.id, id), eq(knowledgeDocuments.organizationId, organizationId)))
      .returning();
    return updated;
  },

  async delete(id: string, organizationId: string) {
    await db
      .delete(knowledgeDocuments)
      .where(and(eq(knowledgeDocuments.id, id), eq(knowledgeDocuments.organizationId, organizationId)));
  },
};
