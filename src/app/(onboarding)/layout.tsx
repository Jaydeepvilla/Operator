import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Setup Your Business | Operator AI",
  description:
    "Configure your business profile to activate your Operator AI in minutes.",
};

export default function OnboardingLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
