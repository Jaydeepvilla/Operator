"use client";

import * as React from "react";
import * as LabelPrimitive from "@radix-ui/react-label";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "./utils";

const labelVariants = cva(
  "text-body-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-60 select-none transition-colors duration-150"
);

export interface LabelProps
  extends React.ComponentPropsWithoutRef<typeof LabelPrimitive.Root>,
  VariantProps<typeof labelVariants> {
  error?: boolean;
  required?: boolean;
}

const Label = React.forwardRef<
  React.ElementRef<typeof LabelPrimitive.Root>,
  LabelProps
>(({ className, error, required, children, ...props }, ref) => {
  const renderContent = () => {
    if (typeof children === "string" && children.trim().endsWith("*")) {
      const textWithoutStar = children.trim().slice(0, -1).trimEnd();
      return (
        <>
          {textWithoutStar}
          <span className="text-rose-500 ml-1 font-bold" aria-hidden="true">*</span>
        </>
      );
    }
    return (
      <>
        {children}
        {required && <span className="text-rose-500 ml-1 font-bold" aria-hidden="true">*</span>}
      </>
    );
  };

  return (
    <LabelPrimitive.Root
      ref={ref}
      className={cn(
        labelVariants(),
        error && "text-rose-500",
        className
      )}
      {...props}
    >
      {renderContent()}
    </LabelPrimitive.Root>
  );
});
Label.displayName = LabelPrimitive.Root.displayName;

export { Label };
