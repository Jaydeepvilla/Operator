import { redirect } from "next/navigation";
import { getBusinessProfileAction } from "@/server/actions/profile";
import { BusinessProfileForm } from "@/components/forms/business-profile-form";
import { checkUserOrganization } from "@/server/actions/onboarding";
import { PageTitle } from "@/components/shared/page-title";

export const metadata = {
  title: "Business Profile - Operator",
  description: "Manage your business receptionist profile and brand parameters.",
};

export default async function ProfilePage() {
  const { hasOrg } = await checkUserOrganization();
  if (!hasOrg) {
    redirect("/onboarding");
  }

  const bizResponse = await getBusinessProfileAction();

  if (!bizResponse.success || !bizResponse.data) {
    return (
      <div className="flex h-96 flex-col items-center justify-center text-center p-space-8 border border-border/60 rounded-xl bg-[hsl(var(--foreground)/0.02)]">
        <h3 className="text-body-md text-foreground font-bold">Couldn’t load profile</h3>
        <p className="text-caption text-muted-foreground mt-space-2">
          Failed to retrieve your business configurations. Please try refreshing.
        </p>
      </div>
    );
  }

  const { organization, profile } = bizResponse.data;

  return (
    <div className="space-y-space-4 animate-fade-in w-full pb-space-10">
      {/* Page Header */}
      <PageTitle
        title="Business Profile"
        description="Your business info. This is what your AI tells customers about you."
      />

      <div className="pt-2">
        <BusinessProfileForm organization={organization} profile={profile} />
      </div>
    </div>
  );
}
