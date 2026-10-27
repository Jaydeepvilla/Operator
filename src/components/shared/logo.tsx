import React from "react";
import Image from "next/image";
import Link from "next/link";
import { cn } from "@/components/shared/utils";

interface LogoProps {
  className?: string;
  iconClassName?: string;
  showText?: boolean;
  href?: string;
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

export function Logo({ className, iconClassName, showText = true, href }: LogoProps) {
  const content = (
    <div className={cn("flex items-center gap-space-2.5 transition-opacity hover:opacity-90 cursor-pointer", className)}>
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

  if (href) {
    return (
      <Link href={href} className="inline-flex items-center shrink-0">
        {content}
      </Link>
    );
  }

  return content;
}
