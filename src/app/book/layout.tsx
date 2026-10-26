import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Book Appointment | Operator",
  description: "Schedule your appointment effortlessly with our AI receptionist.",
};

export default function BookLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
