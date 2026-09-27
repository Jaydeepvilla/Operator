import { NextRequest, NextResponse } from "next/server";
import { widgetRepository } from "@/server/repositories/widget";

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
    const { orgId, sessionId, eventType, eventData } = body;

    if (!orgId || !eventType) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400, headers: corsHeaders });
    }

    const event = await widgetRepository.createEvent({
      organizationId: orgId,
      sessionId: sessionId || null,
      eventType,
      eventData: eventData || null
    });

    return NextResponse.json({ success: true, eventId: event.id }, { headers: corsHeaders });
  } catch (error: any) {
    return NextResponse.json({ error: error?.message || "Failed to log event" }, { status: 500, headers: corsHeaders });
  }
}
