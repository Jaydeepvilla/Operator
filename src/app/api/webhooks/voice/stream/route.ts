import { NextRequest, NextResponse } from "next/server";

/**
 * Next.js API Handler for the Media Streaming Endpoint.
 * In a production serverless or Vercel deployment, persistent WebSockets are typically handled
 * via a WebSocket gateway (e.g., AWS API Gateway, Twilio media stream redirection to a custom Node.js server,
 * or Serverless WebSockets proxy).
 *
 * This handler registers the stream endpoint configurations and handles standard handshake requests.
 */
export async function GET(req: NextRequest) {
  return NextResponse.json({
    status: "online",
    service: "Operator Voice Streaming Routing Gateway",
    supportedCodecs: ["audio/x-mulaw", "audio/mulaw"],
    sampleRate: 8000,
    webSocketUrl: `wss://${req.headers.get("host") || "app.operator.ai"}/api/webhooks/voice/stream`,
  });
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}));
    return NextResponse.json({
      success: true,
      message: "Streaming handshake completed. Active socket connection can initiate.",
      connectionParameters: {
        codec: "audio/x-mulaw",
        frequency: 8000,
        enableInterruptionDetection: true,
      },
    });
  } catch (error: any) {
    console.error("[Voice Stream Webhook] Handshake failed:", error);
    return NextResponse.json({ error: "Handshake process failed" }, { status: 500 });
  }
}
