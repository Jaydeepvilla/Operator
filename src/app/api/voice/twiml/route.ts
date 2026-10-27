import { NextRequest, NextResponse } from "next/server";
import { verifyTwilioSignature } from "@/server/utils/twilio-signature";

/**
 * TwiML handler for outbound carrier dispatch.
 * When Twilio initiates an outbound call via Calls.json, it requests this URL
 * to fetch initial call instructions and media streaming configuration.
 */
export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData().catch(() => null);
    const body: Record<string, string> = {};
    if (formData) {
      formData.forEach((value, key) => {
        body[key] = value.toString();
      });
    }

    // Verify Twilio signature if auth token is set
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
        console.warn(`[Voice Outbound TwiML] Unauthorized signature from Twilio`);
        return new NextResponse(
          `<Response><Say>Unauthorized request signature.</Say><Hangup/></Response>`,
          { status: 401, headers: { "Content-Type": "text/xml" } }
        );
      }
    }

    const host = req.headers.get("x-forwarded-host") || req.headers.get("host") || "operator.nexxtechnologies.com";
    const protocol = host.includes("localhost") ? "ws" : "wss";

    const twiml = `
      <Response>
        <Say>Hello. You are connected to Operator AI. How may I assist you today?</Say>
        <Connect>
          <Stream url="${protocol}://${host}/api/webhooks/voice/stream">
            <Parameter name="direction" value="outbound" />
            <Parameter name="callSid" value="${body.CallSid || "unknown"}" />
          </Stream>
        </Connect>
      </Response>
    `.trim();

    return new NextResponse(twiml, {
      status: 200,
      headers: { "Content-Type": "text/xml" },
    });
  } catch (error: any) {
    console.error("[Voice Outbound TwiML] Handler error:", error);
    return new NextResponse(
      `<Response><Say>An internal connection error occurred. Goodbye.</Say><Hangup/></Response>`,
      { status: 200, headers: { "Content-Type": "text/xml" } }
    );
  }
}

export async function GET(req: NextRequest) {
  return POST(req);
}
