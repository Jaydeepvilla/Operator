"use client";

import * as React from"react";
import * as TooltipPrimitive from"@radix-ui/react-tooltip";
import { cn } from"./utils";

const TooltipProvider = TooltipPrimitive.Provider;
const Tooltip = TooltipPrimitive.Root;
const TooltipTrigger = TooltipPrimitive.Trigger;

const TooltipContent = React.forwardRef<
 React.ElementRef<typeof TooltipPrimitive.Content>,
 React.ComponentPropsWithoutRef<typeof TooltipPrimitive.Content>
>(({ className, sideOffset = 6, ...props }, ref) => (
 <TooltipPrimitive.Portal>
 <TooltipPrimitive.Content
 ref={ref}
 sideOffset={sideOffset}
 className={cn(
 "z-50 overflow-hidden radius-md bg-[hsl(var(--foreground))] px-space-3 py-space-1 text-caption text-[hsl(var(--background))] shadow-md border border-border/40 animate-content-show select-none",
 "data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=closed]:zoom-out-95",
 className
 )}
 {...props}
 />
 </TooltipPrimitive.Portal>
));
TooltipContent.displayName = TooltipPrimitive.Content.displayName;

export { Tooltip, TooltipTrigger, TooltipContent, TooltipProvider };
