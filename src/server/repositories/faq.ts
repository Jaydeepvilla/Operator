import { eq, and, inArray } from "drizzle-orm";
import { db } from "../db";
import { faqItems } from "../db/schema";

export interface NewFaqItem {
  organizationId: string;
  question: string;
  answer: string;
  category: string;
  isActive?: boolean;
  order?: number;
}

export const faqRepository = {
  async list(organizationId: string) {
    return db
      .select()
      .from(faqItems)
      .where(eq(faqItems.organizationId, organizationId))
      .orderBy(faqItems.order, faqItems.question);
  },

  async create(item: NewFaqItem) {
    const [newItem] = await db.insert(faqItems).values(item).returning();
    return newItem;
  },

  async update(id: string, organizationId: string, item: Partial<NewFaqItem>) {
    const [updated] = await db
      .update(faqItems)
      .set({ ...item, updatedAt: new Date() })
      .where(and(eq(faqItems.id, id), eq(faqItems.organizationId, organizationId)))
      .returning();
    return updated;
  },

  async delete(id: string, organizationId: string) {
    await db
      .delete(faqItems)
      .where(and(eq(faqItems.id, id), eq(faqItems.organizationId, organizationId)));
  },

  async deleteMany(ids: string[], organizationId: string) {
    if (ids.length === 0) return;
    await db
      .delete(faqItems)
      .where(and(eq(faqItems.organizationId, organizationId), inArray(faqItems.id, ids)));
  },

  async updateActiveMany(ids: string[], organizationId: string, isActive: boolean) {
    if (ids.length === 0) return;
    await db
      .update(faqItems)
      .set({ isActive, updatedAt: new Date() })
      .where(and(eq(faqItems.organizationId, organizationId), inArray(faqItems.id, ids)));
  },
};
