"use client";

import * as React from"react";
import { useForm } from"react-hook-form";
import { zodResolver } from"@hookform/resolvers/zod";
import {
 Plus,
 Trash2,
 Edit2,
 ClipboardList,
 Loader2,
 Layers,
 Sparkles,
 GripVertical,
 ListChecks,
 Hash,
 Type,
 CheckSquare,
 ShieldCheck,
} from"lucide-react";
import {
 DndContext,
 closestCenter,
 KeyboardSensor,
 PointerSensor,
 useSensor,
 useSensors,
 DragEndEvent,
 DragOverlay,
 DragStartEvent,
 UniqueIdentifier,
} from"@dnd-kit/core";
import {
 arrayMove,
 SortableContext,
 sortableKeyboardCoordinates,
 useSortable,
 verticalListSortingStrategy,
} from"@dnd-kit/sortable";
import { CSS } from"@dnd-kit/utilities";
import { Button } from"@/components/shared/button";
import { Input } from"@/components/shared/input";
import { Label } from"@/components/shared/label";
import {
 Select,
 SelectContent,
 SelectItem,
 SelectTrigger,
 SelectValue,
} from"@/components/shared/select";
import {
 Dialog,
 DialogContent,
 DialogDescription,
 DialogTitle,
} from"@/components/shared/dialog";
import { EmptyState } from"@/components/shared/empty-state";
import {
 createFlowQuestionAction,
 updateFlowQuestionAction,
 deleteFlowQuestionAction,
 updateFlowQuestionsOrderAction,
} from "@/server/actions/flows";
import { useToast } from "@/components/shared/toast";
import { formatUserErrorMessage } from "@/lib/errors";
import { z } from"zod";
import { cn } from"@/components/shared/utils";
import { NativeButton } from "@/components/shared/native";
import { ScrollArea } from "@/components/ui/scroll-area";

/* ─── Schema ────────────────────────────────────────────────── */
const questionFormSchema = z.object({
 question: z.string().min(5,"Question must be at least 5 characters"),
 answerType: z.enum(["text","single_select","multi_select","number"]),
 optionsRaw: z.string(),
 isRequired: z.boolean(),
});
type QuestionFormInput = z.infer<typeof questionFormSchema>;

/* ─── Types ─────────────────────────────────────────────────── */
interface QualificationQuestion {
 id: string;
 question: string;
 answerType:"text"|"single_select"|"multi_select"|"number";
 options: string[] | null;
 isRequired: boolean;
 order: number;
}
interface Props {
 initialQuestions: QualificationQuestion[];
}

/* ─── Config ─────────────────────────────────────────────────── */
const answerTypeConfig = {
 text: {
 label:"Freeform Text",
 icon: Type,
 color:"text-sky-500",
 bg:"bg-sky-500/8 border-sky-500/15",
 },
 single_select: {
 label:"Single Select",
 icon: CheckSquare,
 color:"text-indigo-500",
 bg:"bg-indigo-500/8 border-indigo-500/15",
 },
 multi_select: {
 label:"Multi Select",
 icon: ListChecks,
 color:"text-violet-500",
 bg:"bg-violet-500/8 border-violet-500/15",
 },
 number: {
 label:"Numeric",
 icon: Hash,
 color:"text-amber-500",
 bg:"bg-amber-500/8 border-amber-500/15",
 },
};

/* ─── Sortable Card ──────────────────────────────────────────── */
function SortableCard({
 q,
 idx,
 totalCount,
 onEdit,
 onDelete,
 deletingId,
 isDragOverlay = false,
}: {
 q: QualificationQuestion;
 idx: number;
 totalCount: number;
 onEdit: (q: QualificationQuestion) => void;
 onDelete: (id: string) => void;
 deletingId: string | null;
 isDragOverlay?: boolean;
}) {
 const {
 attributes,
 listeners,
 setNodeRef,
 transform,
 transition,
 isDragging,
 } = useSortable({ id: q.id });

 const style = {
 transform: CSS.Transform.toString(transform),
 transition,
 };

 const typeConfig = answerTypeConfig[q.answerType];
 const TypeIcon = typeConfig.icon;
 const isDeleting = deletingId === q.id;

 return (
 <div
 ref={setNodeRef}
 style={isDragOverlay ? undefined : style}
 className={cn(
 "relative flex items-start gap-space-3 group",
 isDragging &&"opacity-0"
 )}
 >
 {/* Step Badge */}
 <div className="relative shrink-0 z-10 mt-space-3.5">
 <div
 className={cn(
 "h-9 w-9 rounded-full bg-card border flex items-center justify-center transition-colors duration-200",
 isDragOverlay
 ?"border-primary/60"
 :"border-primary/25 group-hover:border-primary/50"
 )}
 >
 <span className="font-mono text-caption font-semibold text-primary/80 group-hover:text-primary transition-colors">
 {String(idx + 1).padStart(2,"0")}
 </span>
 </div>
 </div>

 {/* Card */}
 <div
 className={cn(
 "flex-1 min-w-0 bg-card border rounded-xl p-space-4 transition-all duration-200",
 isDragOverlay
 ?"border-primary/30 scale-[1.02] rotate-[0.5deg]"
 :"border-[hsl(var(--foreground)/0.06)] soft- hover:border-[hsl(var(--primary)/0.2)]",
 isDeleting &&"opacity-50 pointer-events-none"
 )}
 >
 <div className="flex items-start gap-space-2">
 {/* Drag Handle */}
 <Button
 variant="ghost"
 {...attributes}
 {...listeners}
 className={cn(
 "mt-space-0.5 shrink-0 flex items-center justify-center h-6 w-5 rounded-md text-muted-foreground/30 hover:text-muted-foreground/70 hover:bg-[hsl(var(--foreground)/0.04)] transition-all cursor-grab active:cursor-grabbing",
 isDragOverlay &&"cursor-grabbing text-primary/60"
 )}
 aria-label="Drag to reorder"
 >
 <GripVertical className="h-4 w-4"/>
 </Button>

 {/* Main Content */}
 <div className="flex-1 min-w-0">
 {/* Tags Row */}
 <div className="flex items-center gap-space-1.5 flex-wrap mb-space-2">
 {/* Answer Type Badge */}
 <span
 className={cn(
 "inline-flex items-center gap-space-1 text-caption font-normal px-space-1.5 py-space-0.5 rounded-md border uppercase tracking-wider",
 typeConfig.color,
 typeConfig.bg
 )}
 >
 <TypeIcon className="h-2.5 w-2.5"/>
 {typeConfig.label}
 </span>

 {/* Enhanced Required Pill */}
 {q.isRequired && (
 <span className="inline-flex items-center gap-space-1 text-caption font-normal px-space-1.5 py-space-0.5 rounded-md uppercase tracking-wider bg-gradient-to-r from-rose-500/15 to-orange-500/10 border-rose-400/25 text-rose-500 inset_0_1px_0_rgba(255,255,255,0.08)]">
 <ShieldCheck className="h-2.5 w-2.5"/>
 Required
 </span>
 )}
 </div>

 {/* Question Text */}
 <p className="text-body-sm font-semibold text-foreground leading-snug">
 {q.question}
 </p>

 {/* Options Chips */}
 {["single_select","multi_select"].includes(q.answerType) &&
 q.options &&
 q.options.length > 0 && (
 <div className="flex flex-wrap gap-space-1.5 mt-space-2">
 {q.options.map((option, optIdx) => (
 <span
 key={optIdx}
 className="text-caption font-medium bg-[hsl(var(--foreground)/0.04)] border-[hsl(var(--foreground)/0.07)] text-muted-foreground px-space-2 py-space-0.5 rounded-md"
 >
 {option}
 </span>
 ))}
 </div>
 )}
 </div>

 {/* Action Toolbar */}
 <div className="flex items-center gap-space-1 shrink-0 rounded-lg border-[hsl(var(--foreground)/0.07)] bg-[hsl(var(--foreground)/0.015)] p-space-0.5 ml-space-1">
 <Button
 variant="ghost"
 onClick={() => onEdit(q)}
 className="h-7.5 w-7.5 rounded-md flex items-center justify-center text-muted-foreground/60 hover:text-primary hover:bg-primary/10 transition-colors cursor-pointer"
 title="Edit question"
 >
 <Edit2 className="h-3.5 w-3.5"/>
 </Button>
 <Button
 variant="ghost"
 onClick={() => onDelete(q.id)}
 className="h-7.5 w-7.5 rounded-md flex items-center justify-center text-muted-foreground/60 hover:text-rose-500 hover:bg-rose-500/10 transition-colors cursor-pointer"
 title="Delete question"
 disabled={isDeleting}
 >
 {isDeleting ? (
 <Loader2 className="h-3.5 w-3.5 animate-spin"/>
 ) : (
 <Trash2 className="h-3.5 w-3.5"/>
 )}
 </Button>
 </div>
 </div>
 </div>
 </div>
 );
}

/* ─── Main Component ─────────────────────────────────────────── */
export function QualificationBuilder({ initialQuestions }: Props) {
 const [questions, setQuestions] =
 React.useState<QualificationQuestion[]>(initialQuestions);
 const [isOpen, setIsOpen] = React.useState(false);
 const [editingQuestion, setEditingQuestion] =
 React.useState<QualificationQuestion | null>(null);
 const [isSubmitting, setIsSubmitting] = React.useState(false);
 const [actionError, setActionError] = React.useState<string | null>(null);
 const [deletingId, setDeletingId] = React.useState<string | null>(null);
 const [activeId, setActiveId] = React.useState<UniqueIdentifier | null>(null);
 const toast = useToast();

 React.useEffect(() => {
 setQuestions(initialQuestions);
 }, [initialQuestions]);

 /* DnD sensors */
 const sensors = useSensors(
 useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
 useSensor(KeyboardSensor, {
 coordinateGetter: sortableKeyboardCoordinates,
 })
 );

 const activeQuestion = activeId
 ? questions.find((q) => q.id === activeId)
 : null;

 const handleDragStart = (event: DragStartEvent) => {
 setActiveId(event.active.id);
 };

 const handleDragEnd = async (event: DragEndEvent) => {
 setActiveId(null);
 const { active, over } = event;
 if (!over || active.id === over.id) return;

 const oldIndex = questions.findIndex((q) => q.id === active.id);
 const newIndex = questions.findIndex((q) => q.id === over.id);
 const reordered = arrayMove(questions, oldIndex, newIndex).map(
 (item, idx) => ({ ...item, order: idx })
 );
 setQuestions(reordered);

 const res = await updateFlowQuestionsOrderAction(
 reordered.map((item) => ({ id: item.id, order: item.order }))
 );
 if (!res.success) {
 toast.error("Failed to persist ordering", formatUserErrorMessage(res.error));
 } else {
 toast.success("Order Updated", "Qualification flow step sequence persisted.");
 }
 };

 /* Form */
 const {
 register,
 handleSubmit,
 setValue,
 watch,
 reset,
 formState: { errors },
 } = useForm<QuestionFormInput>({
 resolver: zodResolver(questionFormSchema),
 defaultValues: {
 question:"",
 answerType:"text",
 optionsRaw:"",
 isRequired: true,
 },
 });

 const selectedAnswerType = watch("answerType");
 const isRequiredValue = watch("isRequired");

 const handleOpenDialog = (q?: QualificationQuestion) => {
 if (q) {
 setEditingQuestion(q);
 reset({
 question: q.question,
 answerType: q.answerType,
 optionsRaw: q.options ? q.options.join(",") :"",
 isRequired: q.isRequired,
 });
 } else {
 setEditingQuestion(null);
 reset({ question:"", answerType:"text", optionsRaw:"", isRequired: true });
 }
 setActionError(null);
 setIsOpen(true);
 };

 const onSubmit = async (data: QuestionFormInput) => {
 setIsSubmitting(true);
 setActionError(null);
 const options = ["single_select","multi_select"].includes(data.answerType)
 ? data.optionsRaw.split(",").map((o) => o.trim()).filter(Boolean)
 : [];
 if (
 ["single_select","multi_select"].includes(data.answerType) &&
 options.length === 0
 ) {
 setActionError("Please provide options for this selection question type.");
 setIsSubmitting(false);
 return;
 }
 try {
 let res;
 if (editingQuestion) {
 res = await updateFlowQuestionAction(editingQuestion.id, {
 question: data.question,
 answerType: data.answerType,
 options,
 isRequired: data.isRequired,
 });
 } else {
 res = await createFlowQuestionAction({
 question: data.question,
 answerType: data.answerType,
 options,
 isRequired: data.isRequired,
 });
 }
 if (res.success) {
 setIsOpen(false);
 reset();
 toast.success(editingQuestion ? "Question Updated" : "Question Added", "Qualification flow question saved.");
 } else {
 const errorMsg = formatUserErrorMessage(res.error, "Failed to save question");
 setActionError(errorMsg);
 toast.error("Failed to save question", errorMsg);
 }
 } catch (err: any) {
 const errorMsg = formatUserErrorMessage(err, "An unexpected error occurred");
 setActionError(errorMsg);
 toast.error("Failed to save question", errorMsg);
 } finally {
 setIsSubmitting(false);
 }
 };

 const handleDelete = async (id: string) => {
 if (!confirm("Are you sure you want to delete this question?")) return;
 setDeletingId(id);
 const res = await deleteFlowQuestionAction(id);
 setDeletingId(null);
 if (!res.success) {
 toast.error("Failed to delete question", formatUserErrorMessage(res.error));
 } else {
 toast.success("Question Deleted", "Question removed from qualification flow.");
 }
 };

 return (
 <div className="flex-1 min-h-0 flex flex-col gap-space-4 max-w-2xl">
 {/* Header Bar */}
 <div className="shrink-0 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-space-3 bg-card border-[hsl(var(--foreground)/0.06)] p-space-3.5 rounded-xl soft-">
 <div className="flex items-start gap-space-2.5">
 <div className="h-7 w-7 rounded-lg bg-primary/10 flex items-center justify-center shrink-0 mt-space-0.5">
 <Sparkles className="h-3.5 w-3.5 text-primary"/>
 </div>
 <div>
 <p className="text-caption font-semibold text-foreground">
 AI-Powered Qualification Flow
 </p>
 <p className="text-caption text-muted-foreground/65 mt-space-0.5 leading-relaxed">
 Drag to reorder. The AI asks questions in this exact sequence.
 </p>
 </div>
 </div>
 <Button
 onClick={() => handleOpenDialog()}
 className="h-8.5 text-caption font-semibold text-white cursor-pointer gap-space-1.5 shrink-0 self-end sm:self-auto rounded-lg px-space-4"
 >
 <Plus className="h-3.5 w-3.5"/> Add Question
 </Button>
 </div>

 {/* Step Count Bar */}
 {questions.length > 0 && (
 <div className="shrink-0 flex items-center gap-space-2">
 <div className="flex items-center gap-space-1.5 px-space-2.5 py-space-1 bg-[hsl(var(--foreground)/0.03)] border-[hsl(var(--foreground)/0.05)] rounded-full">
 <ListChecks className="h-3 w-3 text-primary/70"/>
 <span className="text-caption font-semibold text-muted-foreground/60 uppercase tracking-wider">
 {questions.length}{""}
 {questions.length === 1 ?"Step":"Steps"} Configured
 </span>
 </div>
 <div className="flex-1 h-px bg-[hsl(var(--foreground)/0.05)]"/>
 <span className="text-caption text-muted-foreground/40 font-medium">
 ⠿ drag to reorder
 </span>
 </div>
 )}

 {/* Sortable List */}
 <div className="flex-1 min-h-0 flex flex-col">
 {questions.length === 0 ? (
 <div className="flex-1 flex flex-col justify-center items-center">
 <EmptyState
 title="No qualification flow configured"
 description="Build a step sequence to ask prospects the right questions before scheduling."
 icon={ClipboardList}
 actionText="Add First Question"
 onAction={() => handleOpenDialog()}
 />
 </div>
 ) : (
 <ScrollArea className="flex-1 min-h-0 pb-space-4" horizontal={false}>
 <DndContext
 sensors={sensors}
 collisionDetection={closestCenter}
 onDragStart={handleDragStart}
 onDragEnd={handleDragEnd}
 >
 <SortableContext
 items={questions.map((q) => q.id)}
 strategy={verticalListSortingStrategy}
 >
 {/* Timeline */}
 <div className="relative">
 {/* Vertical connector line */}
 <div className="absolute left-space-5 top-space-10 bottom-space-10 w-px bg-gradient-to-b from-primary/25 via-primary/10 to-transparent pointer-events-none"/>

 <div className="space-y-space-3">
 {questions.map((q, idx) => (
 <SortableCard
 key={q.id}
 q={q}
 idx={idx}
 totalCount={questions.length}
 onEdit={handleOpenDialog}
 onDelete={handleDelete}
 deletingId={deletingId}
 />
 ))}
 </div>
 </div>
 </SortableContext>

 {/* Drag Overlay — floating ghost card */}
 <DragOverlay dropAnimation={{ duration: 180, easing:"ease"}}>
 {activeQuestion && (
 <SortableCard
 q={activeQuestion}
 idx={questions.findIndex((q) => q.id === activeQuestion.id)}
 totalCount={questions.length}
 onEdit={() => {}}
 onDelete={() => {}}
 deletingId={null}
 isDragOverlay
 />
 )}
 </DragOverlay>
 </DndContext>
 </ScrollArea>
 )}
 </div>

 {/* ── Dialog ─────────────────────────────────────────────── */}
 <Dialog open={isOpen} onOpenChange={setIsOpen}>
 <DialogContent className="max-w-md bg-card border-[hsl(var(--foreground)/0.08)] p-space-0 overflow-hidden">
 {/* Header */}
 <div className="px-space-5 pt-space-5 pb-space-4 border-b border-[hsl(var(--foreground)/0.05)]">
 <div className="flex items-center gap-space-2.5">
 <div className="h-8 w-8 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
 <Layers className="h-4 w-4 text-primary"/>
 </div>
 <div>
 <DialogTitle className="text-body-sm font-semibold text-foreground">
 {editingQuestion
 ?"Edit Question Step"
 :"Add Qualification Step"}
 </DialogTitle>
 <DialogDescription className="text-caption text-muted-foreground/55 mt-space-0.5">
 Operator AI asks questions in configured sequence.
 </DialogDescription>
 </div>
 </div>
 </div>

 <form
 onSubmit={handleSubmit(onSubmit)}
 className="px-space-5 pb-space-5 pt-space-4 space-y-space-4"
 >
 {actionError && (
 <div className="p-space-3 rounded-lg bg-rose-500/8 border-rose-500/12 text-caption text-rose-600 font-medium">
 {actionError}
 </div>
 )}

 {/* Question */}
 <div className="space-y-space-1.5">
 <Label
 htmlFor="flow_question"
 className="text-caption uppercase tracking-wider font-semibold text-muted-foreground/55"
 >
 Question Prompt
 </Label>
 <Input
 id="flow_question"
 placeholder="e.g. What is your estimated budget?"
 {...register("question")}
 className="h-9.5 text-caption bg-background border-[hsl(var(--foreground)/0.08)] focus-visible:ring-primary/20"
 />
 {errors.question && (
 <p className="text-caption text-rose-500 font-semibold">
 {errors.question.message}
 </p>
 )}
 </div>

 {/* Answer Type */}
 <div className="space-y-space-1.5">
 <Label className="text-caption uppercase tracking-wider font-semibold text-muted-foreground/55">
 Expected Answer Type
 </Label>
 <Select
 value={selectedAnswerType}
 onValueChange={(val) => setValue("answerType", val as any)}
 >
 <SelectTrigger className="h-9.5 text-caption bg-background border-[hsl(var(--foreground)/0.08)]">
 <SelectValue placeholder="Select Answer Type"/>
 </SelectTrigger>
 <SelectContent>
 <SelectItem value="text">
 <span className="flex items-center gap-space-2">
 <Type className="h-3.5 w-3.5 text-sky-500"/>
 Freeform Text
 </span>
 </SelectItem>
 <SelectItem value="single_select">
 <span className="flex items-center gap-space-2">
 <CheckSquare className="h-3.5 w-3.5 text-indigo-500"/>
 Single Select (Choice)
 </span>
 </SelectItem>
 <SelectItem value="multi_select">
 <span className="flex items-center gap-space-2">
 <ListChecks className="h-3.5 w-3.5 text-violet-500"/>
 Multi Select (Choices)
 </span>
 </SelectItem>
 <SelectItem value="number">
 <span className="flex items-center gap-space-2">
 <Hash className="h-3.5 w-3.5 text-amber-500"/>
 Numeric Value
 </span>
 </SelectItem>
 </SelectContent>
 </Select>
 </div>

 {/* Options (conditional) */}
 {["single_select","multi_select"].includes(
 selectedAnswerType
 ) && (
 <div className="space-y-space-1.5">
 <Label
 htmlFor="flow_options"
 className="text-caption uppercase tracking-wider font-semibold text-muted-foreground/55"
 >
 Answer Choices
 </Label>
 <Input
 id="flow_options"
 placeholder="Option A, Option B, Option C"
 {...register("optionsRaw")}
 className="h-9.5 text-caption bg-background border-[hsl(var(--foreground)/0.08)] focus-visible:ring-primary/20"
 />
 <p className="text-caption text-muted-foreground/55 leading-relaxed">
 Separate each option with a comma
 </p>
 </div>
 )}

 {/* Required Toggle */}
 <div className="flex items-center justify-between p-space-3 bg-[hsl(var(--foreground)/0.015)] border-[hsl(var(--foreground)/0.05)] rounded-xl">
 <div className="flex items-center gap-space-2">
 <ShieldCheck className="h-3.5 w-3.5 text-rose-500/70"/>
 <div>
 <p className="text-caption font-semibold text-foreground">
 Required Question
 </p>
 <p className="text-caption text-muted-foreground/55 mt-space-0.5">
 Must be answered before proceeding
 </p>
 </div>
 </div>
 <NativeButton
 type="button"
 role="switch"
 aria-checked={isRequiredValue}
 onClick={() => setValue("isRequired", !isRequiredValue)}
 className={cn(
 "relative inline-flex h-5.5 w-9.5 shrink-0 cursor-pointer items-center rounded-full transition-colors duration-200 px-[2px] outline-none focus:outline-none focus:ring-2 focus:ring-primary/20",
 isRequiredValue
 ?"bg-primary"
 :"bg-[hsl(var(--foreground)/0.12)]"
 )}
 >
 <span
 className={cn(
 "pointer-events-none block h-4 w-4 rounded-full bg-background shadow-sm transition-transform duration-200",
 isRequiredValue ?"translate-x-space-4":"translate-x-0"
 )}
 />
 </NativeButton>
 </div>

 {/* Footer */}
 <div className="flex justify-end gap-space-2 pt-space-2 border-t border-[hsl(var(--foreground)/0.05)]">
 <Button
 type="button"
 variant="outline"
 onClick={() => setIsOpen(false)}
 disabled={isSubmitting}
 className="h-9 text-caption font-semibold px-space-4 cursor-pointer rounded-lg"
 >
 Cancel
 </Button>
 <Button
 type="submit"
 disabled={isSubmitting}
 className="h-9 text-caption font-semibold px-space-5 text-white cursor-pointer rounded-lg"
 >
 {isSubmitting ? (
 <>
 <Loader2 className="mr-space-1.5 h-3.5 w-3.5 animate-spin"/>
 Saving...
 </>
 ) : (
 "Save Question"
 )}
 </Button>
 </div>
 </form>
 </DialogContent>
 </Dialog>
 </div>
 );
}
