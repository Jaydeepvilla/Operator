import * as React from "react";
import { cn } from "./utils";
import { m } from "framer-motion";

export interface InputProps extends React.ComponentProps<"input"> {
 error?: boolean;
 success?: boolean;
}

 const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ className, type, error, success, ...props }, ref) => {
    return (
      <m.input
        type={type}
        className={cn(
          "flex h-9 w-full radius-md border border-border-default bg-transparent px-space-3 py-space-1 text-body-sm text-foreground transition-all duration-200",
          "file:border-0 file:bg-transparent file:text-body-sm file:text-foreground",
          "placeholder:text-muted-foreground/70",
          "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[hsl(var(--ring)/0.25)] focus-visible:border-primary",
          // Disabled: use foreground opacity rather than dark: prefix
          "disabled:cursor-not-allowed disabled:opacity-50 disabled:bg-[hsl(var(--foreground)/0.04)]",
          // Read-only: same approach
          "read-only:bg-[hsl(var(--foreground)/0.04)] read-only:focus-visible:ring-0 read-only:focus-visible:border-[hsl(var(--foreground)/0.10)]",
          error
            ? "border-error-500 focus-visible:ring-[hsl(var(--state-error-text)/0.20)] focus-visible:border-error-500"
            : success
            ? "border-success-500 focus-visible:ring-[hsl(var(--state-success-text)/0.20)] focus-visible:border-success-500"
            : "hover:border-border-hover",
          className
        )}
        ref={ref as any}
        aria-invalid={error || undefined}
        animate={error ? { x: [-4, 4, -4, 4, 0] } : { x: 0 }}
        transition={error ? { type: "keyframes", duration: 0.4 } : { type: "spring", stiffness: 500, damping: 25 }}
        {...(props as any)}
      />
    );
  }
);
Input.displayName = "Input";

export { Input };
