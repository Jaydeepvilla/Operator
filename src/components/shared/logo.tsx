import React from "react";
import Image from "next/image";
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
        "relative flex h-8 w-8 items-center justify-center rounded-xl shrink-0 select-none overflow-hidden",
        className
      )}
      aria-label={alt}
    >
      <Image
        src="/logo.png"
        alt={alt}
        width={64}
        height={64}
        priority
        unoptimized
        className="w-full h-full object-contain drop-shadow-md"
      />
    </div>
  );
}

export function Logo({ className, iconClassName, showText = true }: LogoProps) {
  return (
    <div className={cn("flex items-center gap-space-2.5", className)}>
      <LogoIcon className={iconClassName} />
      {showText && (
        <span className="text-base tracking-tight text-foreground font-bold font-sans">
          Operator{" "}
          <span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-500 to-purple-600">
            AI
          </span>
        </span>
      )}
    </div>
  );
}
