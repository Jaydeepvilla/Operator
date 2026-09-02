"use server";

import { requireOrganizationAccess, assertResourceOwnership } from "@/lib/auth/server";
import { revalidatePath } from "next/cache";
import { faqRepository } from "../repositories/faq";
import { syncService } from "../services/sync";
import { db } from "../db";
import { faqItems } from "../db/schema";
import { eq, and, inArray } from "drizzle-orm";

export async function getFaqsAction() {
  try {
    const { organizationId } = await requireOrganizationAccess();
    const faqs = await faqRepository.list(organizationId);
    return { success: true, faqs };
  } catch (error: any) {
    return { success: false, error: error?.message || "Failed to load FAQs" };
  }
}

export async function createFaqAction(data: {
  question: string;
  answer: string;
  category: string;
}) {
  try {
    const { organizationId } = await requireOrganizationAccess();

    // Sanitise input lengths
    if (!data.question?.trim() || data.question.length > 1000) {
      throw new Error("Question is required and must be under 1000 characters");
    }
    if (!data.answer?.trim() || data.answer.length > 5000) {
      throw new Error("Answer is required and must be under 5000 characters");
    }

    const faq = await faqRepository.create({
      organizationId,
      question: data.question.trim(),
      answer: data.answer.trim(),
      category: data.category?.trim() || "General",
      isActive: true,
    });

    await syncService.syncFAQ(organizationId, faq.id, faq.question, faq.answer, faq.isActive);

    revalidatePath("/faqs");
    revalidatePath("/dashboard");
    return { success: true };
  } catch (error: any) {
    return { success: false, error: error?.message || "Failed to create FAQ" };
  }
}

export async function updateFaqAction(
  id: string,
  data: {
    question: string;
    answer: string;
    category: string;
    isActive: boolean;
  }
) {
  try {
    const { organizationId } = await requireOrganizationAccess();
    // IDOR guard: confirm this FAQ belongs to the caller's org
    await assertResourceOwnership(faqItems, id, organizationId, "FAQ");

    if (!data.question?.trim() || data.question.length > 1000) {
      throw new Error("Question is required and must be under 1000 characters");
    }
    if (!data.answer?.trim() || data.answer.length > 5000) {
      throw new Error("Answer is required and must be under 5000 characters");
    }

    const updated = await faqRepository.update(id, organizationId, {
      question: data.question.trim(),
      answer: data.answer.trim(),
      category: data.category?.trim() || "General",
      isActive: data.isActive,
    });

    if (updated) {
      await syncService.syncFAQ(organizationId, updated.id, updated.question, updated.answer, updated.isActive);
    }
    revalidatePath("/faqs");
    return { success: true };
  } catch (error: any) {
    return { success: false, error: error?.message || "Failed to update FAQ" };
  }
}

export async function deleteFaqAction(id: string) {
  try {
    const { organizationId } = await requireOrganizationAccess();
    // IDOR guard
    const faq = await assertResourceOwnership(faqItems, id, organizationId, "FAQ");
    await faqRepository.delete(id, organizationId);
    await syncService.syncFAQ(organizationId, faq.id, "", "", false, true);
    revalidatePath("/faqs");
    revalidatePath("/dashboard");
    return { success: true };
  } catch (error: any) {
    return { success: false, error: error?.message || "Failed to delete FAQ" };
  }
}

export async function bulkDeleteFaqsAction(ids: string[]) {
  try {
    const { organizationId } = await requireOrganizationAccess();
    // Bulk-IDOR: only delete IDs that actually belong to this org
    const faqs = await db
      .select()
      .from(faqItems)
      .where(and(eq(faqItems.organizationId, organizationId), inArray(faqItems.id, ids)));

    const safeIds = faqs.map((f) => f.id);
    if (safeIds.length === 0) return { success: true }; // Nothing owned to delete

    await faqRepository.deleteMany(safeIds, organizationId);

    for (const faq of faqs) {
      await syncService.syncFAQ(organizationId, faq.id, faq.question, faq.answer, faq.isActive, true);
    }

    revalidatePath("/faqs");
    revalidatePath("/dashboard");
    return { success: true };
  } catch (error: any) {
    return { success: false, error: error?.message || "Failed to bulk delete FAQs" };
  }
}

export async function bulkToggleActiveFaqsAction(ids: string[], isActive: boolean) {
  try {
    const { organizationId } = await requireOrganizationAccess();
    // Only toggle IDs owned by this org
    await faqRepository.updateActiveMany(ids, organizationId, isActive);

    const faqs = await db
      .select()
      .from(faqItems)
      .where(and(eq(faqItems.organizationId, organizationId), inArray(faqItems.id, ids)));

    for (const faq of faqs) {
      await syncService.syncFAQ(organizationId, faq.id, faq.question, faq.answer, faq.isActive);
    }

    revalidatePath("/faqs");
    return { success: true };
  } catch (error: any) {
    return { success: false, error: error?.message || "Failed to bulk toggle FAQ status" };
  }
}

