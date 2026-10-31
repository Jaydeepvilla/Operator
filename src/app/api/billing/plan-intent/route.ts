import { NextRequest, NextResponse } from "next/server";
import {
  validatePlanIntent,
  serializePlanIntent,
  PLAN_INTENT_COOKIE,
  getPlanIntentFromCookies,
} from "@/lib/billing/plan-intent";

export async function GET() {
  const intent = await getPlanIntentFromCookies();
  return NextResponse.json({ intent });
}

export async function POST(req: NextRequest) {
  try {
    const searchParams = req.nextUrl.searchParams;
    let plan = searchParams.get("plan");
    let interval = searchParams.get("interval");
    let currency = searchParams.get("currency");

    if (!plan && req.headers.get("content-type")?.includes("application/json")) {
      const body = await req.json().catch(() => ({}));
      plan = body.plan;
      interval = body.interval;
      currency = body.currency;
    }

    const validated = validatePlanIntent(plan, interval, currency);
    if (!validated) {
      return NextResponse.json({ error: "Invalid plan intent" }, { status: 400 });
    }

    const res = NextResponse.json({ success: true, intent: validated });
    res.cookies.set(PLAN_INTENT_COOKIE, serializePlanIntent(validated), {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
      maxAge: 7 * 24 * 60 * 60,
    });

    return res;
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

