import { redirect } from "next/navigation";
import { checkUserOrganization } from "@/server/actions/onboarding";
import { OnboardingWizard } from "@/components/forms/onboarding-wizard";
import Link from "next/link";
import { Logo } from "@/components/shared/logo";
import { ShieldCheck } from "lucide-react";

export default async function OnboardingPage() {
  const { hasOrg } = await checkUserOrganization();
  if (hasOrg) redirect("/dashboard");

  return (
    <div className="relative min-h-screen bg-background flex flex-col">
      {/* Subtle ambient lighting backdrop */}
      <div className="pointer-events-none fixed inset-0 z-0">
        <div
          className="absolute top-[-20%] left-[-10%] w-[60vw] h-[60vh] rounded-full blur-[140px] opacity-40"
          style={{ background: "hsl(var(--primary) / 0.12)" }}
        />
        <div
          className="absolute bottom-[-10%] right-[-5%] w-[50vw] h-[50vh] rounded-full blur-[120px] opacity-30"
          style={{ background: "hsl(280 80% 60% / 0.08)" }}
        />
        {/* Dot grid */}
        <div
          className="absolute inset-0 opacity-[0.07]"
          style={{
            backgroundImage:
              "radial-gradient(circle, hsl(var(--foreground)) 1px, transparent 1px)",
            backgroundSize: "32px 32px",
          }}
        />
        <div className="absolute inset-x-0 top-0 h-28 bg-gradient-to-b from-background to-transparent" />
        <div className="absolute inset-x-0 bottom-0 h-28 bg-gradient-to-t from-background to-transparent" />
      </div>

      {/* Sticky Top Header with Logo */}
      <header className="sticky top-0 z-50 w-full border-b border-border/40 bg-background/85 backdrop-blur-xl transition-all shadow-sm">
        <div className="mx-auto flex max-w-5xl items-center justify-between px-6 py-3.5 sm:px-8">
          <Link href="/" aria-label="Operator home" className="flex items-center gap-2 group transition-transform active:scale-95">
            <Logo iconClassName="text-primary h-6 w-6 transition-transform group-hover:scale-105" className="gap-2 text-foreground font-bold text-lg tracking-tight" />
          </Link>
          <div className="flex items-center gap-2.5 rounded-full border border-primary/20 bg-primary/5 px-3 py-1 text-xs font-semibold text-primary">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
            </span>
            <span>Setup & Verification</span>
          </div>
        </div>
      </header>

      {/* Main Form & Confidence Bridge Area */}
      <main className="relative z-10 flex flex-1 flex-col items-center justify-center px-4 py-8 sm:px-6 sm:py-12">
        <div className="w-full max-w-[580px]">
          <OnboardingWizard />
        </div>
      </main>

      {/* Footer */}
      <footer className="relative z-10 flex items-center justify-center gap-space-6 px-space-8 py-space-5 text-caption text-muted-foreground border-t border-border/30 bg-background/40 backdrop-blur-sm">
        <Link href="/privacy" className="hover:text-foreground transition-colors">Privacy</Link>
        <Link href="/terms" className="hover:text-foreground transition-colors">Terms</Link>
        <span>© 2025 Operator</span>
      </footer>
    </div>
  );
}