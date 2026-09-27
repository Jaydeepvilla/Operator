import Link from "next/link";
import { auth } from "@/lib/auth/server";
import { MarketingNav } from "@/components/marketing/nav";
import { MarketingFooter } from "@/components/marketing/footer";
import { LandingPageClient } from "@/components/marketing/landing-page-client";

export const metadata = {
  title: "Operator — Never Miss Another Customer | 24/7 AI Receptionist",
  description:
    "Operator answers every call, books every appointment, and qualifies every lead — 24/7, in under 2 seconds. Built for dental, medical, salons, law firms, and service businesses.",
};

export default async function HomePage() {
  const { userId } = await auth();
  return (
    <div className="relative flex flex-col min-h-screen bg-background text-foreground">
      <MarketingNav />
      <LandingPageClient />
      <MarketingFooter />
    </div>
  );
}
