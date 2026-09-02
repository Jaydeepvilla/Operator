"use client";;
import { Badge } from "@/components/shared/badge";
import { useState, useEffect } from "react";
import {
 getStaffListAction,
 getStaffDetailsAction,
 createStaffAction,
 updateStaffAction,
 deleteStaffAction,
 saveStaffScheduleAction,
 saveAvailabilityExceptionAction,
 deleteAvailabilityExceptionAction,
 updateStaffAssignmentsAction,
} from "@/server/actions/staff";
import { getServicesAction } from "@/server/actions/services";
import {
 Users,
 Clock,
 Plus,
 Trash2,
 Briefcase,
 CalendarRange,
 X,
 AlertCircle,
 Clock3,
 CheckCircle2,
 XCircle,
 Mail,
 Phone,
 Timer,
 ShieldCheck,
 UserX,
} from "lucide-react";
import { Button } from "@/components/shared/button";
import { PageTitle } from "@/components/shared/page-title";
import { Input } from "@/components/shared/input";
import {
 Dialog,
 DialogContent,
 DialogHeader,
 DialogTitle,
 DialogDescription,
 DialogFooter,
} from "@/components/shared/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { cn } from "@/components/shared/utils";

import { getButtonClasses } from '@/design-system/button-tokens';

interface StaffItem {
 id: string;
 name: string;
 role: string;
 email: string | null;
 phone: string | null;
 bufferTime: number;
 isActive: boolean;
 schedules: any[];
 assignments: any[];
}

const DAY_NAMES = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
const DAY_SHORT = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const GRADIENTS = [
 "from-indigo-500 to-violet-500",
 "from-blue-500 to-cyan-500",
 "from-violet-500 to-pink-500",
 "from-emerald-500 to-teal-500",
 "from-amber-500 to-orange-500",
 "from-rose-500 to-pink-500",
 "from-sky-500 to-blue-500",
];

function getInitials(name: string) {
 if (!name) return "ST";
 const parts = name.trim().split(/\s+/);
 return parts.length >= 2
 ? (parts[0][0] + parts[1][0]).toUpperCase()
 : name.slice(0, 2).toUpperCase();
}

function getGradient(name: string) {
 const hash = name.split("").reduce((a, c) => a + c.charCodeAt(0), 0);
 return GRADIENTS[hash % GRADIENTS.length];
}

function SectionLabel({ icon: Icon, children }: { icon: any; children: React.ReactNode }) {
 return (
 <div className="flex items-center gap-2 mb-3">
 <div className="h-6 w-6 rounded-md bg-primary/10 flex items-center justify-center shrink-0">
 <Icon className="h-3.5 w-3.5 text-primary" />
 </div>
 <span className="text-[11px] font-bold uppercase tracking-widest text-muted-foreground/70">
 {children}
 </span>
 </div>
 );
}

export default function StaffPage() {
 const [staffList, setStaffList] = useState<StaffItem[]>([]);
 const [servicesList, setServicesList] = useState<any[]>([]);
 const [loading, setLoading] = useState(true);
 const [selectedStaffId, setSelectedStaffId] = useState<string | null>(null);
 const [activeDetails, setActiveDetails] = useState<any | null>(null);
 const [loadingDetails, setLoadingDetails] = useState(false);
 const [errorMsg, setErrorMsg] = useState("");

 const [createOpen, setCreateOpen] = useState(false);
 const [newName, setNewName] = useState("");
 const [newRole, setNewRole] = useState("staff");
 const [newEmail, setNewEmail] = useState("");
 const [newPhone, setNewPhone] = useState("");
 const [newBuffer, setNewBuffer] = useState("0");
 const [creating, setCreating] = useState(false);

 const [exceptionOpen, setExceptionOpen] = useState(false);
 const [excDate, setExcDate] = useState("");
 const [excAvailable, setExcAvailable] = useState(false);
 const [excReason, setExcReason] = useState("");
 const [addingExc, setAddingExc] = useState(false);

 const loadStaff = async () => {
 setLoading(true);
 const [res, resServices] = await Promise.all([getStaffListAction(), getServicesAction()]);
 if (res.success && res.staff) {
 setStaffList(res.staff as StaffItem[]);
 if (res.staff.length > 0 && !selectedStaffId) {
 setSelectedStaffId(res.staff[0].id);
 }
 } else {
 setErrorMsg(res.error || "Failed to load staff members");
 }
 if (resServices.success && resServices.services) {
 setServicesList(resServices.services);
 }
 setLoading(false);
 };

 useEffect(() => { loadStaff(); }, []);

 useEffect(() => {
 if (!selectedStaffId) { setActiveDetails(null); return; }
 const load = async () => {
 setLoadingDetails(true);
 const res = await getStaffDetailsAction(selectedStaffId);
 if (res.success) setActiveDetails(res);
 else setErrorMsg(res.error || "Failed to load staff details");
 setLoadingDetails(false);
 };
 load();
 }, [selectedStaffId]);

 const reloadDetails = async () => {
 if (!selectedStaffId) return;
 const res = await getStaffDetailsAction(selectedStaffId);
 if (res.success) setActiveDetails(res);
 };

 const handleCreateStaff = async (e: React.FormEvent) => {
 e.preventDefault();
 if (!newName.trim()) return;
 setCreating(true);
 const res = await createStaffAction({
 name: newName, role: newRole,
 email: newEmail.trim() || null,
 phone: newPhone.trim() || null,
 bufferTime: parseInt(newBuffer, 10) || 0,
 });
 if (res.success) {
 setNewName(""); setNewEmail(""); setNewPhone(""); setNewBuffer("0");
 setCreateOpen(false);
 await loadStaff();
 if (res.staff) setSelectedStaffId(res.staff.id);
 } else setErrorMsg(res.error || "Failed to create staff profile");
 setCreating(false);
 };

 const handleToggleActive = async () => {
 if (!selectedStaffId || !activeDetails) return;
 const res = await updateStaffAction(selectedStaffId, {
 name: activeDetails.staff.name,
 role: activeDetails.staff.role,
 isActive: !activeDetails.staff.isActive,
 });
 if (res.success) { await loadStaff(); await reloadDetails(); }
 else setErrorMsg(res.error || "Failed to toggle status");
 };

 const handleDeleteStaff = async () => {
 if (!selectedStaffId) return;
 if (!window.confirm("Are you sure you want to delete this staff profile?")) return;
 const res = await deleteStaffAction(selectedStaffId);
 if (res.success) { setSelectedStaffId(null); await loadStaff(); }
 else setErrorMsg(res.error || "Failed to delete staff member");
 };

 const handleToggleAssignment = async (serviceId: string) => {
 if (!selectedStaffId || !activeDetails) return;
 const current = activeDetails.assignments.map((a: any) => a.serviceId);
 const next = current.includes(serviceId)
 ? current.filter((id: string) => id !== serviceId)
 : [...current, serviceId];
 const res = await updateStaffAssignmentsAction(selectedStaffId, next);
 if (res.success) await reloadDetails();
 else setErrorMsg(res.error || "Failed to update assignments");
 };

 const handleSaveSchedule = async (dayOfWeek: number, shiftStart: string, shiftEnd: string) => {
 if (!selectedStaffId) return;
 const res = await saveStaffScheduleAction(selectedStaffId, {
 dayOfWeek, shifts: [{ start: shiftStart, end: shiftEnd }],
 });
 if (res.success) await reloadDetails();
 else setErrorMsg(res.error || "Failed to update shift hours");
 };

 const handleRemoveDay = async (dayOfWeek: number) => {
 if (!selectedStaffId) return;
 await saveStaffScheduleAction(selectedStaffId, { dayOfWeek, shifts: [] });
 await reloadDetails();
 };

 const handleAddException = async (e: React.FormEvent) => {
 e.preventDefault();
 if (!selectedStaffId || !excDate) return;
 setAddingExc(true);
 const res = await saveAvailabilityExceptionAction({
 staffMemberId: selectedStaffId, exceptionDate: excDate,
 isAvailable: excAvailable, reason: excReason || null,
 shifts: excAvailable ? [{ start: "09:00", end: "17:00" }] : null,
 });
 if (res.success) {
 setExcDate(""); setExcReason(""); setExcAvailable(false);
 setExceptionOpen(false);
 await reloadDetails();
 } else setErrorMsg(res.error || "Failed to save exception");
 setAddingExc(false);
 };

 const handleDeleteException = async (id: string) => {
 const res = await deleteAvailabilityExceptionAction(id);
 if (res.success) await reloadDetails();
 else setErrorMsg(res.error || "Failed to delete exception");
 };

 const activeCount = staffList.filter((s) => s.isActive).length;

 return (
 <div className="space-y-space-4 animate-fade-in w-full h-full flex flex-col overflow-hidden">
 {/* ── Header ── */}
 <PageTitle
 title="Staff Scheduler"
 description="Manage staff profiles, schedule shift hours, assign services, and block out vacation dates."
 actions={
 <Button size="sm" className="gap-1.5 font-semibold shrink-0" onClick={() => setCreateOpen(true)}>
 <Plus className="h-4 w-4" /> Add Staff Member
 </Button>
 }
 />
 {errorMsg && (
 <div className="flex items-center gap-3 rounded-xl bg-rose-500/8 border-rose-500/20 px-4 py-3 text-caption text-[hsl(var(--state-error-text))] shrink-0">
 <AlertCircle className="h-4 w-4 shrink-0" />
 <span className="flex-1 font-medium">{errorMsg}</span>
 <button onClick={() => setErrorMsg("")} className={getButtonClasses(
 'primary',
 'filled',
 'medium',
 'hover:opacity-70 transition-opacity text-base leading-none'
 )}>×</button>
 </div>
 )}
 {/* ── Main 3-column grid ── */}
 <div className="flex-1 min-h-0 grid grid-cols-1 lg:grid-cols-12 gap-space-4">

 {/* ─────── LEFT PANEL: Team roster ─────── */}
 <div className="lg:col-span-3 flex flex-col gap-space-3 h-full min-h-0">

 {/* Stats strip */}
 <div className="grid grid-cols-2 gap-space-2">
 <div className="bg-card border-[hsl(var(--foreground)/0.06)] rounded-xl p-3 flex flex-col gap-1">
 <span className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground/55">Total</span>
 <span className="text-2xl font-bold text-foreground tabular-nums">{staffList.length}</span>
 <span className="text-[11px] text-muted-foreground/60">members</span>
 </div>
 <div className="bg-card border-[hsl(var(--foreground)/0.06)] rounded-xl p-3 flex flex-col gap-1">
 <span className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground/55">Active</span>
 <span className="text-2xl font-bold text-emerald-500 tabular-nums">{activeCount}</span>
 <span className="text-[11px] text-muted-foreground/60">on roster</span>
 </div>
 </div>

 {/* Roster list */}
 <div className="flex-1 bg-card border-[hsl(var(--foreground)/0.06)] rounded-xl overflow-hidden flex flex-col min-h-0">
 <div className="px-4 py-3 border-b border-[hsl(var(--foreground)/0.05)] bg-[hsl(var(--foreground)/0.005)] shrink-0 flex items-center justify-between">
 <span className="text-[11px] font-bold uppercase tracking-widest text-muted-foreground/60">Team Roster</span>
 <Users className="h-3.5 w-3.5 text-muted-foreground/40" />
 </div>

 <ScrollArea className="flex-1" horizontal={false} vertical={staffList.length > 8}>
 {loading ? (
 <div className="p-2 h-48 flex items-center justify-center gap-2 text-caption text-muted-foreground">
 <Clock className="h-4 w-4 animate-spin text-primary" /> Loading...
 </div>
 ) : staffList.length === 0 ? (
 <div className="p-2 h-48 flex flex-col items-center justify-center gap-2 text-center">
 <Users className="h-8 w-8 text-muted-foreground/30" />
 <p className="text-caption text-muted-foreground/70">No staff members yet.</p>
 <Button size="sm" variant="outline" className="mt-1 text-caption h-7" onClick={() => setCreateOpen(true)}>
 <Plus className="h-3 w-3 mr-1" /> Add first member
 </Button>
 </div>
 ) : (
 <div className="p-2 space-y-1">
 {staffList.map((staff) => {
 const isSelected = staff.id === selectedStaffId;
 return (
 <button
 key={staff.id}
 onClick={() => setSelectedStaffId(staff.id)}
 className={cn(
 "w-full text-left px-3 py-3 rounded-lg cursor-pointer transition-all duration-150 border flex gap-3 items-center relative select-none group",
 isSelected
 ? "bg-background border-primary/20 shadow-sm"
 : "bg-transparent border-transparent hover:bg-[hsl(var(--foreground)/0.025)] hover:border-[hsl(var(--foreground)/0.05)]"
 )}
 >
 {isSelected && (
 <span className="absolute left-0 top-3 bottom-3 w-[3px] bg-primary rounded-r-full" />
 )}
 <div className={`h-9 w-9 rounded-full bg-gradient-to-br ${getGradient(staff.name)} text-white text-[11px] font-bold flex items-center justify-center shrink-0 shadow-sm`}>
 {getInitials(staff.name)}
 </div>
 <div className="flex-1 min-w-0">
 <div className="flex items-center justify-between gap-1 mb-0.5">
 <span className="text-[13px] font-semibold text-foreground truncate leading-tight">{staff.name}</span>
 <span className={cn(
 "text-[9px] uppercase font-bold tracking-wider rounded-full px-1.5 py-0.5 border shrink-0",
 staff.isActive
 ? "bg-emerald-500/10 text-[hsl(var(--state-success-text))] border-emerald-500/20"
 : "bg-neutral-500/8 text-muted-foreground/60 border-neutral-500/15"
 )}>
 {staff.isActive ? "Active" : "Off"}
 </span>
 </div>
 <p className="text-[11px] text-muted-foreground/65 truncate">{staff.role}</p>
 </div>
 </button>
 );
 })}
 </div>
 )}
 </ScrollArea>
 </div>
 </div>

 {/* ─────── RIGHT PANEL: Detail editor ─────── */}
 <div className="lg:col-span-9 bg-card border-[hsl(var(--foreground)/0.06)] rounded-xl overflow-hidden flex flex-col h-full min-h-0">
 {loadingDetails ? (
 <div className="flex-1 flex items-center justify-center gap-3 text-caption text-muted-foreground">
 <Clock className="h-5 w-5 animate-spin text-primary" /> Loading member details...
 </div>
 ) : !activeDetails ? (
 <div className="flex-1 flex flex-col items-center justify-center gap-4 p-10 text-center">
 <div className="h-16 w-16 rounded-2xl bg-[hsl(var(--foreground)/0.04)] border-[hsl(var(--foreground)/0.06)] flex items-center justify-center">
 <Clock3 className="h-7 w-7 text-muted-foreground/30" />
 </div>
 <div className="space-y-1 max-w-xs">
 <p className="text-body-sm font-semibold text-foreground">Select a team member</p>
 <p className="text-caption text-muted-foreground/60 leading-relaxed">
 Choose a staff profile from the roster to manage their schedule, services, and availability overrides.
 </p>
 </div>
 </div>
 ) : (
 <>
 {/* ── Profile header bar ── */}
 <div className="px-6 py-4 border-b border-[hsl(var(--foreground)/0.05)] bg-[hsl(var(--foreground)/0.005)] shrink-0">
 <div className="flex items-center justify-between gap-4">
 <div className="flex items-center gap-4 min-w-0">
 <div className={`h-12 w-12 rounded-xl bg-gradient-to-br ${getGradient(activeDetails.staff.name)} text-white text-sm font-bold flex items-center justify-center shrink-0 shadow-md`}>
 {getInitials(activeDetails.staff.name)}
 </div>
 <div className="min-w-0">
 <div className="flex items-center gap-2.5 flex-wrap">
 <h2 className="text-base font-bold text-foreground truncate leading-tight">{activeDetails.staff.name}</h2>
 <span className={cn(
 "text-[9px] uppercase font-bold tracking-wider rounded-full px-2 py-0.5 border",
 activeDetails.staff.isActive
 ? "bg-emerald-500/10 text-[hsl(var(--state-success-text))] border-emerald-500/20"
 : "bg-neutral-500/8 text-muted-foreground/60 border-neutral-500/15"
 )}>
 {activeDetails.staff.isActive ? "Active" : "Inactive"}
 </span>
 </div>
 <div className="flex items-center gap-3 mt-1 flex-wrap">
 <span className="text-[12px] text-muted-foreground/70 font-medium">{activeDetails.staff.role}</span>
 {activeDetails.staff.email && (
 <span className="flex items-center gap-1 text-[11px] text-muted-foreground/50">
 <Mail className="h-3 w-3" />{activeDetails.staff.email}
 </span>
 )}
 {activeDetails.staff.bufferTime > 0 && (
 <span className="flex items-center gap-1 text-[11px] text-muted-foreground/50">
 <Timer className="h-3 w-3" />{activeDetails.staff.bufferTime}m buffer
 </span>
 )}
 </div>
 </div>
 </div>

 <div className="flex items-center gap-2 shrink-0">
 <Button
 size="sm"
 variant="outline"
 className={cn(
 "text-caption h-8 gap-1.5 font-semibold border-[hsl(var(--foreground)/0.08)]",
 activeDetails.staff.isActive
 ? "hover:bg-amber-500/8 hover:text-amber-600 hover:border-amber-500/20"
 : "hover:bg-emerald-500/8 hover:text-emerald-600 hover:border-emerald-500/20"
 )}
 onClick={handleToggleActive}
 >
 {activeDetails.staff.isActive
 ? <><UserX className="h-3.5 w-3.5" />Deactivate</>
 : <><ShieldCheck className="h-3.5 w-3.5" />Activate</>
 }
 </Button>
 <Button
 size="sm"
 variant="destructive"
 className="text-caption h-8 gap-1.5 font-semibold"
 onClick={handleDeleteStaff}
 >
 <Trash2 className="h-3.5 w-3.5" /> Delete
 </Button>
 </div>
 </div>
 </div>

 {/* ── Scrollable detail sections ── */}
 <ScrollArea className="flex-1" horizontal={false}>
 <div className="p-6 space-y-6">

 {/* ── Row 1: Services + Exceptions ── */}
 <div className="grid grid-cols-1 md:grid-cols-2 gap-5">

 {/* Services Assigned */}
 <div className="bg-background/60 border-[hsl(var(--foreground)/0.05)] rounded-xl p-4">
 <SectionLabel icon={Briefcase}>Services Assigned</SectionLabel>

 {servicesList.length === 0 ? (
 <div className="flex flex-col items-center justify-center py-6 gap-2 text-center">
 <Briefcase className="h-6 w-6 text-muted-foreground/30" />
 <p className="text-caption text-muted-foreground/60 leading-relaxed max-w-48">
 No services configured. Add them in Services Manager first.
 </p>
 </div>
 ) : (
 <ScrollArea className="max-h-[240px] pr-1" horizontal={false} vertical={servicesList.length > 4}>
 <div className="space-y-1">
 {servicesList.map((service) => {
 const isAssigned = activeDetails.assignments.some((a: any) => a.serviceId === service.id);
 const id = `svc-${service.id}`;
 return (
 <label
 key={service.id}
 htmlFor={id}
 className={cn(
 "flex items-center gap-3 px-3 py-2.5 rounded-lg cursor-pointer select-none transition-all duration-100 border group",
 isAssigned
 ? "bg-primary/5 border-primary/15 hover:bg-primary/8"
 : "border-transparent hover:bg-[hsl(var(--foreground)/0.025)] hover:border-[hsl(var(--foreground)/0.04)]"
 )}
 >
 <div className={cn(
 "h-4.5 w-4.5 rounded border flex items-center justify-center shrink-0 transition-all",
 isAssigned ? "bg-primary border-primary" : "border-[hsl(var(--foreground)/0.2)] bg-transparent"
 )}>
 {isAssigned && <CheckCircle2 className="h-3 w-3 text-white" />}
 </div>
 <input
 type="checkbox" id={id} checked={isAssigned}
 onChange={() => handleToggleAssignment(service.id)}
 className="sr-only"
 />
 <div className="flex-1 min-w-0">
 <span className="text-[12px] font-medium text-foreground truncate block leading-tight">{service.name}</span>
 </div>
 <span className="text-[11px] font-bold text-primary shrink-0">${service.price}</span>
 </label>
 );
 })}
 </div>
 </ScrollArea>
 )}

 {servicesList.length > 0 && (
 <div className="mt-3 pt-3 border-t border-[hsl(var(--foreground)/0.04)] flex items-center justify-between">
 <span className="text-[11px] text-muted-foreground/60">
 {activeDetails.assignments.length} of {servicesList.length} assigned
 </span>
 <div className="h-1.5 flex-1 mx-3 bg-[hsl(var(--foreground)/0.06)] rounded-full overflow-hidden">
 <div
 className="h-full bg-primary rounded-full transition-all duration-300"
 style={{ width: `${servicesList.length > 0 ? (activeDetails.assignments.length / servicesList.length) * 100 : 0}%` }}
 />
 </div>
 </div>
 )}
 </div>

 {/* Vacation / Exceptions */}
 <div className="bg-background/60 border-[hsl(var(--foreground)/0.05)] rounded-xl p-4">
 <div className="flex items-start justify-between mb-3">
 <SectionLabel icon={CalendarRange}>Vacation & Exceptions</SectionLabel>
 <Button
 size="sm"
 variant="outline"
 className="text-[11px] h-7 px-2.5 border-[hsl(var(--foreground)/0.08)] hover:bg-primary/5 hover:border-primary/20 font-semibold gap-1 shrink-0 -mt-0.5"
 onClick={() => setExceptionOpen(true)}
 >
 <Plus className="h-3 w-3" /> Add
 </Button>
 </div>

 {activeDetails.exceptions.length === 0 ? (
 <div className="flex flex-col items-center justify-center py-6 gap-2 text-center">
 <CalendarRange className="h-6 w-6 text-muted-foreground/30" />
 <p className="text-caption text-muted-foreground/60 max-w-44 leading-relaxed">
 No exceptions added. Block holidays or set custom hours here.
 </p>
 </div>
 ) : (
 <ScrollArea className="max-h-[210px] pr-1" horizontal={false} vertical={activeDetails.exceptions.length > 3}>
 <div className="space-y-2">
 {activeDetails.exceptions.map((exc: any) => (
 <div
 key={exc.id}
 className="flex items-center gap-3 bg-background border-[hsl(var(--foreground)/0.05)] rounded-lg px-3 py-2.5 group animate-fade-in"
 >
 <div className={cn(
 "h-8 w-8 rounded-lg flex items-center justify-center shrink-0",
 exc.isAvailable ? "bg-blue-500/10" : "bg-rose-500/10"
 )}>
 {exc.isAvailable
 ? <CheckCircle2 className="h-4 w-4 text-blue-500" />
 : <XCircle className="h-4 w-4 text-rose-500" />
 }
 </div>
 <div className="flex-1 min-w-0">
 <span className="text-[12px] font-semibold text-foreground block leading-tight">{exc.exceptionDate}</span>
 <div className="flex items-center gap-1.5 mt-0.5">
 <span className={cn(
 "text-[9px] uppercase font-bold tracking-wider px-1.5 py-0.5 rounded border",
 exc.isAvailable
 ? "bg-blue-500/10 text-[hsl(var(--state-info-text))] border-blue-500/20"
 : "bg-rose-500/10 text-[hsl(var(--state-error-text))] border-rose-500/20"
 )}>
 {exc.isAvailable ? "Custom Hours" : "Closed"}
 </span>
 {exc.reason && (
 <span className="text-[11px] text-muted-foreground/60 italic truncate">{exc.reason}</span>
 )}
 </div>
 </div>
 <button
 type="button"
 onClick={() => handleDeleteException(exc.id)}
 className={getButtonClasses(
 'primary',
 'filled',
 'small',
 'h-7 w-7 text-muted-foreground/40 flex items-center justify-center transition-all opacity-0 group-hover:opacity-100 shrink-0'
 )}
 >
 <X className="h-3.5 w-3.5" />
 </button>
 </div>
 ))}
 </div>
 </ScrollArea>
 )}
 </div>
 </div>

 {/* ── Row 2: Weekly Hours ── */}
 <div className="bg-background/60 border-[hsl(var(--foreground)/0.05)] rounded-xl p-4">
 <SectionLabel icon={Clock}>Weekly Working Hours</SectionLabel>

 <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-1 xl:grid-cols-2 gap-2">
 {[1, 2, 3, 4, 5, 6, 0].map((dayNum) => {
 const sched = activeDetails.schedules.find((s: any) => s.dayOfWeek === dayNum);
 const shifts = sched?.shifts || [];
 const shiftStart = shifts[0]?.start || "09:00";
 const shiftEnd = shifts[0]?.end || "17:00";
 const isWorking = shifts.length > 0;
 const isWeekend = dayNum === 0 || dayNum === 6;

 return (
 <div
 key={dayNum}
 className={cn(
 "flex items-center gap-3 px-3.5 py-3 rounded-xl border transition-all duration-150",
 isWorking
 ? "bg-background border-[hsl(var(--foreground)/0.06)]"
 : "bg-[hsl(var(--foreground)/0.015)] border-transparent"
 )}
 >
 {/* Day toggle */}
 <button
 onClick={() => {
 if (isWorking) handleRemoveDay(dayNum);
 else handleSaveSchedule(dayNum, "09:00", "17:00");
 }}
 className={cn(
 "h-5 w-5 rounded border flex items-center justify-center shrink-0 transition-all",
 isWorking ? "bg-primary border-primary" : "border-[hsl(var(--foreground)/0.2)] bg-transparent"
 )}
 >
 {isWorking && <CheckCircle2 className="h-3 w-3 text-white" />}
 </button>

 {/* Day name */}
 <span className={cn(
 "text-[12px] font-semibold w-12 shrink-0",
 isWorking ? "text-foreground" : "text-muted-foreground/50"
 )}>
 {DAY_SHORT[dayNum]}
 </span>

 {/* Shift hours or Rest badge */}
 {isWorking ? (
 <div className="flex items-center gap-2 flex-1">
 <div className="flex items-center gap-1.5 bg-[hsl(var(--foreground)/0.04)] border-[hsl(var(--foreground)/0.06)] rounded-lg px-2 py-1.5 flex-1">
 <input
 type="time"
 value={shiftStart}
 className="bg-transparent border-0 focus:outline-none p-0 text-[12px] font-mono text-foreground flex-1 min-w-0 cursor-pointer"
 onChange={(e) => handleSaveSchedule(dayNum, e.target.value, shiftEnd)}
 />
 <span className="text-[10px] text-muted-foreground/40 font-semibold uppercase px-0.5">–</span>
 <input
 type="time"
 value={shiftEnd}
 className="bg-transparent border-0 focus:outline-none p-0 text-[12px] font-mono text-foreground flex-1 min-w-0 cursor-pointer"
 onChange={(e) => handleSaveSchedule(dayNum, shiftStart, e.target.value)}
 />
 </div>
 </div>
 ) : (
 <span className={cn(
 "text-[10px] font-bold uppercase tracking-wider px-2 py-1 rounded-md flex-1",
 isWeekend
 ? "text-[hsl(var(--state-warning-text))]/70 bg-amber-500/5"
 : "text-muted-foreground/40 bg-[hsl(var(--foreground)/0.02)]"
 )}>
 {isWeekend ? "Weekend" : "Rest Day"}
 </span>
 )}
 </div>
 );
 })}
 </div>
 </div>

 </div>
 </ScrollArea>
 </>
 )}
 </div>

 </div>
 {/* ── Add Staff Dialog ── */}
 <Dialog open={createOpen} onOpenChange={setCreateOpen}>
 <DialogContent className="sm:max-w-lg bg-card border-[hsl(var(--foreground)/0.08)] radius-xl">
 <DialogHeader>
 <DialogTitle className="text-base font-bold text-foreground">Add Staff Member</DialogTitle>
 <DialogDescription className="text-caption text-muted-foreground">
 Create a new staff profile with scheduling details and contact information.
 </DialogDescription>
 </DialogHeader>
 <form onSubmit={handleCreateStaff}>
 <div className="space-y-4 py-4">
 <div className="grid grid-cols-2 gap-4">
 <div className="col-span-2 space-y-1.5">
 <label htmlFor="staff-name" className="text-[10px] uppercase font-bold text-muted-foreground/60 tracking-wider">Full Name *</label>
 <Input id="staff-name" value={newName} onChange={(e) => setNewName(e.target.value)} placeholder="e.g. Dr. Sarah Jenkins" className="bg-background" required />
 </div>
 <div className="space-y-1.5">
 <label htmlFor="staff-role" className="text-[10px] uppercase font-bold text-muted-foreground/60 tracking-wider">Role Title *</label>
 <Input id="staff-role" value={newRole} onChange={(e) => setNewRole(e.target.value)} placeholder="e.g. Lead Dentist" className="bg-background" required />
 </div>
 <div className="space-y-1.5">
 <label htmlFor="staff-buffer" className="text-[10px] uppercase font-bold text-muted-foreground/60 tracking-wider">Buffer Time (min)</label>
 <Input id="staff-buffer" type="number" value={newBuffer} onChange={(e) => setNewBuffer(e.target.value)} placeholder="15" className="bg-background" />
 </div>
 <div className="space-y-1.5">
 <label htmlFor="staff-email" className="text-[10px] uppercase font-bold text-muted-foreground/60 tracking-wider">Email</label>
 <Input id="staff-email" type="email" value={newEmail} onChange={(e) => setNewEmail(e.target.value)} placeholder="sarah@clinic.com" className="bg-background" />
 </div>
 <div className="space-y-1.5">
 <label htmlFor="staff-phone" className="text-[10px] uppercase font-bold text-muted-foreground/60 tracking-wider">Phone</label>
 <Input id="staff-phone" value={newPhone} onChange={(e) => setNewPhone(e.target.value)} placeholder="+1 555-0199" className="bg-background" />
 </div>
 </div>
 </div>
 <DialogFooter className="gap-2 border-t border-[hsl(var(--foreground)/0.05)] pt-4">
 <Button type="button" variant="outline" size="sm" onClick={() => setCreateOpen(false)} disabled={creating} className="font-semibold">Cancel</Button>
 <Button type="submit" size="sm" disabled={creating || !newName.trim()} className="font-semibold">
 {creating ? "Creating..." : "Create Member"}
 </Button>
 </DialogFooter>
 </form>
 </DialogContent>
 </Dialog>
 {/* ── Exception Dialog ── */}
 <Dialog open={exceptionOpen} onOpenChange={setExceptionOpen}>
 <DialogContent className="sm:max-w-md bg-card border-[hsl(var(--foreground)/0.08)] radius-xl">
 <DialogHeader>
 <DialogTitle className="text-base font-bold text-foreground">Add Vacation / Exception</DialogTitle>
 <DialogDescription className="text-caption text-muted-foreground">
 Override availability for a specific date — block a holiday or set custom shift hours.
 </DialogDescription>
 </DialogHeader>
 <form onSubmit={handleAddException}>
 <div className="space-y-4 py-4">
 <div className="space-y-1.5">
 <label htmlFor="exc-date" className="text-[10px] uppercase font-bold text-muted-foreground/60 tracking-wider">Target Date *</label>
 <Input id="exc-date" type="date" value={excDate} onChange={(e) => setExcDate(e.target.value)} className="bg-background" required />
 </div>
 <label className="flex items-start gap-3 p-3 rounded-lg border-[hsl(var(--foreground)/0.06)] hover:bg-[hsl(var(--foreground)/0.02)] cursor-pointer transition-colors select-none">
 <input
 type="checkbox"
 checked={excAvailable}
 onChange={(e) => setExcAvailable(e.target.checked)}
 className="mt-0.5 rounded border-[hsl(var(--foreground)/0.2)] bg-background text-primary focus:ring-0 h-4 w-4 cursor-pointer"
 />
 <div>
 <span className="text-[12px] font-semibold text-foreground block">Custom working hours</span>
 <span className="text-[11px] text-muted-foreground/60 leading-relaxed">Check to set custom shift hours; leave unchecked to mark as closed/holiday.</span>
 </div>
 </label>
 <div className="space-y-1.5">
 <label htmlFor="exc-reason" className="text-[10px] uppercase font-bold text-muted-foreground/60 tracking-wider">Reason (optional)</label>
 <Input id="exc-reason" value={excReason} onChange={(e) => setExcReason(e.target.value)} placeholder="e.g. Family vacation, Conference" className="bg-background" />
 </div>
 </div>
 <DialogFooter className="gap-2 border-t border-[hsl(var(--foreground)/0.05)] pt-4">
 <Button type="button" variant="outline" size="sm" onClick={() => setExceptionOpen(false)} disabled={addingExc} className="font-semibold">Cancel</Button>
 <Button type="submit" size="sm" disabled={addingExc || !excDate} className="font-semibold">
 {addingExc ? "Saving..." : "Save Override"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}