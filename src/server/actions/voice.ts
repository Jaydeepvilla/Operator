"use server";

import { requireOrganizationAccess, assertResourceOwnership } from "@/lib/auth/server";
import { revalidatePath } from "next/cache";
import { voiceRepository } from "../repositories/voice";
import { db } from "../db";
import { voicePrompts, phoneNumbers, callSessions, voicemailMessages, callRoutingRules } from "../db/schema";
import { eq, and } from "drizzle-orm";

// --- Phone Numbers ---
export async function getPhoneNumbersAction() {
  try {
    const { organizationId } = await requireOrganizationAccess();
    const numbers = await voiceRepository.getPhoneNumbers(organizationId);
    return { success: true, numbers };
  } catch (error: any) {
    return { success: false, error: error?.message || "Failed to load phone numbers" };
  }
}

export async function purchasePhoneNumberAction(data: { name: string; phoneNumber: string }) {
  try {
    const { organizationId } = await requireOrganizationAccess();
    const number = await voiceRepository.registerPhoneNumber(organizationId, {
      phoneNumber: data.phoneNumber,
      name: data.name,
      type: "purchased",
    });
    revalidatePath("/voice");
    return { success: true, number };
  } catch (error: any) {
    return { success: false, error: error?.message || "Failed to purchase phone number" };
  }
}

export async function toggleRecordingAction(phoneNumberId: string, isEnabled: boolean) {
  try {
    const { organizationId } = await requireOrganizationAccess();
    await assertResourceOwnership(phoneNumbers, phoneNumberId, organizationId, "Phone number");
    await voiceRepository.updatePhoneNumberRecording(phoneNumberId, organizationId, isEnabled);
    revalidatePath("/voice");
    return { success: true };
  } catch (error: any) {
    return { success: false, error: error?.message || "Failed to update recording preferences" };
  }
}

// --- Call Sessions ---
export async function getCallSessionsAction(limit = 50, offset = 0) {
  try {
    const { organizationId } = await requireOrganizationAccess();
    const sessions = await voiceRepository.getCallSessions(organizationId, limit, offset);
    return { success: true, sessions };
  } catch (error: any) {
    return { success: false, error: error?.message || "Failed to load call sessions" };
  }
}

export async function getCallSessionDetailsAction(sessionId: string) {
  try {
    const { organizationId } = await requireOrganizationAccess();
    await assertResourceOwnership(callSessions, sessionId, organizationId, "Call session");
    const session = await voiceRepository.getCallSessionDetails(sessionId, organizationId);
    return { success: true, session };
  } catch (error: any) {
    return { success: false, error: error?.message || "Failed to load call session details" };
  }
}

// --- Voicemails ---
export async function getVoicemailMessagesAction() {
  try {
    const { organizationId } = await requireOrganizationAccess();
    const voicemails = await voiceRepository.getVoicemails(organizationId);
    return { success: true, voicemails };
  } catch (error: any) {
    return { success: false, error: error?.message || "Failed to load voicemail messages" };
  }
}

export async function updateVoicemailStatusAction(voicemailId: string, status: "pending" | "called" | "no-action") {
  try {
    const { organizationId } = await requireOrganizationAccess();
    await assertResourceOwnership(voicemailMessages, voicemailId, organizationId, "Voicemail");
    await voiceRepository.updateVoicemailStatus(voicemailId, organizationId, status);
    revalidatePath("/voice/dashboard");
    return { success: true };
  } catch (error: any) {
    return { success: false, error: error?.message || "Failed to update voicemail callback status" };
  }
}

// --- Voice Settings ---
export async function getVoiceSettingsAction() {
  try {
    const { organizationId } = await requireOrganizationAccess();
    let settings = await voiceRepository.getVoiceSettings(organizationId);
    if (!settings) {
      settings = await voiceRepository.upsertVoiceSettings(organizationId, {
        voiceName: "Rachel",
        speakingSpeed: "1.0",
        greetingMessage: "Hello! Thank you for calling. How can I help you today?",
        businessHoursMode: "ai-only",
        voicemailActive: true,
      });
    }
    return { success: true, settings };
  } catch (error: any) {
    return { success: false, error: error?.message || "Failed to load voice settings" };
  }
}

export async function saveVoiceSettingsAction(data: {
  voiceName: string;
  speakingSpeed: string;
  greetingMessage: string;
  fallbackNumber?: string | null;
  businessHoursMode: "ai-only" | "forward" | "hybrid";
  voicemailActive: boolean;
}) {
  try {
    const { organizationId } = await requireOrganizationAccess();
    await voiceRepository.upsertVoiceSettings(organizationId, data);
    revalidatePath("/voice/settings");
    return { success: true };
  } catch (error: any) {
    return { success: false, error: error?.message || "Failed to save voice settings" };
  }
}

// --- Call Routing Rules ---
export async function getRoutingRulesAction() {
  try {
    const { organizationId } = await requireOrganizationAccess();
    const rules = await voiceRepository.getRoutingRules(organizationId);
    return { success: true, rules };
  } catch (error: any) {
    return { success: false, error: error?.message || "Failed to load call routing rules" };
  }
}

export async function createRoutingRuleAction(data: {
  ruleName: string;
  triggerType: "business-hours" | "after-hours" | "busy" | "no-answer";
  routingAction: "ai-receptionist" | "staff-dial" | "voicemail" | "queue";
  targetId?: string;
  priority?: number;
  isActive?: boolean;
}) {
  try {
    const { organizationId } = await requireOrganizationAccess();
    const rule = await voiceRepository.createRoutingRule(organizationId, data);
    revalidatePath("/voice/settings");
    return { success: true, rule };
  } catch (error: any) {
    return { success: false, error: error?.message || "Failed to create routing rule" };
  }
}

export async function updateRoutingRuleAction(ruleId: string, data: {
  ruleName?: string;
  triggerType?: "business-hours" | "after-hours" | "busy" | "no-answer";
  routingAction?: "ai-receptionist" | "staff-dial" | "voicemail" | "queue";
  targetId?: string;
  priority?: number;
  isActive?: boolean;
}) {
  try {
    const { organizationId } = await requireOrganizationAccess();
    await assertResourceOwnership(callRoutingRules, ruleId, organizationId, "Routing rule");
    await voiceRepository.updateRoutingRule(ruleId, organizationId, data);
    revalidatePath("/voice/settings");
    return { success: true };
  } catch (error: any) {
    return { success: false, error: error?.message || "Failed to update routing rule" };
  }
}

export async function deleteRoutingRuleAction(ruleId: string) {
  try {
    const { organizationId } = await requireOrganizationAccess();
    await assertResourceOwnership(callRoutingRules, ruleId, organizationId, "Routing rule");
    await voiceRepository.deleteRoutingRule(ruleId, organizationId);
    revalidatePath("/voice/settings");
    return { success: true };
  } catch (error: any) {
    return { success: false, error: error?.message || "Failed to delete routing rule" };
  }
}

// --- Analytics ---
export async function getVoiceAnalyticsAction() {
  try {
    const { organizationId } = await requireOrganizationAccess();
    const analytics = await voiceRepository.getAnalytics(organizationId);
    return { success: true, analytics };
  } catch (error: any) {
    return { success: false, error: error?.message || "Failed to load voice analytics" };
  }
}

// --- Voice Prompts / System Instructions ---
export async function getVoicePromptAction() {
  try {
    const { organizationId } = await requireOrganizationAccess();
    const [prompt] = await db
      .select()
      .from(voicePrompts)
      .where(and(eq(voicePrompts.organizationId, organizationId), eq(voicePrompts.isActive, true)));
    return { success: true, prompt: prompt || null };
  } catch (error: any) {
    return { success: false, error: error?.message || "Failed to load custom prompt" };
  }
}

export async function saveVoicePromptAction(promptText: string) {
  try {
    const { organizationId } = await requireOrganizationAccess();
    // 1. Deactivate existing active prompts for this org
    await db
      .update(voicePrompts)
      .set({ isActive: false })
      .where(eq(voicePrompts.organizationId, organizationId));

    // 2. Insert new prompt
    const [inserted] = await db
      .insert(voicePrompts)
      .values({
        organizationId,
        name: "Custom Guidelines",
        promptText,
        isActive: true,
      })
      .returning();

    revalidatePath("/settings/ai");
    return { success: true, prompt: inserted };
  } catch (error: any) {
    return { success: false, error: error?.message || "Failed to save custom prompt" };
  }
}

