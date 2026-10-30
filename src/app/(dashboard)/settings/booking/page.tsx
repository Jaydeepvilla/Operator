import { redirect } from "next/navigation";
import { checkUserOrganization } from "@/server/actions/onboarding";
import { getBusinessSettingsAction } from "@/server/actions/settings";
import { getBookingRulesAction } from "@/server/actions/calendar";
import { PageTitle } from "@/components/shared/page-title";
import { BookingSettingsClient } from "./booking-settings-client";

export const metadata = {
  title: "Booking & Cancellation Policies | Settings",
  description: "Configure scheduling buffers, cancellation cutoffs, deposit rules, and booking guidelines.",
};

export default async function BookingSettingsPage() {
  const { hasOrg, org } = await checkUserOrganization();
  if (!hasOrg || !org) {
    redirect("/onboarding");
  }

  const [settingsRes, rulesRes] = await Promise.all([
    getBusinessSettingsAction(),
    getBookingRulesAction(),
  ]);

  if (!settingsRes.success || !settingsRes.settings) {
    throw new Error(settingsRes.error || "Failed to load business settings");
  }

  const rawPrefs = settingsRes.settings.bookingPreferences as Record<string, any> || {};

  const preferences = {
    slotIntervalMinutes: rawPrefs.slotIntervalMinutes ?? 30,
    bufferMinutes: rawPrefs.bufferMinutes ?? 10,
    autoApprove: rawPrefs.autoApprove ?? false,
    depositEnabled: rawPrefs.depositEnabled ?? false,
    depositAmount: rawPrefs.depositAmount ?? 50,
    depositType: rawPrefs.depositType || "fixed",
    cancellationPolicyText: rawPrefs.cancellationPolicyText || "",
  };

  const bookingRules = rulesRes.success && rulesRes.rules ? {
    minLeadTime: rulesRes.rules.minLeadTime ?? 2,
    maxLookahead: rulesRes.rules.maxLookahead ?? 30,
    defaultBufferBefore: rulesRes.rules.defaultBufferBefore ?? 0,
    defaultBufferAfter: rulesRes.rules.defaultBufferAfter ?? 0,
    allowRescheduling: rulesRes.rules.allowRescheduling ?? true,
    allowCancellation: rulesRes.rules.allowCancellation ?? true,
    cancellationLeadTime: rulesRes.rules.cancellationLeadTime ?? 24,
  } : {
    minLeadTime: 2,
    maxLookahead: 30,
    defaultBufferBefore: 0,
    defaultBufferAfter: 0,
    allowRescheduling: true,
    allowCancellation: true,
    cancellationLeadTime: 24,
  };

  return (
    <div className="space-y-space-6 animate-fade-in w-full pb-space-12">
      <PageTitle
        title="Booking & Cancellation Policies"
        description="Establish deposit requirements, cancellation fees, reschedule deadlines, and booking window rules."
      />

      <BookingSettingsClient 
        initialPreferences={preferences}
        initialRules={bookingRules}
        country={org.country}
        currency={(org as any).currency}
        isStripeConfigured={Boolean(
          process.env.STRIPE_SECRET_KEY &&
          process.env.STRIPE_SECRET_KEY.startsWith("sk_") &&
          process.env.STRIPE_WEBHOOK_SECRET
        )}
      />
    </div>
  );
}
