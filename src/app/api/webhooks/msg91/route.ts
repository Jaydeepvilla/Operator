import { NextRequest, NextResponse } from "next/server";
import { db } from "@/server/db";
import { channelConnections, channelMessages } from "@/server/db/schema";
import { eq } from "drizzle-orm";
import { ProviderRegistry } from "@/server/services/omnichannel/types";
import { omnichannelRouter } from "@/server/services/omnichannel/router";

// Auto import/trigger registry files to compile decorators
import "@/server/services/omnichannel/msg91";

export async function POST(req: NextRequest) {
  try {
    const signature = req.headers.get("x-msg91-signature") || "";
    const webhookToken = process.env.MSG91_WEBHOOK_TOKEN || "";
    if (webhookToken && signature !== webhookToken) {
      console.warn(`[MSG91 Webhook] Unauthorized signature token: ${signature}`);
      return NextResponse.json({ error: "Unauthorized signature" }, { status: 401 });
    }

    const body = await req.json();
    
    // Match connection
    const connection = await db.query.channelConnections.findFirst({
      where: eq(channelConnections.externalId, "sms-msg91"),
      with: {
        channel: true
      }
    });

    if (!connection) {
      console.warn(`[MSG91 Webhook] No active MSG91 connection matches`);
      return NextResponse.json({ error: "Unregistered channel destination" }, { status: 404 });
    }

    const provider = ProviderRegistry.getWebhookProvider("sms-msg91");
    if (!provider) {
      return NextResponse.json({ error: "MSG91 webhook provider not registered" }, { status: 500 });
    }

    const headers: Record<string, string> = {
      "x-organization-id": connection.organizationId,
      "x-channel-id": connection.channelId
    };

    const result = await provider.processIncomingWebhook(headers, body);

    // Route delivery receipt status
    for (const stat of result.statuses) {
      await db
        .update(channelMessages)
        .set({ 
          status: stat.status, 
          updatedAt: stat.updatedAt 
        })
        .where(eq(channelMessages.externalId, stat.externalMessageId));
    }

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error("[MSG91 Webhook] Failed to process incoming request:", error);
    return NextResponse.json({ error: error?.message || "Internal processing error" }, { status: 500 });
  }
}
