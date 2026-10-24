"use client";

import * as React from"react";
import * as SelectPrimitive from"@radix-ui/react-select";
import { Check, ChevronDown, ChevronUp } from"lucide-react";
import { cn } from"./utils";

const Select = SelectPrimitive.Root;
const SelectGroup = SelectPrimitive.Group;
const SelectValue = SelectPrimitive.Value;

const SelectTrigger = React.forwardRef<
 React.ElementRef<typeof SelectPrimitive.Trigger>,
 React.ComponentPropsWithoutRef<typeof SelectPrimitive.Trigger>
>(({ className, children, ...props }, ref) => (
 <SelectPrimitive.Trigger
 ref={ref}
 className={cn(
   "flex h-9 w-full items-center justify-between radius-md border border-border-default bg-transparent px-space-3 py-space-2 text-body-sm text-foreground transition-all duration-200",
   "ring-offset-background placeholder:text-muted-foreground/70",
   "focus:outline-none focus:ring-2 focus:ring-[hsl(var(--ring)/0.25)] focus:border-primary",
   "hover:border-border-hover",
   "disabled:cursor-not-allowed disabled:opacity-50 disabled:bg-[hsl(var(--foreground)/0.04)]",
   "[&>span]:line-clamp-1 cursor-pointer",
   className
 )}
 {...props}
 >
 {children}
 <SelectPrimitive.Icon asChild>
 <ChevronDown className="h-4 w-4 text-muted-foreground transition-transform duration-200 data-[state=open]:rotate-180"/>
 </SelectPrimitive.Icon>
 </SelectPrimitive.Trigger>
));
SelectTrigger.displayName = SelectPrimitive.Trigger.displayName;

const SelectScrollUpButton = React.forwardRef<
 React.ElementRef<typeof SelectPrimitive.ScrollUpButton>,
 React.ComponentPropsWithoutRef<typeof SelectPrimitive.ScrollUpButton>
>(({ className, ...props }, ref) => (
 <SelectPrimitive.ScrollUpButton
 ref={ref}
 className={cn("flex cursor-default items-center justify-center py-space-1", className)}
 {...props}
 >
 <ChevronUp className="h-4 w-4 text-muted-foreground/50"/>
 </SelectPrimitive.ScrollUpButton>
));
SelectScrollUpButton.displayName = SelectPrimitive.ScrollUpButton.displayName;

const SelectScrollDownButton = React.forwardRef<
 React.ElementRef<typeof SelectPrimitive.ScrollDownButton>,
 React.ComponentPropsWithoutRef<typeof SelectPrimitive.ScrollDownButton>
>(({ className, ...props }, ref) => (
 <SelectPrimitive.ScrollDownButton
 ref={ref}
 className={cn("flex cursor-default items-center justify-center py-space-1", className)}
 {...props}
 >
 <ChevronDown className="h-4 w-4 text-muted-foreground/50"/>
 </SelectPrimitive.ScrollDownButton>
));
SelectScrollDownButton.displayName = SelectPrimitive.ScrollDownButton.displayName;

const SelectContent = React.forwardRef<
 React.ElementRef<typeof SelectPrimitive.Content>,
 React.ComponentPropsWithoutRef<typeof SelectPrimitive.Content>
>(({ className, children, position ="popper", sideOffset = 6, ...props }, ref) => (
 <SelectPrimitive.Portal>
 <SelectPrimitive.Content
 ref={ref}
 sideOffset={sideOffset}
 className={cn(
 "relative z-50 max-h-96 min-w-32 overflow-hidden radius-lg border border-border-default bg-popover text-popover-foreground shadow-lg",
 "data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95 data-[side=bottom]:slide-in-from-top-space-2 data-[side=left]:slide-in-from-right-space-2 data-[side=right]:slide-in-from-left-space-2 data-[side=top]:slide-in-from-bottom-space-2",
 position ==="popper"&&
 "data-[side=bottom]:translate-y-space-1 data-[side=left]:-translate-x-space-1 data-[side=right]:translate-x-space-1 data-[side=top]:-translate-y-space-1",
 className
 )}
 position={position}
 {...props}
 >
 <SelectScrollUpButton />
 <SelectPrimitive.Viewport
 className={cn(
 "p-space-1",
 position ==="popper"&&
 "h-[var(--radix-select-trigger-height)] w-full min-w-[var(--radix-select-trigger-width)]"
 )}
 >
 {children}
 </SelectPrimitive.Viewport>
 <SelectScrollDownButton />
 </SelectPrimitive.Content>
 </SelectPrimitive.Portal>
));
SelectContent.displayName = SelectPrimitive.Content.displayName;

const SelectItem = React.forwardRef<
 React.ElementRef<typeof SelectPrimitive.Item>,
 React.ComponentPropsWithoutRef<typeof SelectPrimitive.Item>
>(({ className, children, ...props }, ref) => (
 <SelectPrimitive.Item
 ref={ref}
 className={cn(
   "relative flex w-full cursor-pointer select-none items-center radius-md py-space-1.5 pl-space-8 pr-space-2 text-body-sm outline-none transition-colors duration-150",
   "hover:bg-[hsl(var(--foreground)/0.05)]",
   "focus:bg-accent focus:text-accent-foreground",
   "data-[state=checked]:text-primary data-[state=checked]:font-medium",
   "data-[disabled]:pointer-events-none data-[disabled]:opacity-50",
   className
 )}
 {...props}
 >
 <span className="absolute left-space-2 flex h-3.5 w-3.5 items-center justify-center">
 <SelectPrimitive.ItemIndicator>
 <Check className="h-4 w-4 text-primary"/>
 </SelectPrimitive.ItemIndicator>
 </span>
 <SelectPrimitive.ItemText>{children}</SelectPrimitive.ItemText>
 </SelectPrimitive.Item>
));
SelectItem.displayName = SelectPrimitive.Item.displayName;

export {
 Select,
 SelectGroup,
 SelectValue,
 SelectTrigger,
 SelectContent,
 SelectItem,
};
