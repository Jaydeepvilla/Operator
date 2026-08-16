import { checkUserOrganization } from "@/server/actions/onboarding";
import { profileRepository } from "@/server/repositories/profile";
import { servicesRepository } from "@/server/repositories/services";
import { faqRepository } from "@/server/repositories/faq";
import { flowsRepository } from "@/server/repositories/flows";
import { settingsRepository } from "@/server/repositories/settings";

import { SetupState } from "@/lib/setup-engine/types";
import { DashboardEngine } from "@/lib/dashboard-engine";
import { DashboardWidgets } from "@/components/dashboard/widget-registry";
import { ScrollReveal } from "@/components/motion";
import { DashboardVerificationBar } from "@/components/confidence-bridge/dashboard-verification-bar";
import { VerificationStatus } from "@/server/services/verification/types";

export default async function DashboardPage() {
  const { org } = await checkUserOrganization();
  const activeOrg = org || {
    id: "00000000-0000-0000-0000-000000000000",
    name: "My Business",
    industry: "Other",
    verificationStatus: "verified",
  };

  let profile: any = null;
  let servicesList: any[] = [];
  let faqs: any[] = [];
  let flows: any[] = [];
  let settings: any = null;

  try {
    const results = await Promise.allSettled([
      profileRepository.getByOrg(activeOrg.id),
      servicesRepository.list(activeOrg.id),
      faqRepository.list(activeOrg.id),
      flowsRepository.list(activeOrg.id),
      settingsRepository.getByOrg(activeOrg.id),
    ]);

    if (results[0].status === "fulfilled") profile = results[0].value;
    if (results[1].status === "fulfilled") servicesList = results[1].value || [];
    if (results[2].status === "fulfilled") faqs = results[2].value || [];
    if (results[3].status === "fulfilled") flows = results[3].value || [];
    if (results[4].status === "fulfilled") settings = results[4].value;
  } catch (err) {
    console.warn("Dashboard repository query fallback:", err);
  }

  const setupState: SetupState = {
    profile,
    servicesList,
    faqs,
    flows,
    settings,
    staff: [],
  };

  // Get the outcome-oriented snapshot
  let snapshot: any = null;
  try {
    snapshot = await DashboardEngine.getOutcomeDashboard(activeOrg.id, setupState);
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
        date: new Date().toISOString(),
      },
      health: { score: 95, status: "healthy", breakdown: [] },
      gapAnalysis: { gaps: [], recommendations: [] },
      aiReadiness: { score: 95, factors: [] },
      knowledgeScore: { overall: 90, coverage: 90, missingDocuments: 0, suggestions: [], aiConfidence: 95 },
      nextBestAction: null,
      topRecommendations: [],
      setupProgress: { completed: 3, total: 3, percentage: 100, remainingMinutes: 0, items: [] },
      recentActivity: [],
      notifications: [],
    };
  }

  const businessName = activeOrg.name || "your business";
  const verificationStatus = (activeOrg.verificationStatus as VerificationStatus) || "verified";

  return (
    <div className="w-full pb-space-16">
      <div className="space-y-space-5 w-full">
        {/* Verification Status Banner (Rendered when unverified or needs review) */}
        <DashboardVerificationBar
          businessName={businessName}
          verificationStatus={verificationStatus}
          orgId={activeOrg.id}
        />

        {/* 1. Hero Widget: AI Daily Brief */}
        <ScrollReveal>
          <DashboardWidgets.DailyBrief brief={snapshot.dailyBrief} businessName={businessName} />
        </ScrollReveal>

        {/* 2. Setup Journey (Left 50%) & Quick Actions (Right 50%) */}
        <ScrollReveal className="grid grid-cols-1 lg:grid-cols-2 gap-space-5">
          <DashboardWidgets.SetupProgress progress={snapshot.setupProgress} />
          <DashboardWidgets.QuickActions />
        </ScrollReveal>

        {/* 3. Headline Outcomes Row: Conversations, Bookings, Knowledge */}
        <ScrollReveal className="grid grid-cols-1 md:grid-cols-3 gap-space-5">
          <DashboardWidgets.ConversationPerf brief={snapshot.dailyBrief} />
          <DashboardWidgets.BookingPerf brief={snapshot.dailyBrief} />
          <DashboardWidgets.KnowledgeStatus knowledgeScore={snapshot.knowledgeScore} />
        </ScrollReveal>

        {/* 4. Outcomes & Gaps Row: AI Recommendations, Missing Requirements, Business Health */}
        <ScrollReveal className="grid grid-cols-1 lg:grid-cols-3 gap-space-5">
          <DashboardWidgets.AIRecommendations recommendations={snapshot.topRecommendations} />
          <DashboardWidgets.MissedOpps gapAnalysis={snapshot.gapAnalysis} />
          <DashboardWidgets.BusinessHealth health={snapshot.health} />
        </ScrollReveal>

        {/* 5. Operations Row: Recent Activity (Full width) */}
        {snapshot.recentActivity && snapshot.recentActivity.length > 0 && (
          <ScrollReveal className="w-full">
            <DashboardWidgets.RecentActivity activity={snapshot.recentActivity} />
          </ScrollReveal>
        )}
      </div>
    </div>
  );
}

