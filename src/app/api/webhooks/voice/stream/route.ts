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
  const isHealthCheck = req.nextUrl.searchParams.get("health") === "true";
  if (isHealthCheck) {
    return NextResponse.json({
      status: "online",
      service: "Operator Voice Streaming Diagnostic Endpoint",
      configuredGateway: process.env.VOICE_STREAM_GATEWAY_URL || null,
      supportedCodecs: ["audio/x-mulaw", "audio/mulaw"],
      sampleRate: 8000,
    });
  }

  // Next.js App Router route handlers operate over HTTP and cannot upgrade to WebSocket protocol.
  return NextResponse.json(
    {
      error: "Upgrade Required",
      code: "WEBSOCKET_UPGRADE_REQUIRED",
      message: "Twilio Media Streams require a persistent WebSocket server (RFC 6455). This endpoint is hosted on Next.js HTTP runtime.",
      configuredGateway: process.env.VOICE_STREAM_GATEWAY_URL || "ws://localhost:8080/media-stream",
      resolution: "Set VOICE_STREAM_GATEWAY_URL to point to a dedicated WebSocket gateway, or omit to use Operator's native Conversational HTTP Speech turns.",
    },
    {
      status: 426,
      headers: {
        "Upgrade": "WebSocket",
        "Connection": "Upgrade",
      },
    }
  );
}

export async function POST(req: NextRequest) {
  return GET(req);
}
