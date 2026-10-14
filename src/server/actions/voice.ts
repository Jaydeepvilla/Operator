"use server";

import { requireOrganizationAccess, assertResourceOwnership } from "@/lib/auth/server";
import { revalidatePath } from "next/cache";
import { voiceRepository } from "../repositories/voice";
import { profileRepository } from "../repositories/profile";
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
    return { success: false, error: error?.message || "We couldn't load phone numbers. Try again." };
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
    return { success: false, error: error?.message || "We couldn't allocate this phone number. Try again." };
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
    return { success: false, error: error?.message || "We couldn't update call recording preferences. Try again." };
  }
}

// --- Call Sessions ---
export async function getCallSessionsAction(limit = 50, offset = 0) {
  try {
    const { organizationId } = await requireOrganizationAccess();
    const sessions = await voiceRepository.getCallSessions(organizationId, limit, offset);
    return { success: true, sessions };
  } catch (error: any) {
    return { success: false, error: error?.message || "We couldn't load call history. Try again." };
  }
}

export async function getCallSessionDetailsAction(sessionId: string) {
  try {
    const { organizationId } = await requireOrganizationAccess();
    await assertResourceOwnership(callSessions, sessionId, organizationId, "Call session");
    const session = await voiceRepository.getCallSessionDetails(sessionId, organizationId);
    return { success: true, session };
  } catch (error: any) {
    return { success: false, error: error?.message || "We couldn't load call details. Try again." };
  }
}

// --- Voicemails ---
export async function getVoicemailMessagesAction() {
  try {
    const { organizationId } = await requireOrganizationAccess();
    const voicemails = await voiceRepository.getVoicemails(organizationId);
    return { success: true, voicemails };
  } catch (error: any) {
    return { success: false, error: error?.message || "We couldn't load voicemail messages. Try again." };
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
    return { success: false, error: error?.message || "We couldn't update voicemail status. Try again." };
  }
}

// --- Voice Settings ---
export async function getVoiceSettingsAction() {
  try {
    const { organizationId } = await requireOrganizationAccess();
    let settings = await voiceRepository.getVoiceSettings(organizationId);
    if (!settings) {
      settings = await voiceRepository.upsertVoiceSettings(organizationId, {
        voiceName: "af_heart",
        speakingSpeed: "1.0",
        greetingMessage: "Hello! Thank you for calling. How can I help you today?",
        businessHoursMode: "ai-only",
        voicemailActive: true,
      });
    }
    return { success: true, settings };
  } catch (error: any) {
    return { success: false, error: error?.message || "We couldn't load voice settings. Try again." };
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
    return { success: false, error: error?.message || "We couldn't save voice settings. Try again." };
  }
}

export async function previewVoiceAction(data: {
  voiceName?: string;
  speakingSpeed?: string;
  text?: string;
}) {
  try {
    await requireOrganizationAccess();
    const previewText = data.text?.trim() || "Hello! Thank you for calling. How can I help you today?";
    const voiceName = data.voiceName || "af_heart";

    const { INWORLD_VOICE_IDS, inworldTts } = await import("../services/voice/inworld");
    const isInworld = INWORLD_VOICE_IDS.some((v) => v.toLowerCase() === voiceName.toLowerCase());

    let result: { audioBuffer: Buffer; mimeType: string };
    if (isInworld) {
      result = await inworldTts.synthesizeText(
        previewText,
        voiceName,
        data.speakingSpeed
      );
    } else {
      const { kokoroTts } = await import("../services/voice/kokoro");
      result = await kokoroTts.synthesizeText(
        previewText,
        voiceName,
        data.speakingSpeed || "1.0"
      );
    }

    const base64Audio = result.audioBuffer.toString("base64");
    return {
      success: true,
      audioDataUrl: `data:${result.mimeType};base64,${base64Audio}`,
      mimeType: result.mimeType,
    };
  } catch (error: unknown) {
    const errorMsg = error instanceof Error ? error.message : "Failed to generate speech preview. Try again.";
    return {
      success: false,
      error: errorMsg,
    };
  }
}

// --- Call Routing Rules ---
export async function getRoutingRulesAction() {
  try {
    const { organizationId } = await requireOrganizationAccess();
    const rules = await voiceRepository.getRoutingRules(organizationId);
    return { success: true, rules };
  } catch (error: any) {
    return { success: false, error: error?.message || "We couldn't load call routing rules. Try again." };
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
    return { success: false, error: error?.message || "We couldn't create the routing rule. Try again." };
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
    return { success: false, error: error?.message || "We couldn't update the routing rule. Try again." };
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
    return { success: false, error: error?.message || "We couldn't delete the routing rule. Try again." };
  }
}

// --- Analytics ---
export async function getVoiceAnalyticsAction() {
  try {
    const { organizationId } = await requireOrganizationAccess();
    const analytics = await voiceRepository.getAnalytics(organizationId);
    return { success: true, analytics };
  } catch (error: any) {
    return { success: false, error: error?.message || "We couldn't load voice analytics. Try again." };
  }
}

// --- Voice Prompts / System Instructions / AI Persona ---
export async function getVoicePromptAction() {
  try {
    const { organizationId } = await requireOrganizationAccess();
    const [prompt] = await db
      .select()
      .from(voicePrompts)
      .where(and(eq(voicePrompts.organizationId, organizationId), eq(voicePrompts.isActive, true)));
    return { success: true, prompt: prompt || null };
  } catch (error: any) {
    return { success: false, error: error?.message || "We couldn't load your custom prompt. Try again." };
  }
}

export async function getAIPersonaSettingsAction() {
  try {
    const { organizationId } = await requireOrganizationAccess();
    const [prompt] = await db
      .select()
      .from(voicePrompts)
      .where(and(eq(voicePrompts.organizationId, organizationId), eq(voicePrompts.isActive, true)));

    const voiceSetting = await voiceRepository.getVoiceSettings(organizationId);
    const profile = await profileRepository.getByOrg(organizationId);

    let tone = "professional";
    if (prompt?.name && prompt.name.startsWith("tone:")) {
      tone = prompt.name.replace("tone:", "");
    }

    return {
      success: true,
      data: {
        assistantName: voiceSetting?.voiceName?.trim() || "Ava",
        tone,
        businessDescription: profile?.description || "",
        customInstructions: prompt?.promptText || "",
      },
    };
  } catch (error: any) {
    return { success: false, error: error?.message || "Failed to load AI persona settings" };
  }
}

export async function saveAIPersonaAction(data: {
  assistantName: string;
  tone: string;
  businessDescription: string;
  customInstructions: string;
}) {
  try {
    const { organizationId } = await requireOrganizationAccess();

    // 1. Update/Upsert Voice Settings (Assistant Name)
    await voiceRepository.upsertVoiceSettings(organizationId, {
      voiceName: data.assistantName.trim() || "Ava",
    });

    // 2. Update Business Profile (Description)
    const existingProfile = await profileRepository.getByOrg(organizationId);
    if (existingProfile) {
      await profileRepository.update(organizationId, {
        description: data.businessDescription.trim(),
      });
    } else {
      await profileRepository.create({
        organizationId,
        description: data.businessDescription.trim(),
      });
    }

    // 3. Deactivate old prompts and insert new active prompt with tone tag in name
    await db
      .update(voicePrompts)
      .set({ isActive: false })
      .where(eq(voicePrompts.organizationId, organizationId));

    const [inserted] = await db
      .insert(voicePrompts)
      .values({
        organizationId,
        name: `tone:${data.tone.trim() || "professional"}`,
        promptText: data.customInstructions.trim(),
        isActive: true,
      })
      .returning();

    revalidatePath("/settings/ai");
    revalidatePath("/settings");
    revalidatePath("/voice/settings");
    revalidatePath("/dashboard");
    return { success: true, prompt: inserted };
  } catch (error: any) {
    return { success: false, error: error?.message || "We couldn't save your AI persona settings." };
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
    return { success: false, error: error?.message || "We couldn't save your custom prompt. Try again." };
  }
}

export async function initiateOutboundCallAction(params: {
  toPhoneNumber: string;
  phoneNumberId?: string;
}) {
  try {
    const { organizationId } = await requireOrganizationAccess();
    const cleanNumber = params.toPhoneNumber.trim().replace(/[()\s-]/g, "");
    if (!cleanNumber || !/^\+?[1-9]\d{6,14}$/.test(cleanNumber)) {
      return { success: false, error: "Please enter a valid destination phone number in E.164 format (e.g. +15551234567)." };
    }

    // Check telephony carrier configuration
    const twilioConfigured = Boolean(process.env.TWILIO_ACCOUNT_SID && process.env.TWILIO_AUTH_TOKEN);
    const vonageConfigured = Boolean(process.env.VONAGE_API_KEY && process.env.VONAGE_API_SECRET);

    if (!twilioConfigured && !vonageConfigured) {
      return {
        success: false,
        error: "Telephony provider is not configured. Please set up Twilio or Vonage credentials to dial outbound calls.",
      };
    }

    // Resolve caller line
    let lineId = params.phoneNumberId;
    if (!lineId) {
      const existingLines = await voiceRepository.getPhoneNumbers(organizationId);
      if (existingLines.length > 0) {
        lineId = existingLines[0].id;
      }
    }

    if (!lineId) {
      return {
        success: false,
        error: "No active phone lines found. Please link a phone line in Phone Numbers before placing outbound calls.",
      };
    }

    let externalSessionId: string | null = null;
    let callerNumber = "Operator AI";

    const [callerPhoneRecord] = await db
      .select()
      .from(phoneNumbers)
      .where(and(eq(phoneNumbers.id, lineId), eq(phoneNumbers.organizationId, organizationId)))
      .limit(1);

    if (callerPhoneRecord) {
      callerNumber = callerPhoneRecord.phoneNumber;
    }

    if (twilioConfigured) {
      const accountSid = process.env.TWILIO_ACCOUNT_SID!;
      const authToken = process.env.TWILIO_AUTH_TOKEN!;
      const authHeader = "Basic " + Buffer.from(`${accountSid}:${authToken}`).toString("base64");
      const appBaseUrl = process.env.NEXTAUTH_URL || "https://app.operator.com";
      const twimlUrl = `${appBaseUrl}/api/voice/twiml`;

      try {
        const response = await fetch(`https://api.twilio.com/2010-04-01/Accounts/${accountSid}/Calls.json`, {
          method: "POST",
          headers: {
            Authorization: authHeader,
            "Content-Type": "application/x-www-form-urlencoded",
          },
          body: new URLSearchParams({
            To: cleanNumber,
            From: callerNumber,
            Url: twimlUrl,
          }),
        });

        if (!response.ok) {
          const errBody = await response.text();
          return {
            success: false,
            error: `Carrier dispatch rejected by Twilio (${response.status}): ${errBody}`,
          };
        }

        const callData = await response.json();
        externalSessionId = callData.sid;
      } catch (err: any) {
        return {
          success: false,
          error: `Telephony network dispatch failed: ${err?.message || "Network error"}`,
        };
      }
    } else if (vonageConfigured) {
      return {
        success: false,
        error: "Vonage outbound dialing requires configured VONAGE_APPLICATION_ID and private key credentials.",
      };
    }

    if (!externalSessionId) {
      return {
        success: false,
        error: "Carrier did not return a valid call identifier. Call was not placed.",
      };
    }

    const [session] = await db
      .insert(callSessions)
      .values({
        organizationId,
        phoneNumberId: lineId,
        direction: "outbound",
        externalSessionId,
        callerNumber,
        recipientNumber: cleanNumber,
        status: "in-progress",
        durationSeconds: 0,
      })
      .returning();

    revalidatePath("/voice");
    return { success: true, sessionId: session.id };
  } catch (error: any) {
    return { success: false, error: error?.message || "Failed to initiate outbound call." };
  }
}

