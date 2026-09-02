"use client";

import * as React from"react";
import { useForm } from"react-hook-form";
import { zodResolver } from"@hookform/resolvers/zod";
import { 
 Plus, 
 Edit2, 
 Archive, 
 Trash2, 
 Clock, 
 DollarSign, 
 Loader2, 
 AlertTriangle,
 Briefcase,
 Layers,
 Check,
 Sliders,
 FileText
} from"lucide-react";
import { Button } from"@/components/shared/button";
import { Input } from"@/components/shared/input";
import { Label } from"@/components/shared/label";
import { 
 Dialog, 
 DialogContent, 
 DialogDescription, 
 DialogFooter, 
 DialogHeader, 
 DialogTitle 
} from"@/components/shared/dialog";
import { EmptyState } from"@/components/shared/empty-state";
import { 
 createServiceAction, 
 updateServiceAction, 
 archiveServiceAction, 
 deleteServiceAction 
} from"@/server/actions/services";
import { useToast } from "@/components/shared/toast";
import { formatUserErrorMessage } from "@/lib/errors";
import { z } from"zod";
import { cn } from"@/components/shared/utils";
import { NativeButton, NativeTextarea } from "@/components/shared/native";

const serviceFormSchema = z.object({
 name: z.string().min(2,"Service name must be at least 2 characters"),
 categoryName: z.string().min(2,"Category name must be at least 2 characters"),
 description: z.string().min(5,"Please write a short description (min 5 chars)"),
 duration: z.number().min(5,"Duration must be at least 5 minutes"),
 price: z.string().regex(/^\d+(\.\d{2})?$/,"Enter a valid price (e.g. 45.00)"),
 isActive: z.boolean(),
});

type ServiceFormInput = z.infer<typeof serviceFormSchema>;

interface Service {
 id: string;
 name: string;
 categoryId: string | null;
 description: string | null;
 duration: number;
 price: string;
 isActive: boolean;
 isArchived?: boolean;
}

interface Category {
 id: string;
 name: string;
}

interface ServicesManagerProps {
 initialServices: Service[];
 categories: Category[];
}

export function ServicesManager({ initialServices, categories }: ServicesManagerProps) {
 const [services, setServices] = React.useState<Service[]>(initialServices);
 const [isOpen, setIsOpen] = React.useState(false);
 const [editingService, setEditingService] = React.useState<Service | null>(null);
 const [isSubmitting, setIsSubmitting] = React.useState(false);
 const [actionError, setActionError] = React.useState<string | null>(null);
 const toast = useToast();

 const {
 register,
 handleSubmit,
 setValue,
 watch,
 reset,
 formState: { errors },
 } = useForm<ServiceFormInput>({
 resolver: zodResolver(serviceFormSchema),
 defaultValues: {
 name:"",
 categoryName:"",
 description:"",
 duration: 30,
 price:"0.00",
 isActive: true,
 },
 });

 const isActiveValue = watch("isActive");

 React.useEffect(() => {
 setServices(initialServices);
 }, [initialServices]);

 const handleOpenDialog = (service?: Service) => {
 if (service) {
 setEditingService(service);
 const catName = categories.find((c) => c.id === service.categoryId)?.name ||"";
 reset({
 name: service.name,
 categoryName: catName,
 description: service.description ||"",
 duration: service.duration,
 price: service.price,
 isActive: service.isActive,
 });
 } else {
 setEditingService(null);
 reset({
 name:"",
 categoryName: categories[0]?.name ||"",
 description:"",
 duration: 30,
 price:"0.00",
 isActive: true,
 });
 }
 setActionError(null);
 setIsOpen(true);
 };

 const onSubmit = async (data: ServiceFormInput) => {
 setIsSubmitting(true);
 setActionError(null);

 try {
 let res;
 if (editingService) {
 res = await updateServiceAction(editingService.id, data);
 } else {
 res = await createServiceAction(data);
 }

 if (res.success) {
 setIsOpen(false);
 reset();
 toast.success(editingService ? "Service Updated" : "Service Created", "Service catalog updated successfully.");
 } else {
 const errorMsg = formatUserErrorMessage(res.error, "Failed to save service");
 setActionError(errorMsg);
 toast.error("Failed to save service", errorMsg);
 }
 } catch (err: any) {
 const errorMsg = formatUserErrorMessage(err, "An unexpected error occurred");
 setActionError(errorMsg);
 toast.error("Failed to save service", errorMsg);
 } finally {
 setIsSubmitting(false);
 }
 };

 const handleArchive = async (id: string) => {
 if (confirm("Are you sure you want to archive this service?")) {
 const res = await archiveServiceAction(id);
 if (!res.success) {
 toast.error("Failed to archive service", formatUserErrorMessage(res.error));
 } else {
 toast.success("Service Archived", "The service has been archived.");
 }
 }
 };

 const handleDelete = async (id: string) => {
 if (confirm("Are you sure you want to permanently delete this service?")) {
 const res = await deleteServiceAction(id);
 if (!res.success) {
 toast.error("Failed to delete service", formatUserErrorMessage(res.error));
 } else {
 toast.success("Service Deleted", "The service has been permanently removed.");
 }
 }
 };

 return (
 <div className="space-y-space-4 w-full">
 {/* Premium Header/Action Bar */}
 <div className="shrink-0 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-space-3 bg-card border border-[hsl(var(--foreground)/0.06)] p-space-3.5 rounded-xl soft-">
 <div className="flex items-start gap-space-2.5">
 <div className="h-7 w-7 rounded-lg bg-primary/10 flex items-center justify-center shrink-0 mt-space-0.5">
 <Sliders className="h-3.5 w-3.5 text-primary"/>
 </div>
 <div>
 <p className="text-caption font-semibold text-foreground">Services Directory</p>
 <p className="text-caption text-muted-foreground/65 mt-space-0.5 leading-relaxed">
 Configure services available for Operator appointment scheduling.
 </p>
 </div>
 </div>
 <Button onClick={() => handleOpenDialog()} className="h-8.5 text-caption font-semibold text-white cursor-pointer gap-space-1.5 shrink-0 self-end sm:self-auto rounded-lg px-space-4">
 <Plus className="h-3.5 w-3.5"/> Add Service
 </Button>
 </div>

 {services.length === 0 ? (
 <EmptyState
 title="No services configured"
 description="Operator needs to know what services you offer to schedule appointments."
 icon={Clock}
 actionText="Configure Service"
 onAction={() => handleOpenDialog()}
 />
 ) : (
 <div className="grid gap-space-4 sm:grid-cols-2 lg:grid-cols-3 pb-space-6">
 {services.map((service) => {
 const catName = categories.find((c) => c.id === service.categoryId)?.name ||"General";
 return (
 <div 
 key={service.id} 
 className={cn(
 "bg-card border border-[hsl(var(--foreground)/0.06)] radius-xl soft- p-space-5 flex flex-col justify-between transition-all duration-300 hover:scale-[1.01] hover:border-[hsl(var(--primary)/0.2)]",
 !service.isActive &&"opacity-80"
 )}
 >
 <div>
 {/* Card Badge and Status Row */}
 <div className="flex justify-between items-center gap-space-2">
              <span className="inline-flex text-caption font-semibold text-[hsl(var(--primary))] bg-[hsl(var(--primary)/0.08)] border border-[hsl(var(--primary)/0.15)] px-space-2.5 py-space-0.5 rounded-full uppercase tracking-wider">
                {catName}
              </span>
 <span
 className={cn(
 "inline-flex text-caption font-normal border px-space-2 py-space-0.5 rounded-full uppercase tracking-wider",
 service.isActive
 ?"bg-[hsl(var(--state-success-bg))] border-[hsl(var(--state-success-border))] text-[hsl(var(--state-success-text))]"
 :"bg-[hsl(var(--foreground)/0.04)] border-[hsl(var(--foreground)/0.08)] text-muted-foreground/80"
 )}
 >
 {service.isActive ?"Active":"Disabled"}
 </span>
 </div>

 {/* Title */}
 <h3 className="text-body-sm font-semibold mt-space-3 text-foreground leading-tight">
 {service.name}
 </h3>

 {/* Description */}
 <p className="text-caption text-muted-foreground/85 mt-space-2 line-clamp-3 leading-relaxed min-h-12">
 {service.description ||"No description provided."}
 </p>
 </div>

 <div className="mt-space-4 space-y-space-2.5">
 {/* Metrics Box */}
 <div className="grid grid-cols-2 gap-space-2 bg-[hsl(var(--foreground)/0.015)] border border-[hsl(var(--foreground)/0.04)] p-space-2 rounded-lg text-caption">
 <div className="flex items-center gap-space-1.5 text-muted-foreground/75">
 <Clock className="h-3.5 w-3.5 text-muted-foreground/50 shrink-0"/>
 <span>{service.duration} mins</span>
 </div>
 <div className="flex items-center gap-space-1 text-foreground font-semibold justify-end">
 <DollarSign className="h-3.5 w-3.5 text-muted-foreground/60 shrink-0"/>
 <span>{service.price}</span>
 </div>
 </div>

 {/* Action Toolbar */}
 <div className="pt-space-2 border-t border-[hsl(var(--foreground)/0.05)] flex justify-end">
            <div className="flex items-center gap-space-2 shrink-0">
              <NativeButton 
                onClick={() => handleOpenDialog(service)} 
                className="h-9 w-9 flex items-center justify-center text-muted-foreground hover:text-primary bg-[hsl(var(--foreground)/0.02)] hover:bg-[hsl(var(--foreground)/0.04)] border border-[hsl(var(--foreground)/0.08)] hover:border-[hsl(var(--primary)/0.25)] rounded-xl transition-all cursor-pointer p-space-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/20 focus-visible:ring-offset-1"
                title="Edit service"
              >
                <Edit2 className="h-4 w-4"/>
              </NativeButton>
              <NativeButton 
                onClick={() => handleArchive(service.id)} 
                className="h-9 w-9 flex items-center justify-center text-muted-foreground hover:text-primary bg-[hsl(var(--foreground)/0.02)] hover:bg-[hsl(var(--foreground)/0.04)] border border-[hsl(var(--foreground)/0.08)] hover:border-[hsl(var(--primary)/0.25)] rounded-xl transition-all cursor-pointer p-space-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/20 focus-visible:ring-offset-1"
                title="Archive service"
              >
                <Archive className="h-4 w-4"/>
              </NativeButton>
              <NativeButton 
                onClick={() => handleDelete(service.id)} 
                className="h-9 w-9 flex items-center justify-center text-rose-500 hover:text-rose-600 bg-rose-500/5 hover:bg-rose-500/10 border border-rose-500/20 hover:border-rose-500/40 rounded-xl transition-all cursor-pointer p-space-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-rose-500/20 focus-visible:ring-offset-1"
                title="Delete service"
              >
                <Trash2 className="h-4 w-4"/>
              </NativeButton>
            </div>
 </div>
 </div>
 </div>
 );
 })}
 </div>
 )}

 {/* Configuration Dialog */}
 <Dialog open={isOpen} onOpenChange={setIsOpen}>
 <DialogContent className="max-w-md bg-card border border-[hsl(var(--foreground)/0.08)] p-space-0 overflow-hidden">
 <div className="px-space-5 pt-space-5 pb-space-4 border-b border-[hsl(var(--foreground)/0.05)]">
 <div className="flex items-center gap-space-2.5">
 <div className="h-8 w-8 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
 <Briefcase className="h-4 w-4 text-primary"/>
 </div>
 <div>
 <DialogTitle className="text-body-sm font-semibold text-foreground">
 {editingService ?"Edit Service Detail":"Add Service Detail"}
 </DialogTitle>
 <DialogDescription className="text-caption text-muted-foreground/55 mt-space-0.5">
 Configure calendar parameters for customer booking appointments.
 </DialogDescription>
 </div>
 </div>
 </div>

 <form onSubmit={handleSubmit(onSubmit)} className="px-space-5 pb-space-5 pt-space-4 space-y-space-4">
 {actionError && (
 <div className="p-space-3 rounded-lg bg-rose-500/8 border border-rose-500/12 text-caption text-rose-600 font-medium">
 {actionError}
 </div>
 )}

 <div className="space-y-space-1.5">
 <Label htmlFor="service_name"className="text-caption uppercase tracking-wider font-semibold text-muted-foreground/55">Service Name</Label>
 <div className="relative">
 <Briefcase className="absolute left-space-3 top-space-3 h-3.5 w-3.5 text-muted-foreground/50 z-10"/>
 <Input 
 id="service_name"
 placeholder="e.g. Regular Checkup"
 {...register("name")} 
 className="h-9.5 text-caption bg-background border-[hsl(var(--foreground)/0.08)] focus-visible:ring-primary/20 pl-space-9"
 />
 </div>
 {errors.name && <p className="text-caption text-rose-500 font-semibold">{errors.name.message}</p>}
 </div>

 <div className="space-y-space-1.5">
 <Label htmlFor="service_category"className="text-caption uppercase tracking-wider font-semibold text-muted-foreground/55">Category</Label>
 <div className="relative">
 <Layers className="absolute left-space-3 top-space-3 h-3.5 w-3.5 text-muted-foreground/50 z-10"/>
 <Input 
 id="service_category"
 placeholder="e.g. Restorative"
 {...register("categoryName")} 
 className="h-9.5 text-caption bg-background border-[hsl(var(--foreground)/0.08)] focus-visible:ring-primary/20 pl-space-9"
 />
 </div>
 {errors.categoryName && <p className="text-caption text-rose-500 font-semibold">{errors.categoryName.message}</p>}
 </div>

 <div className="space-y-space-1.5">
 <Label htmlFor="service_desc"className="text-caption uppercase tracking-wider font-semibold text-muted-foreground/55">Description</Label>
 <div className="relative">
 <FileText className="absolute left-space-3 top-space-3 h-3.5 w-3.5 text-muted-foreground/50 z-10 pointer-events-none"/>
 <NativeTextarea
 id="service_desc"
 rows={3}
 placeholder="Briefly describe what this service involves..."
 className="w-full radius-md border border-[hsl(var(--foreground)/0.08)] bg-background p-space-3 pl-space-9 text-caption placeholder:text-muted-foreground/50 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-primary/20 text-foreground resize-none leading-relaxed min-h-24"
 {...register("description")}
 />
 </div>
 {errors.description && <p className="text-caption text-rose-500 font-semibold">{errors.description.message}</p>}
 </div>

 <div className="grid grid-cols-2 gap-space-4">
 <div className="space-y-space-1.5">
 <Label htmlFor="service_dur"className="text-caption uppercase tracking-wider font-semibold text-muted-foreground/55">Duration (Mins)</Label>
 <div className="relative">
 <Clock className="absolute left-space-3 top-space-3 h-3.5 w-3.5 text-muted-foreground/50 z-10"/>
 <Input 
 id="service_dur"
 type="number"
 placeholder="30"
 {...register("duration", { valueAsNumber: true })} 
 className="h-9.5 text-caption bg-background border-[hsl(var(--foreground)/0.08)] focus-visible:ring-primary/20 pl-space-9"
 />
 </div>
 {errors.duration && <p className="text-caption text-rose-500 font-semibold">{errors.duration.message}</p>}
 </div>

 <div className="space-y-space-1.5">
 <Label htmlFor="service_price"className="text-caption uppercase tracking-wider font-semibold text-muted-foreground/55">Price ($)</Label>
 <div className="relative">
 <DollarSign className="absolute left-space-3 top-space-3 h-3.5 w-3.5 text-muted-foreground/50 z-10"/>
 <Input 
 id="service_price"
 placeholder="49.99"
 {...register("price")} 
 className="h-9.5 text-caption bg-background border-[hsl(var(--foreground)/0.08)] focus-visible:ring-primary/20 pl-space-9"
 />
 </div>
 {errors.price && <p className="text-caption text-rose-500 font-semibold">{errors.price.message}</p>}
 </div>
 </div>

 {/* Active Toggle Switch */}
 {editingService && (
 <div className="flex items-center justify-between p-space-3 bg-[hsl(var(--foreground)/0.015)] border border-[hsl(var(--foreground)/0.05)] rounded-xl">
 <div className="flex items-center gap-space-2">
 <Check className="h-3.5 w-3.5 text-emerald-500/70"/>
 <div>
 <p className="text-caption font-semibold text-foreground">Active Status</p>
 <p className="text-caption text-muted-foreground/55 mt-space-0.5">Available for customer calendar booking</p>
 </div>
 </div>
            <NativeButton
              type="button"
              role="switch"
              aria-checked={isActiveValue}
              onClick={() => setValue("isActive", !isActiveValue)}
              className={cn(
                "relative inline-flex h-5.5 w-9.5 shrink-0 cursor-pointer items-center rounded-full transition-colors duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/20 focus-visible:ring-offset-1 border border-transparent",
                isActiveValue ? "bg-[hsl(var(--primary))] border-[hsl(var(--primary))]" : "bg-[hsl(var(--foreground)/0.12)]"
              )}
            >
              <span className={cn(
                "pointer-events-none block h-4 w-4 rounded-full bg-background transition-transform duration-200 shadow-sm",
                isActiveValue ? "translate-x-space-4" : "translate-x-space-0.5"
              )} />
            </NativeButton>
 </div>
 )}

 <DialogFooter className="pt-space-2 border-t border-[hsl(var(--foreground)/0.05)]">
 <Button type="button"variant="outline"onClick={() => setIsOpen(false)} disabled={isSubmitting} className="h-9 text-caption font-semibold px-space-4 cursor-pointer rounded-lg">
 Cancel
 </Button>
 <Button type="submit"disabled={isSubmitting} className="h-9 text-caption font-semibold px-space-5 text-white cursor-pointer rounded-lg">
 {isSubmitting ? (
 <>
 <Loader2 className="mr-space-1.5 h-3.5 w-3.5 animate-spin"/> Saving...
 </>
 ) : (
 "Save Service"
 )}
 </Button>
 </DialogFooter>
 </form>
 </DialogContent>
 </Dialog>
 </div>
 );
}
