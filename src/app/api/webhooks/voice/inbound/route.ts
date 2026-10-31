import { NextRequest, NextResponse } from "next/server";
import { db } from "@/server/db";
import { phoneNumbers } from "@/server/db/schema";
import { eq } from "drizzle-orm";
import { voiceRouting } from "@/server/services/voice/routing";
import { voiceOrchestrator } from "@/server/services/voice/orchestrator";
import { verifyTwilioSignature } from "@/server/utils/twilio-signature";
import {
  checkCallRateLimitAsync,
  generateRecordingConsentNotice,
  validateTransferDestination,
  checkTelephonyWebhookIdempotencyAsync,
  recordTelephonyWebhookResponseAsync,
} from "@/server/services/voice/security";

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
      const host = req.headers.get("x-forwarded-host") || req.headers.get("host") || "operator.nexxtechnologies.com";
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

    // Multi-instance persistent deduplication check for replayed telephony webhooks
    if (callSid !== "unknown-sid") {
      const { isDuplicate, cachedResponse } = await checkTelephonyWebhookIdempotencyAsync({
        callSid,
        eventType: "inbound",
      });
      if (isDuplicate && cachedResponse) {
        return new NextResponse(cachedResponse, {
          status: 200,
          headers: { "Content-Type": "text/xml" },
        });
      }
    }

    // Call Rate Limiting to prevent unlimited calls / excessive provider toll charges across serverless instances
    const { isRateLimited } = await checkCallRateLimitAsync(callerNumber);
    if (isRateLimited) {
      console.warn(`[Voice Webhook Inbound] Rate limit exceeded for caller: ${callerNumber}`);
      return new NextResponse(
        `<Response><Say>Call limit exceeded for this phone number. Please try again later.</Say><Hangup/></Response>`,
        { status: 429, headers: { "Content-Type": "text/xml" } }
      );
    }

    if (!recipientNumber) {
      return new NextResponse(
        `<Response><Say>Sorry, missing recipient metadata.</Say><Hangup/></Response>`,
        { status: 200, headers: { "Content-Type": "text/xml" } }
      );
    }

    // Match connected phone lines (prevents calls from being routed to the wrong business)
    const phoneLine = await db.query.phoneNumbers.findFirst({
      where: eq(phoneNumbers.phoneNumber, recipientNumber),
    });

    if (!phoneLine) {
      console.warn(`[Voice Webhook Inbound] No phone configuration matches: ${recipientNumber}`);
      return new NextResponse(
        `<Response><Say>Welcome to Operator. This phone number is not yet configured on the dashboard. Goodbye.</Say><Hangup/></Response>`,
        { status: 200, headers: { "Content-Type": "text/xml" } }
      );
    }

    const orgId = phoneLine.organizationId;

    // Server-side plan gating: check if organization plan includes voice AI
    const { subscriptionEngine } = await import("@/server/services/billing/subscription-engine");
    const { getPlan } = await import("@/lib/billing/plans");
    const subStatus = await subscriptionEngine.getSubscriptionStatus(orgId);
    const plan = getPlan(subStatus?.planId);
    if (!plan?.features?.voiceAI) {
      console.warn(`[Voice Webhook Inbound] Organization ${orgId} is on Starter plan without voice AI feature.`);
      return new NextResponse(
        `<Response><Say>Phone answering is not active on this account. Please visit your dashboard to activate the phone receptionist. Goodbye.</Say><Hangup/></Response>`,
        { status: 403, headers: { "Content-Type": "text/xml" } }
      );
    }

    if (subStatus.isRestricted || subStatus.state === "PAUSED") {
      console.warn(`[Voice Webhook Inbound] Organization ${orgId} is restricted/paused.`);
      return new NextResponse(
        `<Response><Say>Phone answering is currently suspended. Please update your account billing to resume service. Goodbye.</Say><Hangup/></Response>`,
        { status: 403, headers: { "Content-Type": "text/xml" } }
      );
    }

    // P4 / P6 Trial Voice limit enforcement: 30 minutes cap during trial
    if (subStatus.isTrial && ((subStatus.usage?.voiceMinutes?.current || 0) >= 30 || (subStatus.trialVoiceMinutesUsed || 0) >= 30)) {
      console.warn(`[Voice Webhook Inbound] Organization ${orgId} reached trial voice cap (30 minutes).`);
      return new NextResponse(
        `<Response><Say>You have reached the 30-minute voice limit for your trial. Please activate your full subscription to continue. Goodbye.</Say><Hangup/></Response>`,
        { status: 403, headers: { "Content-Type": "text/xml" } }
      );
    }

    // Evaluate Routing Actions
    const routing = await voiceRouting.getCallRoutingAction(orgId);
    let xmlResponse = "";

    switch (routing.action) {
      case "staff-dial": {
        const dialNumber = routing.targetNumber || phoneLine.phoneNumber;
        // Anti-toll fraud & destination validation
        const transferCheck = validateTransferDestination(dialNumber, [phoneLine.phoneNumber, routing.targetNumber || ""]);
        if (!transferCheck.isValid) {
          console.warn(`[Voice Webhook Inbound] Blocked unauthorized transfer to ${dialNumber}: ${transferCheck.error}`);
          xmlResponse = `
            <Response>
              <Say>Staff transfer is unavailable. Goodbye.</Say>
              <Hangup/>
            </Response>
          `;
          break;
        }

        xmlResponse = `
          <Response>
            <Say>Please hold while we transfer your call to a staff member.</Say>
            <Dial timeLimit="1800">${transferCheck.sanitizedNumber || dialNumber}</Dial>
          </Response>
        `;
        break;
      }

      case "voicemail": {
        // Mandatory recording consent notice
        const consentNotice = generateRecordingConsentNotice(true);
        xmlResponse = `
          <Response>
            ${consentNotice}
            <Say>Thank you for calling. We are currently unavailable or after operating hours. Please leave your name, number, and a message after the beep.</Say>
            <Record action="/api/webhooks/voice/recording?organizationId=${orgId}" maxLength="60" playBeep="true" />
            <Say>We did not receive any message. Goodbye.</Say>
            <Hangup/>
          </Response>
        `;
        break;
      }

      case "queue":
        xmlResponse = `
          <Response>
            <Say>All staff members are currently occupied. Please stay on the line.</Say>
            <Enqueue>default-hold-queue</Enqueue>
          </Response>
        `;
        break;

      case "ai-receptionist":
      default: {
        // Initialize call session in database
        const { sessionId, conversationId } = await voiceOrchestrator.handleInboundCall({
          organizationId: orgId,
          phoneNumberId: phoneLine.id,
          externalSessionId: callSid,
          callerNumber,
          recipientNumber,
        });

        const consentNotice = phoneLine.isRecordingEnabled
          ? generateRecordingConsentNotice(true)
          : "";

        const streamGatewayUrl = process.env.VOICE_STREAM_GATEWAY_URL;
        
        if (streamGatewayUrl) {
          // Dedicated WebSocket Gateway configured
          xmlResponse = `
            <Response>
              ${consentNotice}
              <Say>Thank you for calling. Connecting you to Operator AI.</Say>
              <Connect>
                <Stream url="${streamGatewayUrl}">
                  <Parameter name="organizationId" value="${orgId}" />
                  <Parameter name="sessionId" value="${sessionId}" />
                  <Parameter name="conversationId" value="${conversationId}" />
                </Stream>
              </Connect>
            </Response>
          `;
        } else {
          // Robust Serverless Conversational Speech Turn Loop
          const turnUrl = `/api/webhooks/voice/turn?sessionId=${sessionId}&conversationId=${conversationId}&organizationId=${orgId}&emptyTurns=0`;
          xmlResponse = `
            <Response>
              ${consentNotice}
              <Say>Welcome to Operator AI. How may I assist you today?</Say>
              <Gather input="speech" action="${turnUrl}" method="POST" speechTimeout="auto" timeout="4" actionOnEmptyResult="true">
              </Gather>
              <Say>I did not hear any response. Please let me know how I can help.</Say>
              <Gather input="speech" action="${turnUrl}&amp;emptyTurns=1" method="POST" speechTimeout="auto" timeout="4" actionOnEmptyResult="true">
              </Gather>
              <Say>Thank you for calling Operator AI. Have a great day! Goodbye.</Say>
              <Hangup/>
            </Response>
          `;
        }
        break;
      }
    }

    const trimmedResponse = xmlResponse.trim();
    if (callSid !== "unknown-sid") {
      await recordTelephonyWebhookResponseAsync({
        callSid,
        eventType: "inbound",
        responseXml: trimmedResponse,
      });
    }

    return new NextResponse(trimmedResponse, {
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
