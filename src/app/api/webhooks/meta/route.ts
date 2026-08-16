import { NextRequest, NextResponse } from "next/server";
import { db } from "@/server/db";
import { channelConnections, channelMessages } from "@/server/db/schema";
import { eq } from "drizzle-orm";
import { ProviderRegistry } from "@/server/services/omnichannel/types";
import { omnichannelRouter } from "@/server/services/omnichannel/router";
import crypto from "crypto";

// Auto import/trigger registry files to compile decorators
import "@/server/services/omnichannel/whatsapp";
import "@/server/services/omnichannel/instagram";
import "@/server/services/omnichannel/facebook";

/**
 * Meta Webhook Challenge verification (GET request)
 */
export async function GET(req: NextRequest) {
  try {
    const searchParams = req.nextUrl.searchParams;
    const params: Record<string, string> = {};
    searchParams.forEach((val, key) => {
      params[key] = val;
    });

    // We check both WhatsApp and IG/FB registry providers
    const waProvider = ProviderRegistry.getWebhookProvider("whatsapp-meta");
    if (waProvider?.verifyWebhookChallenge) {
      const challenge = waProvider.verifyWebhookChallenge(params);
      if (challenge) {
        return new NextResponse(challenge, { status: 200 });
      }
    }

    return NextResponse.json({ error: "Invalid challenge verification token" }, { status: 400 });
  } catch (error: any) {
    return NextResponse.json({ error: error?.message || "Verification failed" }, { status: 500 });
  }
}

/**
 * Meta Webhook incoming payload handler (POST request)
 */
export async function POST(req: NextRequest) {
  try {
    const rawBody = await req.text();
    const appSecret = process.env.META_APP_SECRET;
    if (!appSecret) {
      console.error("[Meta Webhook] META_APP_SECRET is not configured");
      return new NextResponse("Webhook secret configuration error", { status: 500 });
    }

    const signature = req.headers.get("x-hub-signature-256");
    if (!signature) {
      return new NextResponse("Missing x-hub-signature-256 header", { status: 401 });
    }

    const parts = signature.split("=");
    if (parts.length !== 2 || parts[0] !== "sha256") {
      return new NextResponse("Invalid signature format", { status: 401 });
    }

    const signatureHash = parts[1];
    const expectedHash = crypto
      .createHmac("sha256", appSecret)
      .update(rawBody)
      .digest("hex");

    if (signatureHash !== expectedHash) {
      console.warn("[Meta Webhook] Signature verification failed");
      return new NextResponse("Invalid webhook signature", { status: 401 });
    }

    const body = JSON.parse(rawBody);
    // Resolve channel context from Meta payload identifiers
    const entry = body?.entry?.[0];
    const changes = entry?.changes?.[0];
    const val = changes?.value;
    
    let externalIdLookup = "";
    let providerId = "whatsapp-meta";

    if (val) {
      // WhatsApp message/status event
      externalIdLookup = val.metadata?.phone_number_id || "";
      providerId = "whatsapp-meta";
    } else if (entry?.messaging?.[0]) {
      // Messenger / Instagram DM event
      const messaging = entry.messaging[0];
      externalIdLookup = messaging.recipient?.id || "";
      
      // Meta specifies whether event is Page (FB) vs. IG
      if (entry.id && entry.id !== externalIdLookup) {
        externalIdLookup = entry.id; // Page/IG ID
      }
      
      // Determine if IG vs. Messenger
      // Instagram payloads usually contain an entry container with instagram details or messaging fields.
      // For simplicity, if we find a page token connection for this externalId lookup, we load facebook vs instagram.
      providerId = body.object === "instagram" ? "instagram-meta" : "facebook-meta";
    }

    if (!externalIdLookup) {
      return NextResponse.json({ success: true, message: "No actionable external metadata found" });
    }

    // Lookup connection in database to find organizationId and channelId
    const connection = await db.query.channelConnections.findFirst({
      where: eq(channelConnections.externalId, externalIdLookup),
      with: {
        channel: true
      }
    });

    if (!connection) {
      console.warn(`[Meta Webhook] No active channel connection found for external ID: ${externalIdLookup}`);
      return NextResponse.json({ error: "Unregistered webhook destination" }, { status: 404 });
    }

    const provider = ProviderRegistry.getWebhookProvider(providerId);
    if (!provider) {
      return NextResponse.json({ error: "Webhook provider not registered" }, { status: 500 });
    }

    // Process using provider implementation
    const headers: Record<string, string> = {
      "x-organization-id": connection.organizationId,
      "x-channel-id": connection.channelId
    };

    const result = await provider.processIncomingWebhook(headers, body);

    // Route messages into the system
    for (const msg of result.messages) {
      await omnichannelRouter.routeIncomingMessage(msg);
    }

    // Route status receipts (e.g. delivered, read)
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
    console.error("[Meta Webhook] Failed to process webhook request:", error);
    return NextResponse.json({ error: error?.message || "Internal processing error" }, { status: 500 });
  }
}
