import { eq, and, desc } from "drizzle-orm";
import { db } from "../db";
import { conversations } from "../db/schema";

export interface NewConversation {
  organizationId: string;
  leadProfileId?: string;
  status?: string;
  metadata?: Record<string, any>;
}

export const conversationsRepository = {
  async findById(id: string) {
    const [conv] = await db
      .select()
      .from(conversations)
      .where(eq(conversations.id, id));
    return conv || null;
  },

  async list(organizationId: string) {
    return db
      .select()
      .from(conversations)
      .where(eq(conversations.organizationId, organizationId))
      .orderBy(desc(conversations.updatedAt));
  },

  async create(conv: NewConversation) {
    const [newConv] = await db.insert(conversations).values(conv).returning();
    return newConv;
  },

  async update(id: string, updates: Partial<NewConversation>, organizationId?: string) {
    const [updated] = await db
      .update(conversations)
      .set({ ...updates, updatedAt: new Date() })
      .where(eq(conversations.id, id))
      .returning();
    return updated;
  },

  async delete(id: string) {
    await db.delete(conversations).where(eq(conversations.id, id));
  },
};
