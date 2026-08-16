"use client";

import * as React from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { 
 Plus, 
 Search, 
 ArrowUpDown, 
 Trash2, 
 Check, 
 Loader2, 
 HelpCircle, 
 Edit2, 
 Layers,
 FileText,
 ShieldAlert
} from "lucide-react";
import { Button } from "@/components/shared/button";
import { Input } from "@/components/shared/input";
import { Label } from "@/components/shared/label";
import { 
 Select, 
 SelectContent, 
 SelectItem, 
 SelectTrigger, 
 SelectValue 
} from "@/components/shared/select";
import { 
 Dialog, 
 DialogContent, 
 DialogDescription, 
 DialogFooter, 
 DialogHeader, 
 DialogTitle 
} from "@/components/shared/dialog";
import { EmptyState } from "@/components/shared/empty-state";
import { 
 createFaqAction, 
 updateFaqAction, 
 deleteFaqAction, 
 bulkDeleteFaqsAction, 
 bulkToggleActiveFaqsAction 
} from "@/server/actions/faq";
import { z } from "zod";
import { cn } from "@/components/shared/utils";
import { NativeTable, NativeButton, NativeTextarea } from "@/components/shared/native";
import { ScrollArea } from "@/components/ui/scroll-area";

const faqFormSchema = z.object({
 question: z.string().min(8, "Question must be at least 8 characters"),
 answer: z.string().min(5, "Answer must be at least 5 characters"),
 category: z.string().min(2, "Category must be at least 2 characters"),
 isActive: z.boolean(),
});

type FaqFormInput = z.infer<typeof faqFormSchema>;

interface FaqItem {
 id: string;
 question: string;
 answer: string;
 category: string;
 isActive: boolean;
 order: number;
}

interface FaqBuilderProps {
 initialFaqs: FaqItem[];
}

export function FaqBuilder({ initialFaqs }: FaqBuilderProps) {
 const [faqs, setFaqs] = React.useState<FaqItem[]>(initialFaqs);
 const [searchQuery, setSearchQuery] = React.useState("");
 const [sortBy, setSortBy] = React.useState<"question" | "category" | "status">("question");
 const [selectedIds, setSelectedIds] = React.useState<string[]>([]);
 
 const [isOpen, setIsOpen] = React.useState(false);
 const [editingFaq, setEditingFaq] = React.useState<FaqItem | null>(null);
 const [isSubmitting, setIsSubmitting] = React.useState(false);
 const [actionError, setActionError] = React.useState<string | null>(null);

 const {
 register,
 handleSubmit,
 setValue,
 watch,
 reset,
 formState: { errors },
 } = useForm<FaqFormInput>({
 resolver: zodResolver(faqFormSchema),
 defaultValues: {
 question: "",
 answer: "",
 category: "General",
 isActive: true,
 },
 });

 const isActiveValue = watch("isActive");

 React.useEffect(() => {
 setFaqs(initialFaqs);
 }, [initialFaqs]);

 const handleOpenDialog = (faq?: FaqItem) => {
 if (faq) {
 setEditingFaq(faq);
 reset({
 question: faq.question,
 answer: faq.answer,
 category: faq.category,
 isActive: faq.isActive,
 });
 } else {
 setEditingFaq(null);
 reset({
 question: "",
 answer: "",
 category: "General",
 isActive: true,
 });
 }
 setActionError(null);
 setIsOpen(true);
 };

 const onSubmit = async (data: FaqFormInput) => {
 setIsSubmitting(true);
 setActionError(null);

 try {
 let res;
 if (editingFaq) {
 res = await updateFaqAction(editingFaq.id, data);
 } else {
 res = await createFaqAction(data);
 }

 if (res.success) {
 setIsOpen(false);
 reset();
 } else {
 setActionError(res.error || "Failed to save FAQ");
 }
 } catch (err: any) {
 setActionError(err?.message || "An unexpected error occurred");
 } finally {
 setIsSubmitting(false);
 }
 };

 const handleDelete = async (id: string) => {
 if (confirm("Are you sure you want to delete this FAQ item?")) {
 const res = await deleteFaqAction(id);
 if (!res.success) {
 alert(res.error || "Failed to delete FAQ");
 }
 }
 };

 // Bulk actions
 const toggleSelect = (id: string) => {
 setSelectedIds((prev) =>
 prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
 );
 };

 const toggleSelectAll = () => {
 if (selectedIds.length === filteredFaqs.length) {
 setSelectedIds([]);
 } else {
 setSelectedIds(filteredFaqs.map((f) => f.id));
 }
 };

 const handleBulkDelete = async () => {
 if (confirm(`Are you sure you want to delete the ${selectedIds.length} selected FAQs?`)) {
 const res = await bulkDeleteFaqsAction(selectedIds);
 if (res.success) {
 setSelectedIds([]);
 } else {
 alert(res.error || "Failed to delete FAQs");
 }
 }
 };

 const handleBulkStatus = async (isActive: boolean) => {
 const res = await bulkToggleActiveFaqsAction(selectedIds, isActive);
 if (res.success) {
 setSelectedIds([]);
 } else {
 alert(res.error || "Failed to update FAQ states");
 }
 };

 // Filter & Sort
 const filteredFaqs = faqs
 .filter((faq) => {
 const q = searchQuery.toLowerCase();
 return (
 faq.question.toLowerCase().includes(q) ||
 faq.answer.toLowerCase().includes(q) ||
 faq.category.toLowerCase().includes(q)
 );
 })
 .sort((a, b) => {
 if (sortBy === "question") return a.question.localeCompare(b.question);
 if (sortBy === "category") return a.category.localeCompare(b.category);
 if (sortBy === "status") return (a.isActive === b.isActive ? 0 : a.isActive ? -1 : 1);
 return 0;
 });

 return (
 <div className="space-y-space-4 flex-1 min-h-0 flex flex-col w-full max-w-none">
 {/* Search and Sort controls */}
 <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-space-3 bg-card border border-[hsl(var(--foreground)/0.06)] p-space-3 rounded-xl soft- shrink-0">
 <div className="relative flex-1 max-w-sm">
 <Search className="absolute left-space-3 top-space-3 h-3.5 w-3.5 text-muted-foreground/50 z-10 pointer-events-none" />
 <Input
 placeholder="Search FAQs..."
 value={searchQuery}
 onChange={(e) => setSearchQuery(e.target.value)}
 className="h-9.5 text-caption bg-background border-[hsl(var(--foreground)/0.08)] focus-visible:ring-primary/20 pl-space-9 w-full"
 />
 </div>

 <div className="flex items-center gap-space-2.5 shrink-0 self-end sm:self-auto justify-end">
 {/* Custom Select Sort Dropdown */}
 <div className="relative">
 <ArrowUpDown className="absolute left-space-3 top-space-3 h-3.5 w-3.5 text-muted-foreground/50 z-10 pointer-events-none" />
 <Select value={sortBy} onValueChange={(val: any) => setSortBy(val)}>
 <SelectTrigger className="h-9.5 text-caption bg-background border-[hsl(var(--foreground)/0.08)] focus-visible:ring-primary/20 pl-space-9 w-32">
 <SelectValue placeholder="Sort By" />
 </SelectTrigger>
 <SelectContent>
 <SelectItem value="question">Question</SelectItem>
 <SelectItem value="category">Category</SelectItem>
 <SelectItem value="status">Status</SelectItem>
 </SelectContent>
 </Select>
 </div>

 <Button onClick={() => handleOpenDialog()} className="h-8.5 text-caption font-semibold cursor-pointer gap-space-1.5 rounded-lg px-space-4">
 <Plus className="h-3.5 w-3.5" /> Add FAQ
 </Button>
 </div>
 </div>

 {/* Bulk actions bar */}
 {selectedIds.length > 0 && (
 <div className="flex items-center justify-between p-space-3 rounded-xl border border-primary/15 bg-primary/5 text-caption animate-fade-in soft- shrink-0">
 <div className="flex items-center gap-space-2">
 <ShieldAlert className="h-4 w-4 text-primary" />
 <span className="text-muted-foreground font-semibold uppercase tracking-wider text-caption bg-primary/10 border border-primary/15 rounded-md px-space-1.5 py-space-0.5">
 {selectedIds.length} Selected
 </span>
 </div>
 <div className="flex items-center gap-space-2">
 <Button onClick={() => handleBulkStatus(true)} variant="outline" className="h-8 text-caption font-semibold px-space-3 cursor-pointer rounded-lg bg-background hover:bg-[hsl(var(--foreground)/0.03)] border-[hsl(var(--foreground)/0.08)]">
 Make Active
 </Button>
 <Button onClick={() => handleBulkStatus(false)} variant="outline" className="h-8 text-caption font-semibold px-space-3 cursor-pointer rounded-lg bg-background hover:bg-[hsl(var(--foreground)/0.03)] border-[hsl(var(--foreground)/0.08)]">
 Make Inactive
 </Button>
 <Button onClick={handleBulkDelete} variant="destructive" className="h-8 text-caption font-semibold px-space-3.5 cursor-pointer rounded-lg gap-space-1">
 <Trash2 className="h-3.5 w-3.5 text-white" /> Bulk Delete
 </Button>
 </div>
 </div>
 )}

 {/* FAQs list table */}
 {filteredFaqs.length === 0 ? (
 <div className="flex-1 min-h-0 flex flex-col justify-center items-center border border-[hsl(var(--foreground)/0.06)] radius-xl bg-card">
 <EmptyState
 title="No FAQ items configured"
 description="Operator needs FAQ items to answer customer questions accurately."
 icon={HelpCircle}
 actionText="Add FAQ"
 onAction={() => handleOpenDialog()}
 />
 </div>
 ) : (
 <div className="bg-card border border-[hsl(var(--foreground)/0.06)] radius-xl overflow-hidden soft- flex-1 min-h-0 flex flex-col">
 <ScrollArea className="flex-1" horizontal={false} vertical={filteredFaqs.length > 4}>
 <NativeTable className="w-full text-left border-collapse">
 <thead>
 <tr className="border-b border-[hsl(var(--foreground)/0.06)] bg-[hsl(var(--foreground)/0.005)] text-caption uppercase font-semibold tracking-wider text-muted-foreground/60">
 <th className="py-space-3 px-space-4 w-12 text-center">
 <Input
 type="checkbox"
 checked={selectedIds.length === filteredFaqs.length && filteredFaqs.length > 0}
 onChange={toggleSelectAll}
 className="h-3.5 w-3.5 rounded border-[hsl(var(--foreground)/0.15)] bg-background text-primary focus:ring-primary/20 accent-primary cursor-pointer"
 />
 </th>
 <th className="py-space-3 px-space-4">FAQ Details</th>
 <th className="py-space-3 px-space-4 w-32">Category</th>
 <th className="py-space-3 px-space-4 w-28 text-center">Status</th>
 <th className="py-space-3 px-space-4 w-28 text-right">Actions</th>
 </tr>
 </thead>
 <tbody className="divide-y divide-[hsl(var(--foreground)/0.04)]">
 {filteredFaqs.map((faq) => (
 <tr key={faq.id} className="hover:bg-[hsl(var(--foreground)/0.005)] transition-colors duration-200">
 <td className="py-space-4 px-space-4 text-center align-middle">
 <Input
 type="checkbox"
 checked={selectedIds.includes(faq.id)}
 onChange={() => toggleSelect(faq.id)}
 className="h-3.5 w-3.5 rounded border-[hsl(var(--foreground)/0.15)] bg-background text-primary focus:ring-primary/20 accent-primary cursor-pointer"
 />
 </td>
 <td className="py-space-4 px-space-4 max-w-md align-middle">
 <span className="text-body-sm font-semibold text-foreground block leading-snug">
 {faq.question}
 </span>
 <span className="text-caption text-muted-foreground/80 leading-relaxed mt-space-1 block line-clamp-2">
 {faq.answer}
 </span>
 </td>
 <td className="py-space-4 px-space-4 align-middle">
 <span className="inline-flex text-caption font-semibold text-[hsl(var(--primary))] bg-[hsl(var(--primary)/0.08)] border border-[hsl(var(--primary)/0.15)] px-space-2.5 py-space-0.5 rounded-full uppercase tracking-wider">
 {faq.category}
 </span>
 </td>
 <td className="py-space-4 px-space-4 text-center align-middle">
 <span
 className={cn(
 "inline-flex text-caption font-normal border px-space-2 py-space-0.5 rounded-full uppercase tracking-wider",
 faq.isActive
 ? "bg-emerald-500/8 border-emerald-500/15 text-emerald-500"
 : "bg-[hsl(var(--foreground)/0.04)] border-[hsl(var(--foreground)/0.08)] text-muted-foreground/80"
 )}
 >
 {faq.isActive ? "Active" : "Disabled"}
 </span>
 </td>
 <td className="py-space-4 px-space-4 text-right align-middle">
 <div className="flex items-center justify-end gap-space-2 shrink-0 ml-auto">
 <NativeButton 
 onClick={() => handleOpenDialog(faq)} 
 className="h-9 w-9 flex items-center justify-center text-muted-foreground hover:text-primary bg-[hsl(var(--foreground)/0.02)] hover:bg-[hsl(var(--foreground)/0.04)] border border-[hsl(var(--foreground)/0.08)] hover:border-[hsl(var(--primary)/0.25)] rounded-xl transition-all cursor-pointer p-space-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/20 focus-visible:ring-offset-1"
 title="Edit FAQ"
 >
 <Edit2 className="h-4 w-4" />
 </NativeButton>
 <NativeButton 
 onClick={() => handleDelete(faq.id)} 
 className="h-9 w-9 flex items-center justify-center text-rose-500 hover:text-rose-600 bg-rose-500/5 hover:bg-rose-500/10 border border-rose-500/20 hover:border-rose-500/40 rounded-xl transition-all cursor-pointer p-space-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-rose-500/20 focus-visible:ring-offset-1"
 title="Delete FAQ"
 >
 <Trash2 className="h-4 w-4" />
 </NativeButton>
 </div>
 </td>
 </tr>
 ))}
 </tbody>
 </NativeTable>
 </ScrollArea>
 </div>
 )}

 {/* Add/Edit Dialog */}
 <Dialog open={isOpen} onOpenChange={setIsOpen}>
 <DialogContent className="max-w-md bg-card border border-[hsl(var(--foreground)/0.08)] p-space-0 overflow-hidden">
 <div className="px-space-5 pt-space-5 pb-space-4 border-b border-[hsl(var(--foreground)/0.05)]">
 <div className="flex items-center gap-space-2.5">
 <div className="h-8 w-8 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
 <HelpCircle className="h-4 w-4 text-primary" />
 </div>
 <div>
 <DialogTitle className="text-body-sm font-semibold text-foreground">
 {editingFaq ? "Edit FAQ Item" : "Add FAQ Item"}
 </DialogTitle>
 <DialogDescription className="text-caption text-muted-foreground/55 mt-space-0.5">
 Provide standard answers for Operator to use when answering questions.
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
 <Label htmlFor="faq_question" className="text-caption uppercase tracking-wider font-semibold text-muted-foreground/55">Question</Label>
 <div className="relative">
 <HelpCircle className="absolute left-space-3 top-space-3 h-3.5 w-3.5 text-muted-foreground/50 z-10" />
 <Input 
 id="faq_question"
 placeholder="e.g. Do you accept insurance?"
 {...register("question")} 
 className="h-9.5 text-caption bg-background border-[hsl(var(--foreground)/0.08)] focus-visible:ring-primary/20 pl-space-9"
 />
 </div>
 {errors.question && <p className="text-caption text-rose-500 font-semibold">{errors.question.message}</p>}
 </div>

 <div className="space-y-space-1.5">
 <Label htmlFor="faq_category" className="text-caption uppercase tracking-wider font-semibold text-muted-foreground/55">Category</Label>
 <div className="relative">
 <Layers className="absolute left-space-3 top-space-3 h-3.5 w-3.5 text-muted-foreground/50 z-10" />
 <Input 
 id="faq_category"
 placeholder="e.g. Insurance"
 {...register("category")} 
 className="h-9.5 text-caption bg-background border-[hsl(var(--foreground)/0.08)] focus-visible:ring-primary/20 pl-space-9"
 />
 </div>
 {errors.category && <p className="text-caption text-rose-500 font-semibold">{errors.category.message}</p>}
 </div>

 <div className="space-y-space-1.5">
 <Label htmlFor="faq_answer" className="text-caption uppercase tracking-wider font-semibold text-muted-foreground/55">Answer</Label>
 <div className="relative">
 <FileText className="absolute left-space-3 top-space-3 h-3.5 w-3.5 text-muted-foreground/50 z-10 pointer-events-none" />
 <NativeTextarea
 id="faq_answer"
 rows={4}
 placeholder="Write the clear, accurate answer Operator should provide..."
 className="w-full radius-md border border-[hsl(var(--foreground)/0.08)] bg-background p-space-3 pl-space-9 text-caption placeholder:text-muted-foreground/50 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-primary/20 text-foreground resize-none leading-relaxed min-h-24"
 {...register("answer")}
 />
 </div>
 {errors.answer && <p className="text-caption text-rose-500 font-semibold">{errors.answer.message}</p>}
 </div>

 {/* Active toggle switch */}
 {editingFaq && (
 <div className="flex items-center justify-between p-space-3 bg-[hsl(var(--foreground)/0.015)] border border-[hsl(var(--foreground)/0.05)] rounded-xl">
 <div className="flex items-center gap-space-2">
 <Check className="h-3.5 w-3.5 text-emerald-500/70" />
 <div>
 <p className="text-caption font-semibold text-foreground">Active Status</p>
 <p className="text-caption text-muted-foreground/55 mt-space-0.5">Available for Operator AI reference</p>
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
 <Button type="button" variant="outline" onClick={() => setIsOpen(false)} disabled={isSubmitting} className="h-9 text-caption font-semibold px-space-4 cursor-pointer rounded-lg">
 Cancel
 </Button>
 <Button type="submit" disabled={isSubmitting} className="h-9 text-caption font-semibold px-space-5 cursor-pointer rounded-lg">
 {isSubmitting ? (
 <>
 <Loader2 className="mr-space-1.5 h-3.5 w-3.5 animate-spin" /> Saving...
 </>
 ) : (
 "Save FAQ"
 )}
 </Button>
 </DialogFooter>
 </form>
 </DialogContent>
 </Dialog>
 </div>
 );
}
