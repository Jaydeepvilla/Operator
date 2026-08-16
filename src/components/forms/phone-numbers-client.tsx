"use client";import { Badge } from "@/components/shared/badge";

import { useState, useTransition } from "react";
import {
 Phone,
 Plus,
 Shield,
 Search,
 Check,
 AlertCircle,
 RefreshCw,
 ToggleLeft,
 ToggleRight,
 Info,
 Loader2 } from
"lucide-react";
import { Button } from "@/components/shared/button";
import { Input } from "@/components/shared/input";
import { Label } from "@/components/shared/label";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/shared/dialog";
import { purchasePhoneNumberAction, toggleRecordingAction } from "@/server/actions/voice";
import { cn } from "@/components/shared/utils";
import { ScrollArea } from "@/components/ui/scroll-area";

interface PhoneNumber {
 id: string;
 phoneNumber: string;
 type: string;
 status: string;
 name: string;
 isRecordingEnabled: boolean;
 createdAt: Date;
}

export function PhoneNumbersClient({ initialNumbers }: {initialNumbers: any[];}) {
 const [numbers, setNumbers] = useState<PhoneNumber[]>(initialNumbers as PhoneNumber[]);
 const [isOpen, setIsOpen] = useState(false);
 const [isPending, startTransition] = useTransition();

 // Search/purchase state
 const [searchQuery, setSearchQuery] = useState("");
 const [lineName, setLineName] = useState("");
 const [selectedNumber, setSelectedNumber] = useState("");
 const [statusMessage, setStatusMessage] = useState<{type: "success" | "error";text: string;} | null>(null);

 // Simulated available lines matching templates
 const SIMULATED_AVAILABLE_NUMBERS = [
 "+1 (555) 819-2090",
 "+1 (555) 438-1982",
 "+1 (555) 609-3289",
 "+1 (555) 728-1123",
 "+1 (555) 238-4490"];


 const filteredSimulated = SIMULATED_AVAILABLE_NUMBERS.filter((num) =>
 num.includes(searchQuery)
 );

 const handlePurchase = async () => {
 if (!lineName.trim()) {
 setStatusMessage({ type: "error", text: "Please enter a label for this phone line." });
 return;
 }
 if (!selectedNumber) {
 setStatusMessage({ type: "error", text: "Please select a phone number to claim." });
 return;
 }

 setStatusMessage(null);
 startTransition(async () => {
 const res = await purchasePhoneNumberAction({
 name: lineName,
 phoneNumber: selectedNumber.replace(/[()-\s]/g, "") // clean format
 });

 if (res.success && res.number) {
 setStatusMessage({ type: "success", text: "Successfully linked phone line!" });
 setNumbers((prev) => [res.number as unknown as PhoneNumber, ...prev]);
 setLineName("");
 setSelectedNumber("");
 setTimeout(() => {
 setIsOpen(false);
 setStatusMessage(null);
 }, 1500);
 } else {
 setStatusMessage({ type: "error", text: res.error || "Purchase failed." });
 }
 });
 };

 const handleToggleRecording = async (numId: string, currentEnabled: boolean) => {
 // Optimistic update
 setNumbers((prev) =>
 prev.map((n) => n.id === numId ? { ...n, isRecordingEnabled: !currentEnabled } : n)
 );

 const res = await toggleRecordingAction(numId, !currentEnabled);
 if (!res.success) {
 // Revert if error
 setNumbers((prev) =>
 prev.map((n) => n.id === numId ? { ...n, isRecordingEnabled: currentEnabled } : n)
 );
 alert("Failed to update call recording status:" + res.error);
 }
 };

 return (
 <div className="space-y-space-4 flex-1 flex flex-col min-h-0">
 {/* Controls Bar */}
 <div className="flex items-center justify-between shrink-0">
 <h2 className="text-caption font-semibold uppercase tracking-wider text-muted-foreground/60">Active Connections ({numbers.length})</h2>
 
 <Dialog open={isOpen} onOpenChange={setIsOpen}>
 <DialogTrigger asChild>
 <Button size="sm" className="px-space-3.5 text-caption">
 <Plus className="h-4 w-4" />
 Connect Phone Line
 </Button>
 </DialogTrigger>
 <DialogContent className="max-w-md bg-card border-[hsl(var(--foreground)/0.08)] radius-xl">
 <DialogHeader>
 <DialogTitle className="text-body-sm font-semibold text-foreground">Connect a Phone Number</DialogTitle>
 <DialogDescription className="text-caption text-muted-foreground mt-space-1 leading-normal">
 Search available local phone numbers to connect directly to Operator.
 </DialogDescription>
 </DialogHeader>

 <div className="space-y-space-4 py-space-3 text-caption">
 <div className="space-y-space-1.5">
 <Label htmlFor="line-name" className="text-caption uppercase tracking-wider font-semibold text-muted-foreground/75">Phone Line Label</Label>
 <Input
 id="line-name"
 placeholder="e.g. Clinic Reception / Dental Line"
 value={lineName}
 onChange={(e) => setLineName(e.target.value)}
 className="h-9.5 text-caption bg-background border-[hsl(var(--foreground)/0.08)] focus-visible:ring-primary/20" />
 
 </div>

 <div className="space-y-space-1.5">
 <Label className="text-caption uppercase tracking-wider font-semibold text-muted-foreground/75">Search Numbers</Label>
 <div className="relative">
 <Search className="absolute left-space-3 top-space-2.5 h-4 w-4 text-muted-foreground/50" />
 <Input
 placeholder="Search prefix (e.g. 555)..."
 className="pl-space-9 h-9.5 text-caption bg-background border-[hsl(var(--foreground)/0.08)] focus-visible:ring-primary/20"
 value={searchQuery}
 onChange={(e) => setSearchQuery(e.target.value)} />
 
 </div>
 </div>

 {/* Number Results Grid */}
 <ScrollArea className="border border-[hsl(var(--foreground)/0.06)] radius-lg p-space-1.5 max-h-40 space-y-space-1 bg-[hsl(var(--foreground)/0.05)]" horizontal={false}>
 {filteredSimulated.length > 0 ?
 filteredSimulated.map((num) =>
 <Button key={num} type="button" variant="ghost" onClick={() => setSelectedNumber(num)}
 className={cn(
 "w-full flex items-center justify-between px-space-3 py-space-2 radius-md text-caption transition-colors cursor-pointer",
 selectedNumber === num ?
 "bg-[hsl(var(--primary)/0.08)] text-primary font-normal border border-[hsl(var(--primary)/0.15)]" :
 "hover:bg-[hsl(var(--foreground)/0.04)] text-foreground/90"
 )}>
 
 <span className="font-mono">{num}</span>
 {selectedNumber === num && <Check className="h-3.5 w-3.5 text-primary" />}
 </Button>
 ) :

 <p className="text-caption text-muted-foreground/60 text-center py-space-4">No numbers match query</p>
 }
 </ScrollArea>

 {statusMessage &&
 <div className={cn(
 "p-space-3 radius-lg flex items-start gap-space-2 text-caption leading-relaxed",
 statusMessage.type === "success" ?
 "bg-emerald-500/10 text-emerald-600 border border-emerald-500/15" :
 "bg-rose-500/10 text-rose-600 border border-rose-500/15"
 )}>
 {statusMessage.type === "error" ? <AlertCircle className="h-4 w-4 shrink-0 mt-space-0.5 text-rose-500" /> : <Check className="h-4 w-4 shrink-0 mt-space-0.5 text-emerald-500" />}
 <span>{statusMessage.text}</span>
 </div>
 }
 </div>

 <DialogFooter className="flex gap-space-2 border-t border-[hsl(var(--foreground)/0.05)] pt-space-3">
 <Button variant="outline" size="sm" onClick={() => {setIsOpen(false);setStatusMessage(null);}}
 className="h-8.5 text-caption font-semibold cursor-pointer">
 
 Cancel
 </Button>
 <Button onClick={handlePurchase} disabled={isPending} size="sm" className="text-caption px-space-4">
 {isPending ?
 <>
 <Loader2 className="h-3.5 w-3.5 animate-spin mr-space-1" />
 <span>Linking Line...</span>
 </> :

 <span>Link Phone Line</span>
 }
 </Button>
 </DialogFooter>
 </DialogContent>
 </Dialog>
 </div>

 {/* Numbers Listing Grid */}
 <ScrollArea className="flex-1 min-h-0" horizontal={false}>
 {numbers.length === 0 ?
 <div className="flex flex-col items-center justify-center text-center py-space-16 px-space-4 bg-card border border-[hsl(var(--foreground)/0.06)] radius-xl soft- min-h-80 h-full">
 <div className="h-11 w-11 radius-md bg-[hsl(var(--primary)/0.08)] flex items-center justify-center mb-space-3 ring-4 ring-[hsl(var(--primary)/0.04)] animate-float">
 <Phone className="h-5 w-5 text-primary" />
 </div>
 <span className="text-caption font-semibold text-foreground">No Active Phone Lines</span>
 <p className="text-caption text-muted-foreground/60 max-w-xs mx-auto mt-space-1 leading-relaxed">
 Claim a virtual phone line to deploy your voice assistant to start handling inbound and outbound customer inquiries.
 </p>
 </div> :

 <div className="grid gap-space-4 sm:grid-cols-2 lg:grid-cols-3">
 {numbers.map((num) =>
 <div
 key={num.id}
 className="bg-card border border-[hsl(var(--foreground)/0.06)] radius-xl soft- flex flex-col justify-between transition-all duration-300 hover:scale-[1.01] hover:border-[hsl(var(--primary)/0.15)]">
 
 <div className="p-space-4.5">
 <div className="flex items-start justify-between">
 <div className="flex h-9.5 w-9.5 items-center justify-center radius-lg bg-[hsl(var(--primary)/0.08)] text-primary shrink-0">
 <Phone className="h-4.5 w-4.5" />
 </div>
 <span className={cn(
 "badge-status text-caption px-space-2 py-space-0.5 rounded-full uppercase tracking-wider font-semibold shrink-0",
 num.status === "active" ?
 "badge-success" :
 "badge-warning"
 )}>
 {num.status}
 </span>
 </div>
 
 <div className="mt-space-4">
 <h3 className="text-body-sm font-semibold text-foreground truncate leading-tight">{num.name}</h3>
 <p className="font-mono text-caption text-muted-foreground mt-space-1 leading-none">{num.phoneNumber}</p>
 </div>
 </div>
 
 <Badge variant="soft">
 <div className="flex items-center justify-between">
 <span className="flex items-center gap-space-1.5">
 <Shield className="h-3.5 w-3.5 text-muted-foreground/45 shrink-0" />
 Call Recording
 </span>
 <Button onClick={() => handleToggleRecording(num.id, num.isRecordingEnabled)}
 className="focus:outline-none transition-transform active:scale-95 text-primary hover:text-primary/80 cursor-pointer bg-transparent border-none"
 type="button">
 
 {num.isRecordingEnabled ?
 <ToggleRight className="h-6 w-6" /> :

 <ToggleLeft className="h-6 w-6 text-muted-foreground/45" />
 }
 </Button>
 </div>
 </Badge>

 <Badge variant="soft">
 <span>Type: {num.type}</span>
 <span className="flex items-center gap-space-1">
 <Info className="h-3.5 w-3.5 text-muted-foreground/40 shrink-0" />
 AI Agent Connected
 </span>
 </Badge>
 </div>
 )}
 </div>
 }
 </ScrollArea>
 </div>);

}