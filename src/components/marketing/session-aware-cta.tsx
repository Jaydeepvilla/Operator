"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth/client";
import { Button } from "@/components/shared/button";
import { ArrowRight, LayoutDashboard } from "lucide-react";
import { cn } from "@/components/shared/utils";

interface SessionAwareCtaProps {
  signedInText?: string;
  signedOutText?: string;
  signedInHref?: string;
  signedOutHref?: string;
  variant?: "default" | "outline" | "secondary" | "ghost";
  size?: "sm" | "md" | "lg";
  className?: string;
  showIcon?: boolean;
}

export function SessionAwareCta({
  signedInText = "Go to Dashboard",
  signedOutText = "Get started today",
  signedInHref = "/dashboard",
  signedOutHref = "/sign-in",
  variant = "default",
  size = "lg",
  className,
  showIcon = true,
}: SessionAwareCtaProps) {
  const { user, isLoading } = useAuth();
  const router = useRouter();
  const [isClient, setIsClient] = React.useState(false);

  React.useEffect(() => {
    setIsClient(true);
  }, []);

  const isAuthenticated = isClient && !isLoading && Boolean(user);
  const isComplete = Boolean(user?.onboardingCompleted);
  const targetHref = isAuthenticated
    ? (signedInHref && signedInHref !== "/dashboard" ? signedInHref : (isComplete ? "/dashboard" : "/onboarding"))
    : signedOutHref;
  const label = isAuthenticated
    ? (signedInText && signedInText !== "Go to Dashboard" ? signedInText : (isComplete ? "Go to Dashboard" : "Continue setup"))
    : signedOutText;

  const handleClick = (e: React.MouseEvent<HTMLAnchorElement>) => {
    e.preventDefault();
    router.push(targetHref);
  };

  return (
    <Button
      asChild
      variant={variant}
      size={size}
      className={cn("cursor-pointer w-full sm:w-auto", className)}
    >
      <Link
        href={targetHref}
        onClick={handleClick}
        className="flex items-center justify-center gap-2"
      >
        <span>{label}</span>
        {showIcon && (
          isAuthenticated ? (
            <LayoutDashboard className="h-4 w-4 shrink-0" />
          ) : (
            <ArrowRight className="h-4 w-4 shrink-0" />
          )
        )}
      </Link>
    </Button>
  );
}


