import * as React from"react";
import { cn } from"./utils";

const Card = React.forwardRef<
 HTMLDivElement,
 React.HTMLAttributes<HTMLDivElement> & { interactive?: boolean }
>(({ className, interactive, ...props }, ref) => (
  <div
  ref={ref}
  className={cn(
  "radius-lg border border-primary/[0.15] bg-card text-card-foreground transition-all duration-200 shadow-[0_0_12px_-3px_rgba(124,58,237,0.04)]",
  interactive && "cursor-pointer hover:border-primary/40 hover:shadow-md hover:bg-card/95 active:scale-[0.995]",
  !interactive && "hover:border-primary/30",
  className
  )}
 {...props}
 />
));
Card.displayName ="Card";

const CardHeader = React.forwardRef<
 HTMLDivElement,
 React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => (
 <div
 ref={ref}
 className={cn("flex flex-col space-y-space-1 p-space-6", className)}
 {...props}
 />
));
CardHeader.displayName ="CardHeader";

const CardTitle = React.forwardRef<
 HTMLParagraphElement,
 React.HTMLAttributes<HTMLHeadingElement>
>(({ className, ...props }, ref) => (
 <h3
 ref={ref}
 className={cn("font-medium leading-snug tracking-tight-md text-body-md text-foreground", className)}
 {...props}
 />
));
CardTitle.displayName ="CardTitle";

const CardDescription = React.forwardRef<
 HTMLParagraphElement,
 React.HTMLAttributes<HTMLParagraphElement>
>(({ className, ...props }, ref) => (
 <p
 ref={ref}
 className={cn("text-caption text-muted-foreground leading-relaxed", className)}
 {...props}
 />
));
CardDescription.displayName ="CardDescription";

const CardContent = React.forwardRef<
 HTMLDivElement,
 React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => (
 <div ref={ref} className={cn("p-space-6 pt-space-0", className)} {...props} />
));
CardContent.displayName ="CardContent";

const CardFooter = React.forwardRef<
 HTMLDivElement,
 React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => (
 <div
 ref={ref}
 className={cn("flex items-center p-space-6 pt-space-0", className)}
 {...props}
 />
));
CardFooter.displayName ="CardFooter";

export { Card, CardHeader, CardFooter, CardTitle, CardDescription, CardContent };
