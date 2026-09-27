import { NextRequest, NextResponse } from "next/server";
import { conversationsRepository } from "@/server/repositories/conversations";
import { leadsRepository } from "@/server/repositories/leads";
import { widgetRepository } from "@/server/repositories/widget";
import { messagesRepository } from "@/server/repositories/messages";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization",
};

export async function OPTIONS() {
  return new NextResponse(null, { status: 204, headers: corsHeaders });
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { orgId, conversationId, deviceInfo } = body;

    if (!orgId) {
      return NextResponse.json({ error: "Missing organization identifier" }, { status: 400, headers: corsHeaders });
    }

    // 1. Recover Session if conversationId is provided
    if (conversationId) {
      const conv = await conversationsRepository.findById(conversationId);
      if (conv && conv.organizationId === orgId) {
        // Fetch session
        let session = await widgetRepository.findSessionByConversation(conversationId);
        if (!session) {
          session = await widgetRepository.createSession({
            organizationId: orgId,
            conversationId,
            visitorType: "returning",
            deviceInfo
          });
        } else {
          await widgetRepository.updateSessionActivity(session.id);
        }

        // Fetch existing messages to restore UI
        const messages = await messagesRepository.listByConversation(conversationId);
        return NextResponse.json({
          success: true,
          sessionId: session.id,
          conversationId,
          messages
        }, { headers: corsHeaders });
      }
    }

    // 2. Create new session & conversation for new visitor
    const leadProfile = await leadsRepository.createProfile({
      organizationId: orgId,
      status: "New",
      leadScore: 0
    });

    const conversation = await conversationsRepository.create({
      organizationId: orgId,
      leadProfileId: leadProfile.id,
      status: "active"
    });

    const session = await widgetRepository.createSession({
      organizationId: orgId,
      conversationId: conversation.id,
      visitorType: "new",
      deviceInfo
    });

    // Seed initial system welcome message
    const branding = await widgetRepository.getBranding(orgId);
    const welcomeMessage = await messagesRepository.create({
      organizationId: orgId,
      conversationId: conversation.id,
      sender: "assistant",
      content: branding.welcomeMessage
    });

    return NextResponse.json({
      success: true,
      sessionId: session.id,
      conversationId: conversation.id,
      messages: [welcomeMessage]
    }, { headers: corsHeaders });
  } catch (error: any) {
    return NextResponse.json({ error: error?.message || "Failed to manage session" }, { status: 500, headers: corsHeaders });
  }
}
