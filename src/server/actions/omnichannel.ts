"use server";

import { requireOrganizationAccess, assertResourceOwnership } from "@/lib/auth/server";
import { revalidatePath } from "next/cache";
import { db } from "../db";
import { 
  conversations, 
  channelMessages, 
  communicationChannels, 
  channelConnections, 
  inboxThreads, 
  inboxParticipants,
  leadProfiles,
  messageTemplates,
  channelSettings,
  staffMembers
} from "../db/schema";
import { eq, and, desc, asc } from "drizzle-orm";
import { omnichannelRepository } from "../repositories/omnichannel";
import { omnichannelRouter } from "../services/omnichannel/router";
import { orchestratorService } from "../services/orchestrator";

// --- Inbox Thread Actions ---

export async function getInboxThreadsAction() {
  try {
    const { organizationId } = await requireOrganizationAccess();
    
    // Fetch threads
    const threads = await db.query.inboxThreads.findMany({
      where: eq(inboxThreads.organizationId, organizationId),
      orderBy: [desc(inboxThreads.updatedAt)],
      with: {
        channel: true,
        conversation: {
          with: {
            leadProfile: true
          }
        },
        lastMessage: true
      }
    });

    return { success: true, threads };
  } catch (error: any) {
    return { success: false, error: error?.message || "Failed to fetch inbox threads" };
  }
}

export async function getThreadMessagesAction(conversationId: string) {
  try {
    const { organizationId } = await requireOrganizationAccess();

    const messages = await db.query.channelMessages.findMany({
      where: and(
        eq(channelMessages.organizationId, organizationId),
        eq(channelMessages.conversationId, conversationId)
      ),
      orderBy: [asc(channelMessages.createdAt)]
    });

    return { success: true, messages };
  } catch (error: any) {
    return { success: false, error: error?.message || "Failed to fetch thread messages" };
  }
}

export async function sendStaffReplyAction(options: {
  threadId: string;
  conversationId: string;
  channelId: string;
  recipientId: string;
  content: string;
}) {
  try {
    const { organizationId } = await requireOrganizationAccess();
    await assertResourceOwnership(inboxThreads, options.threadId, organizationId, "Inbox thread");

    await omnichannelRouter.sendOutgoingMessage({
      organizationId,
      channelId: options.channelId,
      conversationId: options.conversationId,
      recipientId: options.recipientId,
      content: options.content,
      isAiGenerated: false
    });

    // Clear unread count, set last message, and pause AI autopilot for active human intervention
    await db
      .update(inboxThreads)
      .set({ 
        unreadCount: 0, 
        aiAutonomy: "paused", 
        updatedAt: new Date() 
      })
      .where(and(eq(inboxThreads.id, options.threadId), eq(inboxThreads.organizationId, organizationId)));

    revalidatePath("/inbox");
    return { success: true };
  } catch (error: any) {
    return { success: false, error: error?.message || "Failed to deliver manual staff reply" };
  }
}

/**
 * Toggles AI autopilot autonomy on a specific conversation thread ('active' vs 'paused')
 */
export async function toggleThreadAiAutonomyAction(threadId: string, status: "active" | "paused") {
  try {
    const { organizationId } = await requireOrganizationAccess();

    const [updated] = await db
      .update(inboxThreads)
      .set({ aiAutonomy: status, updatedAt: new Date() })
      .where(and(eq(inboxThreads.id, threadId), eq(inboxThreads.organizationId, organizationId)))
      .returning();

    revalidatePath("/inbox");
    return { success: true, thread: updated };
  } catch (error: any) {
    return { success: false, error: error?.message || "Failed to update AI autonomy status" };
  }
}

/**
 * Generates an AI draft reply and contextual intelligence without sending it
 */
export async function generateDraftAiReplyAction(options: {
  conversationId: string;
  userMessage?: string;
}) {
  try {
    const { organizationId } = await requireOrganizationAccess();
    await assertResourceOwnership(conversations, options.conversationId, organizationId, "Conversation");

    const result = await orchestratorService.processMessage({
      organizationId,
      conversationId: options.conversationId,
      userMessage: options.userMessage || "How can I help you?",
      metadata: { isDraftAssistant: true },
    });

    return {
      success: true,
      draftReply: result.assistantMessage,
      intent: result.intent,
      citations: result.citations || [],
      isEscalated: result.isEscalated,
    };
  } catch (error: any) {
    return { success: false, error: error?.message || "Failed to generate AI draft reply" };
  }
}

export async function assignThreadAction(threadId: string, staffId: string | null) {
  try {
    const { organizationId } = await requireOrganizationAccess();

    await db
      .update(inboxThreads)
      .set({ assignedStaffId: staffId, updatedAt: new Date() })
      .where(and(eq(inboxThreads.id, threadId), eq(inboxThreads.organizationId, organizationId)));

    revalidatePath("/inbox");
    return { success: true };
  } catch (error: any) {
    return { success: false, error: error?.message || "Failed to assign thread" };
  }
}

export async function updateThreadStatusAction(threadId: string, status: "open" | "closed" | "snoozed") {
  try {
    const { organizationId } = await requireOrganizationAccess();

    await db
      .update(inboxThreads)
      .set({ status, updatedAt: new Date() })
      .where(and(eq(inboxThreads.id, threadId), eq(inboxThreads.organizationId, organizationId)));

    revalidatePath("/inbox");
    return { success: true };
  } catch (error: any) {
    return { success: false, error: error?.message || "Failed to update thread status" };
  }
}

// --- Channel Actions ---

export async function getChannelsAction() {
  try {
    const { organizationId } = await requireOrganizationAccess();

    const channels = await db.query.communicationChannels.findMany({
      where: eq(communicationChannels.organizationId, organizationId),
      with: {
        connections: true,
        settings: true
      }
    });

    return { success: true, channels };
  } catch (error: any) {
    return { success: false, error: error?.message || "Failed to list channels" };
  }
}

export async function connectChannelAction(options: {
  type: "whatsapp" | "sms" | "email" | "instagram" | "facebook";
  name: string;
  credentials: Record<string, any>;
  metadata: Record<string, any>;
}) {
  try {
    const { organizationId } = await requireOrganizationAccess();

    // Create channel
    const channel = await omnichannelRepository.createChannel({
      organizationId,
      type: options.type,
      name: options.name,
      status: "active"
    });

    // Save credentials
    await omnichannelRepository.saveConnection({
      organizationId,
      channelId: channel.id,
      externalId: options.credentials.phoneId || options.credentials.accountSid || options.credentials.user || "ext-id",
      credentials: options.credentials,
      metadata: options.metadata,
      status: "connected"
    });

    revalidatePath("/channels");
    return { success: true, channel };
  } catch (error: any) {
    return { success: false, error: error?.message || "Failed to connect channel" };
  }
}

export async function saveChannelSettingsAction(options: {
  channelId: string;
  aiEnabled: boolean;
  aiTone: string;
  responseDelaySeconds: number;
  businessHoursOnly: boolean;
}) {
  try {
    const { organizationId } = await requireOrganizationAccess();

    await omnichannelRepository.updateSettings(organizationId, options.channelId, {
      aiEnabled: options.aiEnabled,
      aiTone: options.aiTone,
      responseDelaySeconds: options.responseDelaySeconds,
      businessHoursOnly: options.businessHoursOnly
    });

    revalidatePath("/channels");
    return { success: true };
  } catch (error: any) {
    return { success: false, error: error?.message || "Failed to save channel settings" };
  }
}

// --- Message Template Actions ---

export async function getTemplatesAction() {
  try {
    const { organizationId } = await requireOrganizationAccess();
    const templates = await omnichannelRepository.listTemplates(organizationId);
    return { success: true, templates };
  } catch (error: any) {
    return { success: false, error: error?.message || "Failed to list templates" };
  }
}

export async function saveTemplateAction(options: {
  id?: string;
  name: string;
  category: string;
  channelType: string;
  body: string;
  subject?: string;
  variables: string[];
}) {
  try {
    const { organizationId } = await requireOrganizationAccess();

    if (options.id) {
      await assertResourceOwnership(messageTemplates, options.id, organizationId, "Message template");
      await omnichannelRepository.updateTemplate(options.id, organizationId, {
        name: options.name,
        category: options.category,
        channelType: options.channelType,
        body: options.body,
        subject: options.subject || null,
        variables: options.variables
      });
    } else {
      await omnichannelRepository.createTemplate({
        organizationId,
        name: options.name,
        category: options.category,
        channelType: options.channelType,
        body: options.body,
        subject: options.subject || null,
        variables: options.variables,
        status: "approved"
      });
    }

    revalidatePath("/templates");
    return { success: true };
  } catch (error: any) {
    return { success: false, error: error?.message || "Failed to save template" };
  }
}

export async function deleteTemplateAction(id: string) {
  try {
    const { organizationId } = await requireOrganizationAccess();
    await assertResourceOwnership(messageTemplates, id, organizationId, "Message template");
    await omnichannelRepository.deleteTemplate(id, organizationId);
    revalidatePath("/templates");
    return { success: true };
  } catch (error: any) {
    return { success: false, error: error?.message || "Failed to delete template" };
  }
}

// --- Contact Management Actions ---

export async function getContactsAction() {
  try {
    const { organizationId } = await requireOrganizationAccess();
    const contacts = await db.query.leadProfiles.findMany({
      where: eq(leadProfiles.organizationId, organizationId),
      orderBy: [desc(leadProfiles.createdAt)]
    });
    return { success: true, contacts };
  } catch (error: any) {
    return { success: false, error: error?.message || "Failed to list contact leads" };
  }
}

export async function updateContactAction(options: {
  id: string;
  name?: string;
  email?: string;
  phone?: string;
  status?: string;
  notes?: string;
  tags?: string[];
  lifetimeValue?: number;
}) {
  try {
    const { organizationId } = await requireOrganizationAccess();
    await assertResourceOwnership(leadProfiles, options.id, organizationId, "Contact profile");

    await db
      .update(leadProfiles)
      .set({
        ...options,
        updatedAt: new Date()
      })
      .where(and(eq(leadProfiles.id, options.id), eq(leadProfiles.organizationId, organizationId)));

    revalidatePath("/contacts");
    return { success: true };
  } catch (error: any) {
    return { success: false, error: error?.message || "Failed to update contact profile" };
  }
}

// --- Channel Analytics Actions ---

export async function getOmnichannelAnalyticsAction() {
  try {
    const { organizationId } = await requireOrganizationAccess();

    const [sentMsgs, receivedMsgs, channels] = await Promise.all([
      db.query.channelMessages.findMany({
        where: and(
          eq(channelMessages.organizationId, organizationId),
          eq(channelMessages.direction, "outgoing")
        )
      }),
      db.query.channelMessages.findMany({
        where: and(
          eq(channelMessages.organizationId, organizationId),
          eq(channelMessages.direction, "incoming")
        )
      }),
      omnichannelRepository.listChannels(organizationId)
    ]);

    const sentCount = sentMsgs.length;
    const receivedCount = receivedMsgs.length;
    
    // Calculate response rate (messages that aren't failures)
    const successSent = sentMsgs.filter((m) => m.status !== "failed").length;
    const responseRate = sentCount > 0 ? Math.round((successSent / sentCount) * 100) : 0;

    // Split conversions per channel
    const channelPerf: Record<string, { sent: number; received: number }> = {};
    for (const chan of channels) {
      channelPerf[chan.type] = { sent: 0, received: 0 };
    }

    for (const m of sentMsgs) {
      // Find matching channel type
      const chan = channels.find((c) => c.id === m.channelId);
      if (chan) {
        channelPerf[chan.type].sent++;
      }
    }

    for (const m of receivedMsgs) {
      const chan = channels.find((c) => c.id === m.channelId);
      if (chan) {
        channelPerf[chan.type].received++;
      }
    }

    return {
      success: true,
      analytics: {
        sentCount,
        receivedCount,
        responseRate,
        channelPerf
      }
    };
  } catch (error: any) {
    return { success: false, error: error?.message || "Failed to compute channel analytics" };
  }
}

export async function getStaffMembersAction() {
  try {
    const { organizationId } = await requireOrganizationAccess();
    const staff = await db.query.staffMembers.findMany({
      where: eq(staffMembers.organizationId, organizationId),
    });
    return { success: true, staff: staff.map(s => ({ id: s.id, name: s.name })) };
  } catch (error: any) {
    return { success: false, error: error?.message || "Failed to fetch staff members" };
  }
}

