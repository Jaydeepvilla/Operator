import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { auth } from "@/lib/auth/server";

export const metadata: Metadata = {
  title: "Setup Your Business | Operator AI",
  description:
    "Configure your business profile to activate your Operator AI in minutes.",
};

export default async function OnboardingLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { userId } = await auth();

  // Unauthenticated users cannot access onboarding — redirect to sign-in and clear invalid session
  if (!userId) {
    redirect("/api/auth/logout?redirect=/sign-in");
  }

  return <>{children}</>;
}

