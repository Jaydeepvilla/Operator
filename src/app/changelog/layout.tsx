import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Changelog | Operator",
  description: "See what's new in Operator. We are constantly improving Operator AI with new features, fixes, and integrations.",
};

export default function ChangelogLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
