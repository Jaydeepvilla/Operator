import type { Metadata } from "next";
import React from "react";
import { redirect } from "next/navigation";
import { headers } from "next/headers";
import { auth } from "@/lib/auth/server";
import { getPlanIntentFromCookies } from "@/lib/billing/plan-intent";
import { evaluateRouteGuard } from "@/server/services/routing/route-guard";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Operator — Authentication",
  description:
    "Sign in to your Operator workspace — the AI Business Operating System that books, qualifies, and answers 24/7.",
};

export default async function AuthLayout({ children }: { children: React.ReactNode }) {
  const { userId } = await auth();
  const reqHeaders = await headers();
  const pathname = reqHeaders.get("x-pathname") || "";

  // Authenticated users should not see auth entry pages — resolve plan intent or evaluate route guard
  if (userId && !pathname.includes("/login-success")) {
    const cookieIntent = await getPlanIntentFromCookies();
    if (cookieIntent) {
      redirect(
        `/billing/checkout?plan=${cookieIntent.planId}&interval=${cookieIntent.interval}&currency=${cookieIntent.currency || "USD"}`
      );
    }
    const decision = await evaluateRouteGuard({
      requestedPath: "/dashboard",
      autoRedirect: false,
    });
    redirect(decision.destination);
  }

  return <>{children}</>;
}
