import { NextRequest, NextResponse } from "next/server";
import { db } from "@/server/db";
import { organizations, callSessions, phoneNumbers } from "@/server/db/schema";
import { eq, and } from "drizzle-orm";
import { voiceOrchestrator } from "@/server/services/voice/orchestrator";
import { verifyTwilioSignature } from "@/server/utils/twilio-signature";

/**
 * Conversational Voice Turn Handler (Twilio Voice Protocol).
 *
 * Implements conversational turns for serverless and cloud hosting runtimes
 * where persistent WebSockets cannot be maintained inside Next.js App Router handlers.
 *
 * Lifecycle:
 * 1. Twilio speech recognizer delivers transcribed speech to this endpoint.
 * 2. Authenticates request signature against TWILIO_AUTH_TOKEN.
 * 3. Dispatches recognized speech turn to voiceOrchestrator (RAG context, Gemini 3.5, Kokoro TTS).
 * 4. Returns TwiML response with assistant speech (<Say>) and prompts for caller's next turn (<Gather>).
 * 5. Handles silence / disconnect timeouts cleanly.
 */
export async function POST(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const sessionId = searchParams.get("sessionId");
    const conversationId = searchParams.get("conversationId");
    const organizationId = searchParams.get("organizationId");
    const emptyCount = parseInt(searchParams.get("emptyTurns") || "0", 10);

    const formData = await req.formData().catch(() => null);
    const body: Record<string, string> = {};
    if (formData) {
      formData.forEach((value, key) => {
        body[key] = value.toString();
      });
    }

    // 1. Signature Verification
    const twilioSignature = req.headers.get("x-twilio-signature") || "";
    const twilioAuthToken = process.env.TWILIO_AUTH_TOKEN || "";
    if (twilioAuthToken) {
      const host = req.headers.get("x-forwarded-host") || req.headers.get("host") || "app.operator.ai";
      const proto = req.headers.get("x-forwarded-proto") || "https";
      const fullUrl = `${proto}://${host}${new URL(req.url).pathname}${new URL(req.url).search}`;

      const isValid = verifyTwilioSignature({
        authToken: twilioAuthToken,
        signature: twilioSignature,
        url: fullUrl,
        params: body,
      });

      if (!isValid) {
        console.warn(`[Voice Webhook Turn] Invalid Twilio request signature`);
        return new NextResponse(
          `<Response><Say>Unauthorized request signature.</Say><Hangup/></Response>`,
          { status: 401, headers: { "Content-Type": "text/xml" } }
        );
      }
    }

    if (!sessionId || !conversationId) {
      return new NextResponse(
        `<Response><Say>Missing active call session identifiers. Goodbye.</Say><Hangup/></Response>`,
        { status: 200, headers: { "Content-Type": "text/xml" } }
      );
    }

    // Fetch call session to resolve organization
    const [session] = await db
      .select()
      .from(callSessions)
      .where(eq(callSessions.id, sessionId))
      .limit(1);

    if (!session) {
      return new NextResponse(
        `<Response><Say>Session has expired. Goodbye.</Say><Hangup/></Response>`,
        { status: 200, headers: { "Content-Type": "text/xml" } }
      );
    }

    const orgId = organizationId || session.organizationId;
    const speechResult = (body.SpeechResult || "").trim();

    // 2. Silence / No-Input Handling
    if (!speechResult) {
      if (emptyCount >= 2) {
        // More than 2 consecutive empty turns: safely terminate call
        await voiceOrchestrator.endCallSession({
          organizationId: orgId,
          sessionId,
          durationSeconds: 15,
          endedReason: "caller_silence_timeout",
        });

        return new NextResponse(
          `<Response><Say>It looks like we are not hearing any input. Thank you for calling Operator. Goodbye.</Say><Hangup/></Response>`,
          { status: 200, headers: { "Content-Type": "text/xml" } }
        );
      }

      const nextEmptyCount = emptyCount + 1;
      const turnActionUrl = `/api/webhooks/voice/turn?sessionId=${sessionId}&conversationId=${conversationId}&organizationId=${orgId}&emptyTurns=${nextEmptyCount}`;

      return new NextResponse(
        `
        <Response>
          <Say>I'm still here. How may I assist you today?</Say>
          <Gather input="speech" action="${turnActionUrl}" method="POST" speechTimeout="auto" timeout="4" actionOnEmptyResult="true">
          </Gather>
          <Say>Thank you for calling. Goodbye.</Say>
          <Hangup/>
        </Response>
        `.trim(),
        { status: 200, headers: { "Content-Type": "text/xml" } }
      );
    }

    // 3. Process recognized speech through voiceOrchestrator
    const result = await voiceOrchestrator.processStreamingSpeech({
      organizationId: orgId,
      sessionId,
      conversationId,
      speaker: "caller",
      content: speechResult,
    });

    const assistantText = result.textResponse;

    // Check if assistant or user initiated end of call
    const isFarewell = /^(goodbye|bye|have a (great|good) (day|evening)|talk to you soon)\b/i.test(assistantText) ||
      /\b(goodbye|bye now)\b/i.test(speechResult);

    if (isFarewell) {
      await voiceOrchestrator.endCallSession({
        organizationId: orgId,
        sessionId,
        durationSeconds: 30,
        endedReason: "conversation_completed",
      });

      return new NextResponse(
        `
        <Response>
          <Say>${escapeXml(assistantText)}</Say>
          <Hangup/>
        </Response>
        `.trim(),
        { status: 200, headers: { "Content-Type": "text/xml" } }
      );
    }

    // Continue conversation turn loop
    const turnActionUrl = `/api/webhooks/voice/turn?sessionId=${sessionId}&conversationId=${conversationId}&organizationId=${orgId}&emptyTurns=0`;

    const twiml = `
      <Response>
        <Say>${escapeXml(assistantText)}</Say>
        <Gather input="speech" action="${turnActionUrl}" method="POST" speechTimeout="auto" timeout="4" actionOnEmptyResult="true">
        </Gather>
        <Say>Are you still there? Please let me know how I can help.</Say>
        <Gather input="speech" action="${turnActionUrl}&amp;emptyTurns=1" method="POST" speechTimeout="auto" timeout="4" actionOnEmptyResult="true">
        </Gather>
        <Say>Thank you for calling Operator. Goodbye.</Say>
        <Hangup/>
      </Response>
    `.trim();

    return new NextResponse(twiml, {
      status: 200,
      headers: { "Content-Type": "text/xml" },
    });
  } catch (error: any) {
    console.error("[Voice Webhook Turn] Processing error:", error);
    return new NextResponse(
      `
      <Response>
        <Say>I apologize, I experienced a brief connection glitch. Could you please repeat that?</Say>
        <Gather input="speech" method="POST" speechTimeout="auto" timeout="4">
        </Gather>
        <Say>Thank you for calling. Goodbye.</Say>
        <Hangup/>
      </Response>
      `.trim(),
      { status: 200, headers: { "Content-Type": "text/xml" } }
    );
  }
}

function escapeXml(unsafe: string): string {
  return unsafe
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}
