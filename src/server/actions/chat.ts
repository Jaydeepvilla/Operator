"use server";

import { orchestratorService } from "../services/orchestrator";
import { messagesRepository } from "../repositories/messages";
import { conversationsRepository } from "../repositories/conversations";

export async function sendMessageAction(data: {
  organizationId: string;
  conversationId?: string;
  message: string;
  metadata?: Record<string, any>;
}) {
  try {
    if (!data.organizationId) {
      throw new Error("Organization ID is required");
    }
    if (!data.message || !data.message.trim()) {
      throw new Error("Message cannot be empty");
    }

    const result = await orchestratorService.processMessage({
      organizationId: data.organizationId,
      conversationId: data.conversationId,
      userMessage: data.message,
      metadata: data.metadata,
    });

    return {
      success: true,
      data: result,
    };
  } catch (error: any) {
    console.error("[sendMessageAction] Error processing message:", error);
    return {
      success: false,
      error: error?.message || "Failed to process chat message",
    };
  }
}

import { auth, requireOrganizationAccess } from "@/lib/auth/server";

export async function getConversationHistoryAction(conversationId: string) {
  try {
    if (!conversationId) {
      throw new Error("Conversation ID is required");
    }

    const conversation = await conversationsRepository.findById(conversationId);
    if (!conversation) {
      throw new Error("Conversation not found");
    }

    // If caller is authenticated, enforce organization isolation
    const session = await auth();
    if (session?.userId) {
      const { organizationId } = await requireOrganizationAccess();
      if (conversation.organizationId !== organizationId) {
        throw new Error("Conversation not found or access denied");
      }
    }

    const messages = await messagesRepository.listByConversation(conversationId);

    return {
      success: true,
      data: {
        conversation,
        messages,
      },
    };
  } catch (error: any) {
    console.error("[getConversationHistoryAction] Error loading history:", error);
    return {
      success: false,
      error: error?.message || "Failed to load conversation history",
    };
  }
}
