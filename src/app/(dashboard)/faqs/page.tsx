import { redirect } from "next/navigation";
import { getFaqsAction } from "@/server/actions/faq";
import { checkUserOrganization } from "@/server/actions/onboarding";
import { FaqBuilder } from "@/components/forms/faq-builder";
import { PageTitle } from "@/components/shared/page-title";

export default async function FaqsPage() {
  const { hasOrg } = await checkUserOrganization();
  if (!hasOrg) {
    redirect("/onboarding");
  }

  const response = await getFaqsAction();

  if (!response.success || !response.faqs) {
    return (
      <div className="flex h-96 flex-col items-center justify-center text-center p-space-8 border border-[hsl(var(--foreground)/0.06)] radius-lg bg-[hsl(var(--foreground)/0.02)]">
        <h3 className="text-body-md  text-foreground">Couldn’t load FAQs</h3>
        <p className="text-body-sm text-muted-foreground mt-space-2">
          This is usually temporary. Try refreshing the page.
        </p>
      </div>
    );
  }

  const faqsMapped = response.faqs.map((f) => ({
    id: f.id,
    question: f.question,
    answer: f.answer,
    category: f.category,
    isActive: f.isActive,
    order: f.order,
  }));

  return (
    <div className="flex flex-col flex-1 min-h-0 w-full overflow-hidden space-y-space-4 animate-fade-in">
      {/* Page Header */}
      <div className="shrink-0">
        <PageTitle
          title="FAQs"
          description="Common questions and answers. Your AI uses these to help customers instantly."
        />
      </div>

      <FaqBuilder initialFaqs={faqsMapped} />
    </div>
  );
}

