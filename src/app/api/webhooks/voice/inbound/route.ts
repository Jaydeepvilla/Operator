import { NextRequest, NextResponse } from "next/server";
import { db } from "@/server/db";
import { phoneNumbers } from "@/server/db/schema";
import { eq } from "drizzle-orm";
import { voiceRouting } from "@/server/services/voice/routing";
import { voiceOrchestrator } from "@/server/services/voice/orchestrator";
import { verifyTwilioSignature } from "@/server/utils/twilio-signature";

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const body: Record<string, string> = {};
    formData.forEach((value, key) => {
      body[key] = value.toString();
    });

    // Verify Twilio Webhook Signature
    const twilioSignature = req.headers.get("x-twilio-signature") || "";
    const twilioAuthToken = process.env.TWILIO_AUTH_TOKEN || "";
    if (twilioAuthToken) {
      const host = req.headers.get("x-forwarded-host") || req.headers.get("host") || "receptionist.nexx.ai";
      const proto = req.headers.get("x-forwarded-proto") || "https";
      const fullUrl = `${proto}://${host}${new URL(req.url).pathname}${new URL(req.url).search}`;
      
      const isValid = verifyTwilioSignature({
        authToken: twilioAuthToken,
        signature: twilioSignature,
        url: fullUrl,
        params: body,
      });

      if (!isValid) {
        console.warn(`[Voice Webhook Inbound] Invalid Twilio signature: ${twilioSignature}`);
        return new NextResponse(
          `<Response><Say>Unauthorized request signature.</Say><Hangup/></Response>`,
          { status: 401, headers: { "Content-Type": "text/xml" } }
        );
      }
    }

    const callerNumber = body.From || "unknown";
    const recipientNumber = body.To || "";
    const callSid = body.CallSid || "unknown-sid";

    if (!recipientNumber) {
      return new NextResponse(
        `<Response><Say>Sorry, missing recipient metadata.</Say><Hangup/></Response>`,
        { status: 200, headers: { "Content-Type": "text/xml" } }
      );
    }

    // Match connected phone lines
    const phoneLine = await db.query.phoneNumbers.findFirst({
      where: eq(phoneNumbers.phoneNumber, recipientNumber),
    });

    if (!phoneLine) {
      console.warn(`[Voice Webhook Inbound] No phone configuration matches: ${recipientNumber}`);
      return new NextResponse(
        `<Response><Say>Welcome to Nexx. This phone number is not yet configured on our dashboard. Goodbye.</Say><Hangup/></Response>`,
        { status: 200, headers: { "Content-Type": "text/xml" } }
      );
    }

    const orgId = phoneLine.organizationId;

    // Evaluate Routing Actions
    const routing = await voiceRouting.getCallRoutingAction(orgId);
    let xmlResponse = "";

    switch (routing.action) {
      case "staff-dial":
        const dialNumber = routing.targetNumber || phoneLine.phoneNumber;
        xmlResponse = `
          <Response>
            <Say>Please hold while we transfer your call to a staff member.</Say>
            <Dial>${dialNumber}</Dial>
          </Response>
        `;
        break;

      case "voicemail":
        xmlResponse = `
          <Response>
            <Say>Thank you for calling. We are currently unavailable or after operating hours. Please leave your name, number, and a message after the beep.</Say>
            <Record action="/api/webhooks/voice/recording?organizationId=${orgId}" maxLength="60" playBeep="true" />
            <Say>We did not receive any message. Goodbye.</Say>
            <Hangup/>
          </Response>
        `;
        break;

      case "queue":
        xmlResponse = `
          <Response>
            <Say>All staff members are currently occupied. Please stay on the line.</Say>
            <Enqueue>default-hold-queue</Enqueue>
          </Response>
        `;
        break;

      case "ai-receptionist":
      default:
        // Initialize call session in database
        const { sessionId, conversationId } = await voiceOrchestrator.handleInboundCall({
          organizationId: orgId,
          phoneNumberId: phoneLine.id,
          externalSessionId: callSid,
          callerNumber,
          recipientNumber,
        });

        const host = req.headers.get("host") || "receptionist.nexx.ai";
        const protocol = host.includes("localhost") ? "ws" : "wss";

        // Twilio Media Streams Connect XML
        xmlResponse = `
          <Response>
            <Say>Thank you for calling. Connecting you to Operator AI.</Say>
            <Connect>
              <Stream url="${protocol}://${host}/api/webhooks/voice/stream">
                <Parameter name="organizationId" value="${orgId}" />
                <Parameter name="sessionId" value="${sessionId}" />
                <Parameter name="conversationId" value="${conversationId}" />
              </Stream>
            </Connect>
          </Response>
        `;
        break;
    }

    return new NextResponse(xmlResponse.trim(), {
      status: 200,
      headers: { "Content-Type": "text/xml" },
    });
  } catch (error: any) {
    console.error("[Voice Webhook Inbound] Error routing call:", error);
    return new NextResponse(
      `<Response><Say>An internal connection error occurred. Please try again later.</Say><Hangup/></Response>`,
      { status: 200, headers: { "Content-Type": "text/xml" } }
    );
  }
}
