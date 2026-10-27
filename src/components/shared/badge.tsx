import * as React from "react"
import { cva, type VariantProps } from "class-variance-authority"

import { cn } from "@/components/shared/utils"

const badgeVariants = cva(
  "inline-flex items-center gap-space-1.5 rounded-full border px-space-2.5 py-space-0.5 text-xs font-medium transition-colors focus:outline-none focus:ring-2 focus:ring-[hsl(var(--ring)/0.3)] focus:ring-offset-2",
  {
    variants: {
      variant: {
        default:
          "border-transparent bg-primary text-primary-foreground hover:bg-primary/80",
        secondary:
          "border-transparent bg-secondary text-secondary-foreground hover:bg-secondary/80",
        destructive:
          "border-transparent bg-destructive text-destructive-foreground hover:bg-destructive/80",
        outline: "text-foreground border-border",
        /** SUCCESS — uses semantic state tokens; auto-adapts to light and dark */
        success:
          "border-[hsl(var(--state-success-border))] bg-[hsl(var(--state-success-bg))] text-[hsl(var(--state-success-text))] hover:opacity-85",
        /** WARNING — uses semantic state tokens */
        warning:
          "border-[hsl(var(--state-warning-border))] bg-[hsl(var(--state-warning-bg))] text-[hsl(var(--state-warning-text))] hover:opacity-85",
        /** INFO — uses semantic state tokens */
        info:
          "border-[hsl(var(--state-info-border))] bg-[hsl(var(--state-info-bg))] text-[hsl(var(--state-info-text))] hover:opacity-85",
        /** ERROR — uses semantic state tokens */
        error:
          "border-[hsl(var(--state-error-border))] bg-[hsl(var(--state-error-bg))] text-[hsl(var(--state-error-text))] hover:opacity-85",
        /** SOFT — muted surface. Use for neutral/inactive states. */
        soft:
          "border-transparent bg-muted text-muted-foreground hover:bg-muted/80",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  }
)

export interface BadgeProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof badgeVariants> {}

function Badge({ className, variant, ...props }: BadgeProps) {
  return (
    <div className={cn(badgeVariants({ variant }), className)} {...props} />
  )
}

export { Badge, badgeVariants }

