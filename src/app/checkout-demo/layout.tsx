import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Checkout Demo | Operator",
  description: "Test checkout flows and payment integration in the demo environment.",
};

export default function CheckoutDemoLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
