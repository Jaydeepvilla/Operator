import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Features | Operator — Autonomous AI Receptionist",
  description: "Explore the enterprise features of Operator: Voice AI, omni-channel reception, dynamic booking, smart routing, and CRM synchronization.",
};

export default function FeaturesLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
