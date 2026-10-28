"use client";

import * as React from "react";
import { cn } from "./utils";

export interface SwitchProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  checked: boolean;
  onCheckedChange?: (checked: boolean) => void;
  size?: "sm" | "md" | "lg";
}

export const Switch = React.forwardRef<HTMLButtonElement, SwitchProps>(
  (
    {
      checked,
      onCheckedChange,
      size = "md",
      disabled = false,
      className,
      onClick,
      onKeyDown,
      ...props
    },
    ref
  ) => {
    const handleClick = (e: React.MouseEvent<HTMLButtonElement>) => {
      if (disabled) return;
      onCheckedChange?.(!checked);
      onClick?.(e);
    };

    const handleKeyDown = (e: React.KeyboardEvent<HTMLButtonElement>) => {
      if (disabled) return;
      if (e.key === " " || e.key === "Enter") {
        e.preventDefault();
        onCheckedChange?.(!checked);
      }
      onKeyDown?.(e);
    };

    // Dimension configs
    const configs = {
      sm: {
        track: "h-5 w-9 p-0.5",
        thumb: "h-4 w-4",
        translate: "translate-x-4",
        translateOff: "translate-x-0",
      },
      md: {
        track: "h-6 w-11 p-0.5",
        thumb: "h-5 w-5",
        translate: "translate-x-5",
        translateOff: "translate-x-0",
      },
      lg: {
        track: "h-7 w-14 p-0.5",
        thumb: "h-6 w-6",
        translate: "translate-x-7",
        translateOff: "translate-x-0",
      },
    }[size];

    return (
      <button
        ref={ref}
        type="button"
        role="switch"
        aria-checked={checked}
        disabled={disabled}
        onClick={handleClick}
        onKeyDown={handleKeyDown}
        className={cn(
          "peer inline-flex shrink-0 cursor-pointer items-center rounded-full transition-colors duration-200 ease-in-out focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40 focus-visible:ring-offset-2 focus-visible:ring-offset-background select-none",
          configs.track,
          checked
            ? "bg-primary"
            : "bg-muted/80 dark:bg-neutral-800 border border-border/80",
          disabled && "cursor-not-allowed opacity-50",
          className
        )}
        {...props}
      >
        <span
          aria-hidden="true"
          className={cn(
            "pointer-events-none block rounded-full bg-white shadow-md ring-0 transition-transform duration-200 ease-in-out",
            configs.thumb,
            checked ? configs.translate : configs.translateOff
          )}
        />
      </button>
    );
  }
);

Switch.displayName = "Switch";

