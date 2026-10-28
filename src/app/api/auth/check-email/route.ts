import { NextRequest, NextResponse } from "next/server";
import { db } from "@/server/db";
import { users } from "@/server/db/schema";
import { eq } from "drizzle-orm";
import { isReservedEmail, isDisposableEmail } from "@/lib/auth/security-checks";
import { checkEmailCheckRateLimit } from "@/lib/auth/rate-limit";

export async function GET(request: NextRequest) {
  try {
    const ipAddress = request.headers.get("x-forwarded-for")?.split(",")[0] || request.headers.get("x-real-ip") || undefined;
    const rateLimit = await checkEmailCheckRateLimit(ipAddress);
    if (rateLimit.isLocked) {
      return NextResponse.json({ error: "Too many requests. Please try again later." }, { status: 429 });
    }

    const { searchParams } = new URL(request.url);
    const email = searchParams.get("email");

    if (!email) {
      return NextResponse.json({ error: "Email is required" }, { status: 400 });
    }

    const emailClean = email.trim().toLowerCase();

    // Check reserved
    const reserved = isReservedEmail(emailClean);

    // Check disposable
    const disposable = isDisposableEmail(emailClean);

    // Check duplicate
    const [existing] = await db
      .select({ id: users.id })
      .from(users)
      .where(eq(users.email, emailClean))
      .limit(1);

    const registered = !!existing;
    const available = !reserved && !disposable && !registered;

    return NextResponse.json({
      registered,
      reserved,
      disposable,
      available,
    });
  } catch (error: any) {
    console.error("check-email API error:", error);
    return NextResponse.json({ error: "Internal validation failed" }, { status: 500 });
  }
}
