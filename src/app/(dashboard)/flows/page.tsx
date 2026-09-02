"use server";

import { redirect } from "next/navigation";
import { getFlowQuestionsAction } from "@/server/actions/flows";
import { checkUserOrganization } from "@/server/actions/onboarding";
import { QualificationBuilder } from "@/components/forms/qualification-builder";

export default async function FlowsPage() {
 const { hasOrg } = await checkUserOrganization();
 if (!hasOrg) {
 redirect("/onboarding");
 }

 const response = await getFlowQuestionsAction();

 if (!response.success || !response.questions) {
 return (
 <div className="flex h-96 flex-col items-center justify-center text-center p-space-8 border radius-lg border-border">
 <h3 className="text-title-lg text-foreground">Couldn’t load intake questions</h3>
 <p className="text-body-sm text-muted-foreground mt-space-2">
 This is usually temporary. Try refreshing the page.
 </p>
 </div>
 );
 }

 const questionsMapped = response.questions.map((q) => ({
 id: q.id,
 question: q.question,
 answerType: q.answerType,
 options: q.options,
 isRequired: q.isRequired,
 order: q.order,
 }));

 return (
 <div className="space-y-space-4 animate-fade-in w-full h-full flex flex-col overflow-hidden">
 {/* Page Header */}
 <div className="shrink-0 pb-space-2 border-b border-[hsl(var(--foreground)/0.06)]">
 <h1 className="text-title-lg font-semibold tracking-tight-md text-foreground">
 Intake Questions
 </h1>
 <p className="text-body-sm text-muted-foreground mt-space-0.5">
          Questions your AI asks before booking. Collect name, service preference, and more.
        </p>
      </div>

      <QualificationBuilder initialQuestions={questionsMapped} />
    </div>
  );
}
