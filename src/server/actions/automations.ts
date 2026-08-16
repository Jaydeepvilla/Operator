"use server";

import { revalidatePath } from "next/cache";
import { generateDocument, generateFaqPreview, generateWebsitePreview, generateCategoryPreview, generateTagPreview, generateHoursPreview } from "@/lib/automation-engine";
import { documentsRepository } from "@/server/repositories/documents";
import { faqRepository } from "@/server/repositories/faq";
import { categoriesRepository } from "@/server/repositories/categories";
import { tagsRepository } from "@/server/repositories/tags";
import { settingsRepository } from "@/server/repositories/settings";
import { db } from "@/server/db";
import { websiteImports, automationRules, automationRuleExecutions } from "@/server/db/schema";
import { checkUserOrganization } from "@/server/actions/onboarding";
import { ruleEngine, RuleAction, RuleCondition } from "../services/automations/rule-engine";
import { eq, and, desc } from "drizzle-orm";
import { organizationRepository } from "@/server/repositories/organization";

export async function generateDocumentAction(docType: string) {
  const { hasOrg, org } = await checkUserOrganization();
  if (!hasOrg || !org) throw new Error("Unauthorized");

  const state = {
    organization: org,
  };

  return await generateDocument(docType, state as any);
}

export async function publishDocumentAction(data: { title: string; content: string }) {
  const { hasOrg, org } = await checkUserOrganization();
  if (!hasOrg || !org) throw new Error("Unauthorized");

  // Store in documents repository
  await documentsRepository.create({
    organizationId: org.id,
    name: data.title,
    fileType: "text/markdown",
    status: "active",
    metadata: {
      content: data.content,
      tags: ["auto-generated", "policy"],
    }
  });

  revalidatePath("/dashboard");
  revalidatePath("/knowledge");
  revalidatePath("/health");
  return { success: true };
}

export async function generateFaqAction() {
  const { hasOrg, org } = await checkUserOrganization();
  if (!hasOrg || !org) throw new Error("Unauthorized");

  const state = {
    organization: org,
  };

  return generateFaqPreview(state as any);
}

export async function publishFaqAction(data: { title: string; content: string }) {
  const { hasOrg, org } = await checkUserOrganization();
  if (!hasOrg || !org) throw new Error("Unauthorized");

  // Basic parsing of Q: and A: from the markdown
  const lines = data.content.split('\n');
  let currentQ = "";
  let currentA = "";
  
  const faqsToInsert: {question: string, answer: string, category: string}[] = [];

  for (const line of lines) {
    if (line.startsWith("**Q:") || line.startsWith("Q:")) {
      if (currentQ && currentA) {
        faqsToInsert.push({ question: currentQ, answer: currentA.trim(), category: "General" });
      }
      currentQ = line.replace(/^\*\*Q:\s*/, "").replace(/\*\*$/, "").replace(/^Q:\s*/, "").trim();
      currentA = "";
    } else if (line.startsWith("A:")) {
      currentA = line.replace(/^A:\s*/, "").trim();
    } else if (line.trim().length > 0 && currentQ) {
      if (!currentA) {
        currentA = line.trim();
      } else {
        currentA += "\n" + line.trim();
      }
    }
  }
  
  if (currentQ && currentA) {
    faqsToInsert.push({ question: currentQ, answer: currentA.trim(), category: "General" });
  }

  // Insert into faq repository
  for (const faq of faqsToInsert) {
    await faqRepository.create({
      organizationId: org.id,
      question: faq.question,
      answer: faq.answer,
      category: faq.category,
      isActive: true,
    });
  }

  revalidatePath("/dashboard");
  revalidatePath("/knowledge");
  revalidatePath("/health");
  return { success: true };
}

export async function generateWebsiteAction() {
  const { hasOrg, org } = await checkUserOrganization();
  if (!hasOrg || !org) throw new Error("Unauthorized");
  return generateWebsitePreview({ organization: org } as any);
}

export async function publishWebsiteAction(data: { title: string; content: string }) {
  const { hasOrg, org } = await checkUserOrganization();
  if (!hasOrg || !org) throw new Error("Unauthorized");
  
  // Create a dummy import job
  await db.insert(websiteImports).values({
    organizationId: org.id,
    url: data.title.replace('Importing ', ''),
    status: 'pending',
    pagesFound: 0,
    pagesScraped: 0,
    sourceId: "00000000-0000-0000-0000-000000000000" // would normally link to a created source
  });

  revalidatePath("/dashboard");
  return { success: true };
}

export async function generateCategoryAction() {
  const { hasOrg, org } = await checkUserOrganization();
  if (!hasOrg || !org) throw new Error("Unauthorized");
  return generateCategoryPreview({ organization: org } as any);
}

export async function publishCategoryAction(data: { title: string; content: string }) {
  const { hasOrg, org } = await checkUserOrganization();
  if (!hasOrg || !org) throw new Error("Unauthorized");
  
  const categories = JSON.parse(data.content);
  for (const cat of categories) {
    await categoriesRepository.create({
      organizationId: org.id,
      name: cat.name,
      slug: cat.slug,
      icon: cat.icon
    });
  }
  revalidatePath("/dashboard");
  return { success: true };
}

export async function generateTagAction() {
  const { hasOrg, org } = await checkUserOrganization();
  if (!hasOrg || !org) throw new Error("Unauthorized");
  return generateTagPreview({ organization: org } as any);
}

export async function publishTagAction(data: { title: string; content: string }) {
  const { hasOrg, org } = await checkUserOrganization();
  if (!hasOrg || !org) throw new Error("Unauthorized");
  
  const tags = JSON.parse(data.content);
  for (const tag of tags) {
    await tagsRepository.create({
      organizationId: org.id,
      name: tag.name,
      slug: tag.slug
    });
  }
  revalidatePath("/dashboard");
  return { success: true };
}

export async function generateHoursAction() {
  const { hasOrg, org } = await checkUserOrganization();
  if (!hasOrg || !org) throw new Error("Unauthorized");
  return generateHoursPreview({ organization: org } as any);
}

export async function publishHoursAction(data: { title: string; content: string }) {
  const { hasOrg, org } = await checkUserOrganization();
  if (!hasOrg || !org) throw new Error("Unauthorized");
  
  const hours = JSON.parse(data.content);
  
  const currentSettings = await settingsRepository.getByOrg(org.id);
  if (currentSettings) {
    await settingsRepository.update(org.id, {
      businessHours: hours
    });
  } else {
    await settingsRepository.create({
      organizationId: org.id,
      businessHours: hours,
      holidays: [],
      languages: ["en"],
      bookingPreferences: {},
      notificationPreferences: {},
      leadAssignmentRules: {},
      recommendationPreferences: {},
      qualityScoresHistory: [],
      crmSegments: []
    });
  }
  
  revalidatePath("/dashboard");
  return { success: true };
}

/* ─────────────────────────────────────────────────────────────────────────────
   SECTION: User-Customized Trigger-Action Automation Rules
   ───────────────────────────────────────────────────────────────────────────── */

export async function getCustomAutomationRulesAction() {
  try {
    const { hasOrg, org } = await checkUserOrganization();
    if (!hasOrg || !org) throw new Error("Unauthorized");

    const rules = await db
      .select()
      .from(automationRules)
      .where(eq(automationRules.organizationId, org.id))
      .orderBy(desc(automationRules.createdAt));

    const executions = await db
      .select()
      .from(automationRuleExecutions)
      .where(eq(automationRuleExecutions.organizationId, org.id))
      .orderBy(desc(automationRuleExecutions.executedAt))
      .limit(30);

    return { success: true, rules, executions };
  } catch (error: any) {
    console.error("getCustomAutomationRulesAction error:", error);
    return { success: false, error: error?.message || "Failed to load automations", rules: [], executions: [] };
  }
}

export async function saveCustomAutomationRuleAction(input: {
  id?: string;
  name: string;
  description?: string;
  triggerType: string;
  triggerConfig?: Record<string, any>;
  conditions?: RuleCondition[];
  actions: RuleAction[];
  isActive?: boolean;
}) {
  try {
    const { hasOrg, org } = await checkUserOrganization();
    if (!hasOrg || !org) throw new Error("Unauthorized");

    if (!input.name || !input.triggerType || !input.actions || input.actions.length === 0) {
      return { success: false, error: "Name, Trigger, and at least one Action are required." };
    }

    if (input.id) {
      const [updated] = await db
        .update(automationRules)
        .set({
          name: input.name,
          description: input.description,
          triggerType: input.triggerType,
          triggerConfig: input.triggerConfig || {},
          conditions: input.conditions || [],
          actions: input.actions,
          isActive: input.isActive ?? true,
          updatedAt: new Date(),
        })
        .where(and(eq(automationRules.id, input.id), eq(automationRules.organizationId, org.id)))
        .returning();

      revalidatePath("/automations");
      return { success: true, rule: updated };
    } else {
      const [created] = await db
        .insert(automationRules)
        .values({
          organizationId: org.id,
          name: input.name,
          description: input.description,
          triggerType: input.triggerType,
          triggerConfig: input.triggerConfig || {},
          conditions: input.conditions || [],
          actions: input.actions,
          isActive: input.isActive ?? true,
        })
        .returning();

      revalidatePath("/automations");
      return { success: true, rule: created };
    }
  } catch (error: any) {
    console.error("saveCustomAutomationRuleAction error:", error);
    return { success: false, error: error?.message || "Failed to save automation rule" };
  }
}

export async function toggleCustomAutomationRuleAction(ruleId: string, isActive: boolean) {
  try {
    const { hasOrg, org } = await checkUserOrganization();
    if (!hasOrg || !org) throw new Error("Unauthorized");

    await db
      .update(automationRules)
      .set({ isActive, updatedAt: new Date() })
      .where(and(eq(automationRules.id, ruleId), eq(automationRules.organizationId, org.id)));

    revalidatePath("/automations");
    return { success: true };
  } catch (error: any) {
    console.error("toggleCustomAutomationRuleAction error:", error);
    return { success: false, error: error?.message || "Failed to toggle rule status" };
  }
}

export async function deleteCustomAutomationRuleAction(ruleId: string) {
  try {
    const { hasOrg, org } = await checkUserOrganization();
    if (!hasOrg || !org) throw new Error("Unauthorized");

    await db
      .delete(automationRules)
      .where(and(eq(automationRules.id, ruleId), eq(automationRules.organizationId, org.id)));

    revalidatePath("/automations");
    return { success: true };
  } catch (error: any) {
    console.error("deleteCustomAutomationRuleAction error:", error);
    return { success: false, error: error?.message || "Failed to delete rule" };
  }
}

export async function testCustomAutomationRuleAction(ruleId: string, customPayload?: Record<string, any>) {
  try {
    const { hasOrg, org } = await checkUserOrganization();
    if (!hasOrg || !org) throw new Error("Unauthorized");

    const [rule] = await db
      .select()
      .from(automationRules)
      .where(and(eq(automationRules.id, ruleId), eq(automationRules.organizationId, org.id)))
      .limit(1);

    if (!rule) throw new Error("Automation rule not found");

    const samplePayload = customPayload || {
      customerName: "Alex Jordan",
      customerEmail: "alex.jordan@example.com",
      customerPhone: "+15551234567",
      leadScore: 75,
      serviceName: "Strategy Consultation",
      appointmentTime: new Date().toLocaleString(),
    };

    const results = await ruleEngine.emitEvent(org.id, rule.triggerType, samplePayload);

    revalidatePath("/automations");
    return { success: true, results };
  } catch (error: any) {
    console.error("testCustomAutomationRuleAction error:", error);
    return { success: false, error: error?.message || "Test execution failed" };
  }
}

