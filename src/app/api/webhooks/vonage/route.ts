import { NextRequest, NextResponse } from "next/server";
import { db } from "@/server/db";
import { channelConnections, channelMessages } from "@/server/db/schema";
import { eq } from "drizzle-orm";
import { ProviderRegistry } from "@/server/services/omnichannel/types";
import { omnichannelRouter } from "@/server/services/omnichannel/router";

// Auto import provider registry
import "@/server/services/omnichannel/vonage";

export async function POST(req: NextRequest) {
  try {
    const signature = req.headers.get("x-vonage-signature") || "";
    const webhookToken = process.env.VONAGE_WEBHOOK_SECRET || "";
    if (webhookToken && signature && signature !== webhookToken) {
      console.warn(`[Vonage Webhook] Unauthorized signature: ${signature}`);
      return NextResponse.json({ error: "Unauthorized signature" }, { status: 401 });
    }

    const body = await req.json();
    
    const connection = await db.query.channelConnections.findFirst({
      where: eq(channelConnections.externalId, "sms-vonage"),
      with: { channel: true }
    });

    const provider = ProviderRegistry.getWebhookProvider("sms-vonage");
    if (!provider) {
      return NextResponse.json({ error: "Vonage webhook provider not registered" }, { status: 500 });
    }

    const headers: Record<string, string> = {
      "x-organization-id": connection?.organizationId || "",
      "x-channel-id": connection?.channelId || ""
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

    // Route inbound messages
    for (const msg of result.messages) {
      await omnichannelRouter.routeIncomingMessage(msg);
    }

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error("[Vonage Webhook] Failed to process incoming request:", error);
    return NextResponse.json({ error: error?.message || "Internal processing error" }, { status: 500 });
  }
}
