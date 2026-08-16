import { redirect } from "next/navigation";
import { getBusinessSettingsAction } from "@/server/actions/settings";
import { checkUserOrganization } from "@/server/actions/onboarding";
import { BusinessSettingsForm } from "@/components/forms/business-settings-form";
import { getBookingRulesAction } from "@/server/actions/calendar";
import { PageTitle } from "@/components/shared/page-title";

export default async function SettingsPage() {
  const { hasOrg } = await checkUserOrganization();
  if (!hasOrg) {
    redirect("/onboarding");
  }

  const [settingsRes, rulesRes] = await Promise.all([
    getBusinessSettingsAction(),
    getBookingRulesAction(),
  ]);

  if (!settingsRes.success || !settingsRes.settings) {
    return (
      <div className="flex h-96 flex-col items-center justify-center text-center p-space-8 border border-[hsl(var(--foreground)/0.06)] radius-lg bg-[hsl(var(--foreground)/0.02)]">
        <h3 className="text-body-md  text-foreground">Couldn’t load settings</h3>
        <p className="text-body-sm text-muted-foreground mt-space-2">
          This is usually temporary. Try refreshing the page.
        </p>
      </div>
    );
  }

  const settingsMapped = {
    id: settingsRes.settings.id,
    businessHours: settingsRes.settings.businessHours,
    holidays: settingsRes.settings.holidays,
    languages: settingsRes.settings.languages,
    bookingPreferences: settingsRes.settings.bookingPreferences,
    notificationPreferences: settingsRes.settings.notificationPreferences,
    leadAssignmentRules: settingsRes.settings.leadAssignmentRules,
  };

  return (
    <div className="space-y-space-8 animate-fade-in w-full">
      {/* Page Header */}
      <PageTitle
        title="Hours & Booking"
        description="Business hours, holidays, and booking preferences."
      />

      <BusinessSettingsForm 
        settings={settingsMapped} 
        bookingRules={rulesRes.success ? rulesRes.rules : null}
      />
    </div>
  );
}

