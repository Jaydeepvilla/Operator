import React from "react";
import { cn } from "@/components/shared/utils";

interface LogoProps {
  className?: string;
  iconClassName?: string;
  showText?: boolean;
}

export function LogoIcon({
  className,
  alt = "Operator logo",
}: {
  className?: string;
  alt?: string;
}) {
  return (
    <div
      className={cn(
        "relative flex h-7 w-7 items-center justify-center rounded-lg bg-gradient-to-br from-[#6366F1] via-[#7C3AED] to-[#8B5CF6] text-white shadow-md shadow-indigo-500/25 ring-1 ring-white/20 shrink-0 select-none",
        className
      )}
      aria-label={alt}
    >
      <svg
        viewBox="0 0 24 24"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className="h-4 w-4 drop-shadow-sm"
      >
        <path
          d="M12 3C12 7.97056 7.97056 12 3 12C7.97056 12 12 16.0294 12 21C12 16.0294 16.0294 12 21 12C16.0294 12 12 7.97056 12 3Z"
          fill="currentColor"
        />
        <circle cx="18" cy="6" r="1.5" fill="currentColor" opacity="0.9" />
        <circle cx="6" cy="18" r="1" fill="currentColor" opacity="0.75" />
      </svg>
    </div>
  );
}

export function Logo({ className, iconClassName, showText = true }: LogoProps) {
  return (
    <div className={cn("flex items-center gap-space-2.5", className)}>
      <LogoIcon className={iconClassName} />
      {showText && (
        <span className="text-base tracking-tight text-foreground font-bold font-sans">
          Operator <span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-400 to-purple-500">AI</span>
        </span>
      )}
    </div>
  );
}

