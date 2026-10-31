import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth/server";
import { subscriptionEngine } from "@/server/services/billing/subscription-engine";

export async function GET(req: NextRequest) {
  try {
    const { userId, orgId } = await auth();
    if (!userId || !orgId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const subStatus = await subscriptionEngine.getSubscriptionStatus(orgId);

    const isConfirmed =
      (subStatus.state === "TRIALING" || subStatus.state === "ACTIVE") &&
      subStatus.hasPaymentMethod;

    return NextResponse.json({
      ready: isConfirmed,
      state: subStatus.state,
      planId: subStatus.planId,
      planName: subStatus.plan.name,
      isTrial: subStatus.isTrial,
      hasPaymentMethod: subStatus.hasPaymentMethod,
      trialDaysRemaining: subStatus.trialDaysRemaining,
      trialEndsAt: subStatus.trialEndsAt,
      currentPeriodEnd: subStatus.currentPeriodEnd,
      isRestricted: subStatus.isRestricted,
    });
  } catch (error: any) {
    console.error("Subscription status check error:", error);
    return NextResponse.json({ error: error.message || "Internal server error" }, { status: 500 });
  }
}

