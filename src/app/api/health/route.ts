import { NextResponse } from "next/server";
import { db } from "@/server/db";
import { sql } from "drizzle-orm";

const startTime = Date.now();

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * GET /api/health
 * Production health check endpoint for uptime monitoring.
 * Returns service status, database connectivity, and uptime.
 */
export async function GET() {
  const checks: Record<string, { status: "ok" | "error"; latencyMs?: number; error?: string }> = {};

  // 1. Database check
  const dbStart = Date.now();
  try {
    await db.execute(sql`SELECT 1`);
    checks.database = { status: "ok", latencyMs: Date.now() - dbStart };
  } catch (err) {
    checks.database = {
      status: "error",
      latencyMs: Date.now() - dbStart,
      error: err instanceof Error ? err.message : "Unknown database error",
    };
  }

  // 2. Kokoro TTS Engine check
  try {
    const { checkKokoroStatus } = await import("@/server/services/voice/kokoro");
    const kokoroStatus = await checkKokoroStatus();
    if (kokoroStatus.ready) {
      checks.tts = { status: "ok" };
    } else {
      checks.tts = { status: "error", error: kokoroStatus.error || "Kokoro TTS engine unready" };
    }
  } catch (err: any) {
    checks.tts = { status: "error", error: err.message || "Failed checking TTS" };
  }

  // 3. Inworld TTS Provider check
  try {
    const { checkInworldStatus } = await import("@/server/services/voice/inworld");
    const inworldStatus = await checkInworldStatus();
    checks.inworldTts = inworldStatus.configured
      ? { status: "ok" }
      : { status: "ok", error: "Not configured (optional)" };
  } catch (err: any) {
    checks.inworldTts = { status: "error", error: err.message || "Failed checking Inworld TTS" };
  }

  // 3. Overall status
  const allHealthy = Object.values(checks).every((c) => c.status === "ok");

  const payload = {
    status: allHealthy ? "healthy" : "degraded",
    version: process.env.npm_package_version ?? "0.1.0",
    environment: process.env.NODE_ENV ?? "development",
    uptimeSeconds: Math.round((Date.now() - startTime) / 1000),
    timestamp: new Date().toISOString(),
    checks,
  };

  return NextResponse.json(payload, {
    status: allHealthy ? 200 : 503,
    headers: {
      "Cache-Control": "no-store, no-cache",
      "Content-Type": "application/json",
    },
  });
}
