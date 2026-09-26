import { redirect } from "next/navigation";
import { getUserProfileAction } from "@/server/actions/user-profile";
import { PersonalSettingsForm } from "@/components/shared/settings-form";
import { PageTitle } from "@/components/shared/page-title";

export const metadata = {
  title: "Account Settings - Operator",
  description: "Manage your personal user profile, preferences, devices, and security settings.",
};

export default async function AccountSettingsPage() {
  const result = await getUserProfileAction();

  if (!result.success || !result.data) {
    redirect("/api/auth/logout?redirect=/sign-in");
  }

  return (
    <div className="space-y-space-4 animate-fade-in w-full pb-space-10">
      {/* Page Header */}
      <PageTitle
        title="Account Settings"
        description="Manage your personal profile, notification alerts, timezone preferences, and active devices."
      />

      <PersonalSettingsForm initialData={result.data as any} />
    </div>
  );
}
