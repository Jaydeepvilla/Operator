import { redirect } from "next/navigation";
import { auth } from "@/lib/auth/server";
import { checkUserOrganization } from "@/server/actions/onboarding";
import { profileRepository } from "@/server/repositories/profile";
import { servicesRepository } from "@/server/repositories/services";
import { faqRepository } from "@/server/repositories/faq";
import { flowsRepository } from "@/server/repositories/flows";
import { settingsRepository } from "@/server/repositories/settings";
import { staffRepository } from "@/server/repositories/staff";
import { documentsRepository } from "@/server/repositories/documents";

import { SetupState } from "@/lib/setup-engine/types";
import { DashboardEngine } from "@/lib/dashboard-engine";
import { VerificationStatus } from "@/server/services/verification/types";
import { DashboardLiveClient } from "@/components/dashboard/dashboard-live-client";

export const dynamic = "force-dynamic";

export default async function DashboardPage() {
  const { userId } = await auth();
  if (!userId) {
    redirect("/api/auth/logout?redirect=/sign-in");
  }

  const { hasOrg, org, isCompleted } = await checkUserOrganization();
  if (!hasOrg || !org || !isCompleted) {
    redirect("/onboarding");
  }

  let profile: any = null;
  let servicesList: any[] = [];
  let faqs: any[] = [];
  let flows: any[] = [];
  let settings: any = null;
  let staffList: any[] = [];
  let documentsList: any[] = [];

  try {
    const results = await Promise.allSettled([
      profileRepository.getByOrg(org.id),
      servicesRepository.list(org.id),
      faqRepository.list(org.id),
      flowsRepository.list(org.id),
      settingsRepository.getByOrg(org.id),
      staffRepository.list(org.id),
      documentsRepository.list(org.id),
    ]);

    if (results[0].status === "fulfilled") profile = results[0].value;
    if (results[1].status === "fulfilled") servicesList = results[1].value || [];
    if (results[2].status === "fulfilled") faqs = results[2].value || [];
    if (results[3].status === "fulfilled") flows = results[3].value || [];
    if (results[4].status === "fulfilled") settings = results[4].value;
    if (results[5].status === "fulfilled") staffList = results[5].value || [];
    if (results[6].status === "fulfilled") documentsList = results[6].value || [];
  } catch (err) {
    console.warn("Dashboard repository query fallback:", err);
  }

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
    services: servicesList,
    servicesList,
    faqs,
    flows,
    settings,
    staff: staffList.length > 0 ? staffList : [{ id: "owner", name: org.name, role: "Owner" }],
    documents: documentsList,
  };

  // Get the outcome-oriented snapshot
  let snapshot: any = null;
  try {
    snapshot = await DashboardEngine.getOutcomeDashboard(org.id, setupState);
  } catch (e) {
    console.warn("DashboardEngine fallback:", e);
    snapshot = {
      dailyBrief: {
        conversationsHandled: 0,
        appointmentsBooked: 0,
        appointmentsCancelled: 0,
        appointmentsNoShow: 0,
        escalations: 0,
        missedOpportunities: 0,
        estimatedTimeSavedMinutes: 0,
        revenueGenerated: 0,
        aiSuccessRate: 100,
        conversionRate: 0,
        hasConversations: false,
        hasAppointments: false,
        date: new Date().toISOString(),
      },
      health: { score: 0, status: "needs_setup", breakdown: [] },
      gapAnalysis: { gaps: [], recommendations: [] },
      aiReadiness: { score: 0, factors: [] },
      knowledgeScore: { overall: 0, coverage: 0, missingDocuments: 0, suggestions: [], aiConfidence: 0 },
      nextBestAction: null,
      topRecommendations: [],
      setupProgress: { completed: 0, total: 5, percentage: 0, remainingMinutes: 10, items: [] },
      recentActivity: [],
      notifications: [],
    };
  }

  const businessName = org.name || "your business";
  const verificationStatus = (org.verificationStatus as VerificationStatus) || "unverified";

  return (
    <DashboardLiveClient
      initialSnapshot={snapshot}
      businessName={businessName}
      verificationStatus={verificationStatus}
      orgId={org.id}
    />
  );
}
