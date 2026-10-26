import type { Metadata } from "next";
import React from "react";
import { redirect } from "next/navigation";
import { auth } from "@/lib/auth/server";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Operator — Authentication",
  description:
    "Sign in to your Operator workspace — the AI Business Operating System that books, qualifies, and answers 24/7.",
};

import { headers } from "next/headers";

export default async function AuthLayout({ children }: { children: React.ReactNode }) {
  const { userId } = await auth();
  const reqHeaders = await headers();
  const pathname = reqHeaders.get("x-pathname") || "";

  // Authenticated users should not see auth entry pages — redirect to dashboard
  if (userId && !pathname.includes("/login-success")) {
    redirect("/dashboard");
  }

  return <>{children}</>;
}
