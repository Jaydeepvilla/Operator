import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Sentry Diagnostic | Operator",
  description: "Test Sentry error telemetry for Next.js",
};

export default function SentryExampleLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
