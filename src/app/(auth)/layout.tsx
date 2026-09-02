import type { Metadata } from "next";
import React from "react";
import { redirect } from "next/navigation";
import { auth } from "@/lib/auth/server";

export const metadata: Metadata = {
  title: "Operator — Authentication",
  description:
    "Sign in to your Operator workspace — the AI Business Operating System that books, qualifies, and answers 24/7.",
};

export default async function AuthLayout({ children }: { children: React.ReactNode }) {
  const { userId } = await auth();

  // Authenticated users should not see auth pages — redirect to dashboard
  if (userId) {
    redirect("/dashboard");
  }

  return <>{children}</>;
}
