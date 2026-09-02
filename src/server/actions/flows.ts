"use server";

import { requireOrganizationAccess } from "@/lib/auth/server";
import { revalidatePath } from "next/cache";
import { flowsRepository } from "../repositories/flows";
import { syncService } from "../services/sync";

export async function getFlowQuestionsAction() {
  try {
    const { organizationId } = await requireOrganizationAccess();
    const list = await flowsRepository.list(organizationId);
    return { success: true, questions: list };
  } catch (error: any) {
    return { success: false, error: error?.message || "Failed to load qualification flow" };
  }
}

export async function createFlowQuestionAction(data: {
  question: string;
  answerType: "text" | "single_select" | "multi_select" | "number";
  options?: string[];
  isRequired: boolean;
}) {
  try {
    const { organizationId } = await requireOrganizationAccess();
    const current = await flowsRepository.list(organizationId);

    await flowsRepository.create({
      organizationId,
      question: data.question,
      answerType: data.answerType,
      options: data.options || [],
      isRequired: data.isRequired,
      order: current.length,
    });

    const updatedList = await flowsRepository.list(organizationId);
    await syncService.syncQualificationFlows(organizationId, updatedList);

    revalidatePath("/flows");
    revalidatePath("/dashboard");
    return { success: true };
  } catch (error: any) {
    return { success: false, error: error?.message || "Failed to create question" };
  }
}

export async function updateFlowQuestionAction(
  id: string,
  data: {
    question: string;
    answerType: "text" | "single_select" | "multi_select" | "number";
    options?: string[];
    isRequired: boolean;
  }
) {
  try {
    const { organizationId } = await requireOrganizationAccess();
    await flowsRepository.update(id, organizationId, {
      question: data.question,
      answerType: data.answerType,
      options: data.options || [],
      isRequired: data.isRequired,
    });

    const updatedList = await flowsRepository.list(organizationId);
    await syncService.syncQualificationFlows(organizationId, updatedList);

    revalidatePath("/flows");
    return { success: true };
  } catch (error: any) {
    return { success: false, error: error?.message || "Failed to update question" };
  }
}

export async function deleteFlowQuestionAction(id: string) {
  try {
    const { organizationId } = await requireOrganizationAccess();
    await flowsRepository.delete(id, organizationId);

    // Reorder remaining questions to fill gaps
    const remaining = await flowsRepository.list(organizationId);
    for (let i = 0; i < remaining.length; i++) {
      await flowsRepository.update(remaining[i].id, organizationId, { order: i });
    }

    const updatedList = await flowsRepository.list(organizationId);
    await syncService.syncQualificationFlows(organizationId, updatedList);

    revalidatePath("/flows");
    revalidatePath("/dashboard");
    return { success: true };
  } catch (error: any) {
    return { success: false, error: error?.message || "Failed to delete question" };
  }
}

export async function updateFlowQuestionsOrderAction(questionsList: { id: string; order: number }[]) {
  try {
    const { organizationId } = await requireOrganizationAccess();
    for (const q of questionsList) {
      await flowsRepository.update(q.id, organizationId, { order: q.order });
    }
    const updatedList = await flowsRepository.list(organizationId);
    await syncService.syncQualificationFlows(organizationId, updatedList);
    revalidatePath("/flows");
    return { success: true };
  } catch (error: any) {
    return { success: false, error: error?.message || "Failed to update question order" };
  }
}

