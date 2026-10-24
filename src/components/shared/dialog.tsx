"use client";

import * as React from"react";
import * as DialogPrimitive from"@radix-ui/react-dialog";
import { X } from"lucide-react";
import { cn } from"./utils";

const Dialog = DialogPrimitive.Root;
const DialogTrigger = DialogPrimitive.Trigger;
const DialogPortal = DialogPrimitive.Portal;
const DialogClose = DialogPrimitive.Close;

const DialogOverlay = React.forwardRef<
 React.ElementRef<typeof DialogPrimitive.Overlay>,
 React.ComponentPropsWithoutRef<typeof DialogPrimitive.Overlay>
>(({ className, ...props }, ref) => (
 <DialogPrimitive.Overlay
 ref={ref}
 className={cn(
   "fixed inset-space-0 z-50 bg-[hsl(var(--overlay))] backdrop-blur-sm data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0",
   className
 )}
 {...props}
 />
));
DialogOverlay.displayName = DialogPrimitive.Overlay.displayName;

const DialogContent = React.forwardRef<
 React.ElementRef<typeof DialogPrimitive.Content>,
 React.ComponentPropsWithoutRef<typeof DialogPrimitive.Content>
>(({ className, children, ...props }, ref) => (
 <DialogPortal>
 <DialogOverlay />
 <DialogPrimitive.Content
   ref={ref}
   className={cn(
     "fixed left-[50%] top-[50%] z-50 grid w-full max-w-lg translate-x-[-50%] translate-y-[-50%] gap-space-4 border border-border bg-background shadow-xl p-space-6 duration-200 data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95 data-[state=closed]:slide-out-to-left-space-1/2 data-[state=closed]:slide-out-to-top-[48%] data-[state=open]:slide-in-from-left-space-1/2 data-[state=open]:slide-in-from-top-[48%] radius-xl",
     className
   )}
   {...props}
 >
   {children}
   <DialogPrimitive.Close className="absolute right-space-4 top-space-4 radius-md p-space-1 text-muted-foreground transition-all duration-150 hover:text-foreground hover:bg-[hsl(var(--foreground)/0.06)] focus:outline-none focus-visible:ring-2 focus-visible:ring-[hsl(var(--ring)/0.3)] focus-visible:ring-offset-1 focus-visible:ring-offset-background disabled:pointer-events-none cursor-pointer active:scale-95">
   <X className="h-4 w-4"/>
   <span className="sr-only">Close</span>
   </DialogPrimitive.Close>
 </DialogPrimitive.Content>
 </DialogPortal>
));
DialogContent.displayName = DialogPrimitive.Content.displayName;

const DialogHeader = ({
 className,
 ...props
}: React.HTMLAttributes<HTMLDivElement>) => (
 <div
 className={cn(
 "flex flex-col space-y-space-2 text-center sm:text-left",
 className
 )}
 {...props}
 />
);
DialogHeader.displayName ="DialogHeader";

const DialogFooter = ({
 className,
 ...props
}: React.HTMLAttributes<HTMLDivElement>) => (
 <div
 className={cn(
 "flex flex-col-reverse sm:flex-row sm:justify-end gap-space-2 pt-space-2",
 className
 )}
 {...props}
 />
);
DialogFooter.displayName ="DialogFooter";

const DialogTitle = React.forwardRef<
 React.ElementRef<typeof DialogPrimitive.Title>,
 React.ComponentPropsWithoutRef<typeof DialogPrimitive.Title>
>(({ className, ...props }, ref) => (
 <DialogPrimitive.Title
 ref={ref}
 className={cn(
 "text-title-md font-semibold leading-none tracking-tight-md text-foreground",
 className
 )}
 {...props}
 />
));
DialogTitle.displayName = DialogPrimitive.Title.displayName;

const DialogDescription = React.forwardRef<
 React.ElementRef<typeof DialogPrimitive.Description>,
 React.ComponentPropsWithoutRef<typeof DialogPrimitive.Description>
>(({ className, ...props }, ref) => (
 <DialogPrimitive.Description
 ref={ref}
 className={cn("text-body-sm text-muted-foreground", className)}
 {...props}
 />
));
DialogDescription.displayName = DialogPrimitive.Description.displayName;

export {
 Dialog,
 DialogPortal,
 DialogOverlay,
 DialogClose,
 DialogTrigger,
 DialogContent,
 DialogHeader,
 DialogFooter,
 DialogTitle,
 DialogDescription,
};
