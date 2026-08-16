"use client";

import * as React from "react";
import Link from "next/link";
import { useAuth } from "@/lib/auth/client";
import { Button } from "@/components/shared/button";
import { ArrowRight, LayoutDashboard } from "lucide-react";
import { cn } from "@/components/shared/utils";

interface SessionAwareCtaProps {
  signedInText?: string;
  signedOutText?: string;
  signedOutHref?: string;
  variant?: "default" | "outline" | "secondary" | "ghost";
  size?: "sm" | "md" | "lg";
  className?: string;
  showIcon?: boolean;
}

export function SessionAwareCta({
  signedInText = "Go to Dashboard",
  signedOutText = "Get started today",
  signedOutHref = "/sign-up",
  variant = "default",
  size = "lg",
  className,
  showIcon = true,
}: SessionAwareCtaProps) {
  const { user, isLoading } = useAuth();

  if (isLoading) {
    return (
      <Button
        variant={variant}
        size={size}
        disabled
        className={cn("cursor-pointer w-full sm:w-auto opacity-80", className)}
      >
        <span className="inline-flex items-center gap-2">
          <span className="h-4 w-24 bg-foreground/20 rounded animate-pulse" />
        </span>
      </Button>
    );
  }

  if (user) {
    return (
      <Button asChild variant={variant} size={size} className={cn("cursor-pointer w-full sm:w-auto", className)}>
        <Link href="/dashboard" className="flex items-center gap-2">
          {signedInText}
          {showIcon && <LayoutDashboard className="h-4 w-4" />}
        </Link>
      </Button>
    );
  }

  return (
    <Button asChild variant={variant} size={size} className={cn("cursor-pointer w-full sm:w-auto", className)}>
      <Link href={signedOutHref} className="flex items-center gap-2">
        {signedOutText}
        {showIcon && <ArrowRight className="h-4 w-4" />}
      </Link>
    </Button>
  );
}
