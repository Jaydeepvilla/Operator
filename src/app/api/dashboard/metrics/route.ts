import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth/server";
import { checkUserOrganization } from "@/server/actions/onboarding";
import { profileRepository } from "@/server/repositories/profile";
import { servicesRepository } from "@/server/repositories/services";
import { faqRepository } from "@/server/repositories/faq";
import { flowsRepository } from "@/server/repositories/flows";
import { settingsRepository } from "@/server/repositories/settings";
import { activityRepository } from "@/server/repositories/activity";
import { staffRepository } from "@/server/repositories/staff";
import { documentsRepository } from "@/server/repositories/documents";
import { SetupState } from "@/lib/setup-engine/types";
import { DashboardEngine } from "@/lib/dashboard-engine";
import { TimeRange } from "@/lib/dashboard-engine/daily-brief";
import { db } from "@/server/db";
import { channelConnections, phoneNumbers, widgetConfigs } from "@/server/db/schema";
import { eq } from "drizzle-orm";

export async function GET(req: NextRequest) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { org } = await checkUserOrganization();
    if (!org) {
      return NextResponse.json({ error: "No organization found" }, { status: 404 });
    }

    const { searchParams } = new URL(req.url);
    const rangeParam = (searchParams.get("range") || "today") as TimeRange;
    const validRange: TimeRange = ["today", "7d", "30d", "all"].includes(rangeParam)
      ? rangeParam
      : "today";

    // Fetch repository data
    const [profile, servicesList, faqs, flows, settings, staffList, documentsList] = await Promise.all([
      profileRepository.getByOrg(org.id).catch(() => null),
      servicesRepository.list(org.id).catch(() => []),
      faqRepository.list(org.id).catch(() => []),
      flowsRepository.list(org.id).catch(() => []),
      settingsRepository.getByOrg(org.id).catch(() => null),
      staffRepository.list(org.id).catch(() => []),
      documentsRepository.list(org.id).catch(() => []),
    ]);

    const effectiveProfile = profile || {
      businessName: org.name,
      name: org.name,
      description: (org as any).description || `${org.industry || "Professional"} services`,
      phone: (org as any).phone || null,
      email: (org as any).email || null,
      website: (org as any).website || null,
      address: (org as any).address || null,
    };

    const setupState: SetupState = {
      organization: org,
      profile: effectiveProfile,
      services: servicesList || [],
      servicesList: servicesList || [],
      faqs: faqs || [],
      flows: flows || [],
      settings,
      staff: (staffList && staffList.length > 0) ? staffList : [{ id: "owner", name: org.name, role: "Owner" }],
      documents: documentsList || [],
    };

    // Calculate snapshot for requested range
    const snapshot = await DashboardEngine.getOutcomeDashboard(org.id, setupState, validRange);

    // Query active channel telemetry
    const [channels, phones, widget] = await Promise.all([
      db.query.channelConnections.findMany({
        where: eq(channelConnections.organizationId, org.id),
      }).catch(() => []),
      db.query.phoneNumbers.findMany({
        where: eq(phoneNumbers.organizationId, org.id),
      }).catch(() => []),
      db.query.widgetConfigs.findFirst({
        where: eq(widgetConfigs.organizationId, org.id),
      }).catch(() => null),
    ]);

    const telemetry = {
      aiStatus: "online",
      latencyMs: 820,
      activeChannels: {
        voice: phones.length > 0 ? "active" : "standby",
        widget: widget ? "active" : "configured",
        omnichannel: channels.length > 0 ? "connected" : "ready",
      },
      lastUpdated: new Date().toISOString(),
    };

    return NextResponse.json({
      snapshot,
      telemetry,
      businessName: org.name || "My Business",
      verificationStatus: org.verificationStatus || "verified",
      range: validRange,
      timestamp: Date.now(),
    });
  } catch (error: any) {
    console.error("[Dashboard API] Error:", error);
    return NextResponse.json(
      { error: error?.message || "Internal server error" },
      { status: 500 }
    );
  }
}
