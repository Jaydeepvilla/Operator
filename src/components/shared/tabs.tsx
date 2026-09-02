"use client";

import * as React from "react";
import * as TabsPrimitive from "@radix-ui/react-tabs";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "./utils";
import { m, AnimatePresence } from "framer-motion";
import { fade } from "@/components/motion";

export type TabsVariant = "default" | "pills" | "underline" | "segmented";
export type TabsSize = "sm" | "md" | "lg";
export type TabsOrientation = "horizontal" | "vertical";

interface TabsContextType {
 variant: TabsVariant;
 size: TabsSize;
 orientation: TabsOrientation;
 activeTab?: string;
}

const TabsContext = React.createContext<TabsContextType>({
 variant: "default",
 size: "md",
 orientation: "horizontal",
});

// ─── Root Component ───────────────────────────────────────────────────────────
export interface TabsProps extends React.ComponentPropsWithoutRef<typeof TabsPrimitive.Root> {
 variant?: TabsVariant;
 size?: TabsSize;
}

const Tabs = React.forwardRef<
 React.ElementRef<typeof TabsPrimitive.Root>,
 TabsProps
>(({ className, variant = "default", size = "md", orientation = "horizontal", value, defaultValue, onValueChange, ...props }, ref) => {
 const [internalValue, setInternalValue] = React.useState(value || defaultValue);

 const handleValueChange = React.useCallback((val: string) => {
 setInternalValue(val);
 onValueChange?.(val);
 }, [onValueChange]);

 const activeTab = value !== undefined ? value : internalValue;

 return (
 <TabsContext.Provider value={{ variant, size, orientation, activeTab }}>
 <TabsPrimitive.Root
 ref={ref}
 value={value}
 defaultValue={defaultValue}
 onValueChange={handleValueChange}
 orientation={orientation}
 className={cn(
 orientation === "vertical" ? "flex gap-space-6 w-full" : "w-full",
 className
 )}
 {...props}
 />
 </TabsContext.Provider>
 );
});
Tabs.displayName = TabsPrimitive.Root.displayName;

// ─── List Component ───────────────────────────────────────────────────────────
const listVariants = cva(
 "inline-flex items-center justify-start shrink-0 select-none",
 {
 variants: {
 variant: {
 default: "",
 pills: "bg-[hsl(var(--foreground)/0.04)] border-[hsl(var(--foreground)/0.06)]",
 underline: "border-[hsl(var(--foreground)/0.06)]",
 segmented: "bg-[hsl(var(--foreground)/0.04)] border-[hsl(var(--foreground)/0.06)] shadow-inner-sm",
 },
 orientation: {
 horizontal: "w-full flex-row overflow-x-auto",
 vertical: "flex-col overflow-y-auto overflow-x-hidden items-start",
 },
 size: {
 sm: "",
 md: "",
 lg: "",
 }
 },
 compoundVariants: [
 // default/underline borders
 { variant: "default", orientation: "horizontal", className: "border-b h-space-10 gap-space-5" },
 { variant: "default", orientation: "vertical", className: "border-r gap-space-2 pr-space-4" },
 { variant: "underline", orientation: "horizontal", className: "border-b h-space-10 gap-space-6" },
 { variant: "underline", orientation: "vertical", className: "border-r gap-space-2.5 pr-space-4" },
 // pills
 { variant: "pills", orientation: "horizontal", className: "radius-full p-space-0.75 gap-space-1" },
 { variant: "pills", orientation: "vertical", className: "radius-xl p-space-1.5 gap-space-1.5 w-full" },
 // segmented
 { variant: "segmented", orientation: "horizontal", className: "radius-lg p-space-0.75 gap-space-0.75 h-space-9.5" },
 { variant: "segmented", orientation: "vertical", className: "radius-lg p-space-1 gap-space-1 w-full" },
 ]
 }
);

const TabsList = React.forwardRef<
 React.ElementRef<typeof TabsPrimitive.List>,
 React.ComponentPropsWithoutRef<typeof TabsPrimitive.List>
>(({ className, ...props }, ref) => {
 const { variant, size, orientation } = React.useContext(TabsContext);
 return (
 <TabsPrimitive.List
 ref={ref}
 className={cn(listVariants({ variant, size, orientation }), className)}
 {...props}
 />
 );
});
TabsList.displayName = TabsPrimitive.List.displayName;

// ─── Trigger Component ────────────────────────────────────────────────────────
const triggerVariants = cva(
 [
 "inline-flex items-center relative justify-center whitespace-nowrap text-caption transition-all duration-fast ease-standard cursor-pointer select-none",
 "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/20 focus-visible:ring-offset-1",
 "disabled:pointer-events-none disabled:opacity-40",
 ].join(" "),
 {
 variants: {
 variant: {
 default: "text-muted-foreground/80 hover:text-foreground data-[state=active]:text-primary font-semibold border-transparent",
 pills: "border-transparent text-muted-foreground hover:bg-[hsl(var(--foreground)/0.04)] hover:text-foreground data-[state=active]:text-primary-foreground font-semibold radius-full",
 underline: "text-muted-foreground/85 hover:text-foreground data-[state=active]:text-primary data-[state=active]:font-semibold border-transparent",
 segmented: "border-none text-muted-foreground/80 hover:text-foreground data-[state=active]:text-foreground data-[state=active]:shadow-sm data-[state=active]:font-semibold radius-md",
 },
 orientation: {
 horizontal: "",
 vertical: "w-full justify-start text-left",
 },
 size: {
 sm: "text-xs px-space-3 h-space-7",
 md: "text-caption px-space-4.5 h-space-8.5",
 lg: "text-body-sm px-space-6 h-space-10",
 }
 },
 compoundVariants: [
 // Underline / default active borders
 { variant: "default", orientation: "horizontal", className: "border-b h-full pb-space-3 pt-space-2 translate-y-px" },
 { variant: "default", orientation: "vertical", className: "border-r py-space-2.5 px-space-4 w-full translate-x-px" },
 { variant: "underline", orientation: "horizontal", className: "border-b h-full pb-space-3 pt-space-2 translate-y-px" },
 { variant: "underline", orientation: "vertical", className: "border-r py-space-2.5 px-space-4 w-full translate-x-px" },
 // Segmented horizontal adjustments
 { variant: "segmented", size: "sm", className: "h-space-7 px-space-3" },
 { variant: "segmented", size: "md", className: "h-space-8 px-space-4" },
 { variant: "segmented", size: "lg", className: "h-space-9 px-space-5" },
 ]
 }
);

export interface TabsTriggerProps extends React.ComponentPropsWithoutRef<typeof TabsPrimitive.Trigger> {
 // Support custom status indicators, icons, or badges directly via children
}

const TabsTrigger = React.forwardRef<
 React.ElementRef<typeof TabsPrimitive.Trigger>,
 TabsTriggerProps
>(({ className, children, value, ...props }, ref) => {
 const { variant, size, orientation, activeTab } = React.useContext(TabsContext);
 const isActive = activeTab === value;

 return (
 <TabsPrimitive.Trigger
 ref={ref}
 value={value}
 className={cn(triggerVariants({ variant, size, orientation }), className)}
 {...props}
 >
 <span className="relative z-10 flex items-center gap-2">{children}</span>
 {isActive && (variant === "segmented" || variant === "pills") && (
 <m.div
 layoutId={`tab-indicator-${variant}`}
 className={cn(
 "absolute inset-0 z-0",
 variant === "segmented" ? "bg-background radius-md shadow-sm" : "bg-primary radius-full"
 )}
 initial={false}
 transition={{ type: "spring", stiffness: 500, damping: 30 }}
 />
 )}
 </TabsPrimitive.Trigger>
 );
});
TabsTrigger.displayName = TabsPrimitive.Trigger.displayName;

// ─── Content Component ────────────────────────────────────────────────────────
const TabsContent = React.forwardRef<
 React.ElementRef<typeof TabsPrimitive.Content>,
 React.ComponentPropsWithoutRef<typeof TabsPrimitive.Content>
>(({ className, children, value, ...props }, ref) => {
 const { orientation, activeTab } = React.useContext(TabsContext);
 return (
 <TabsPrimitive.Content
 ref={ref}
 value={value}
 asChild
 {...props}
 >
 <div
 className={cn(
 "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/30 focus-visible:ring-offset-2",
 orientation === "vertical" ? "flex-1 min-w-0" : "w-full mt-space-4",
 className
 )}
 >
 <AnimatePresence mode="wait">
 {activeTab === value && (
 <m.div
 key={value}
 {...fade}
 className="h-full w-full"
            >
              {children}
            </m.div>
          )}
        </AnimatePresence>
      </div>
    </TabsPrimitive.Content>
  );
});
TabsContent.displayName = TabsPrimitive.Content.displayName;

export { Tabs, TabsList, TabsTrigger, TabsContent };
