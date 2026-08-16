import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Interactive Demo | Operator AI",
  description: "Try out Operator AI live. See how it handles scheduling, answering FAQs, and qualifying leads 24/7.",
};

export default function DemoLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
