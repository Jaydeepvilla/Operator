import { redirect } from "next/navigation";
import { getServicesAction } from "@/server/actions/services";
import { checkUserOrganization } from "@/server/actions/onboarding";
import { ServicesManager } from "@/components/forms/services-manager";
import { PageTitle } from "@/components/shared/page-title";

export default async function ServicesPage() {
  const { hasOrg } = await checkUserOrganization();
  if (!hasOrg) {
    redirect("/onboarding");
  }

  const response = await getServicesAction();

  if (!response.success || !response.services || !response.categories) {
    return (
      <div className="flex h-96 flex-col items-center justify-center text-center p-space-8 border border-[hsl(var(--foreground)/0.06)] radius-lg bg-[hsl(var(--foreground)/0.02)]">
        <h3 className="text-body-md  text-foreground">Couldn't load services</h3>
        <p className="text-body-sm text-muted-foreground mt-space-2">
          This is usually temporary. Try refreshing the page.
        </p>
      </div>
    );
  }

  // Cast categories and services to fit manager types
  const servicesMapped = response.services.map((s) => ({
    id: s.id,
    name: s.name,
    categoryId: s.categoryId,
    description: s.description,
    duration: s.duration,
    price: s.price,
    isActive: s.isActive,
  }));

  const categoriesMapped = response.categories.map((c) => ({
    id: c.id,
    name: c.name,
  }));

  return (
    <div className="space-y-space-4 animate-fade-in w-full pb-space-10">
      {/* Page Header */}
      <PageTitle
        title="Services"
        description="Here you tell your assistant what you offer and what it costs."
      />

      <ServicesManager initialServices={servicesMapped} categories={categoriesMapped} />
    </div>
  );
}

