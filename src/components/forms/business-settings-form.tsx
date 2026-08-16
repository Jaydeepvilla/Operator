"use client";import { Badge } from "@/components/shared/badge";

import * as React from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  Save,
  Loader2,
  Check,
  Clock,
  Calendar,
  Globe,
  Bell,
  Users,
  Settings2,
  CalendarDays,
  RefreshCw,
  AlertCircle,
  ExternalLink,
  Link2,
  Trash2,
  FileText,
  Sliders,
  HelpCircle,
  CheckSquare } from
"lucide-react";
import { Button } from "@/components/shared/button";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/shared/card";
import { Input } from "@/components/shared/input";
import { Label } from "@/components/shared/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue } from
"@/components/shared/select";
import { saveBusinessHoursAction, saveGeneralSettingsAction } from "@/server/actions/settings";
import { saveBookingRulesAction } from "@/server/actions/calendar";
import { cn } from "@/components/shared/utils";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle } from
"@/components/shared/dialog";
import { NativeButton } from "@/components/shared/native";
import { ScrollArea } from "@/components/ui/scroll-area";

interface BusinessSettingsFormProps {
  settings: {
    id: string;
    businessHours: any;
    holidays: string[];
    languages: string[];
    bookingPreferences: any;
    notificationPreferences: any;
    leadAssignmentRules: any;
  };
  bookingRules?: any;
}

const DAYS_OF_WEEK = ["monday", "tuesday", "wednesday", "thursday", "friday", "saturday", "sunday"];

export function BusinessSettingsForm({ settings, bookingRules }: BusinessSettingsFormProps) {
  const [activeTab, setActiveTab] = React.useState<"hours" | "notifications" | "bookingRules">("hours");
  const [isSaving, setIsSaving] = React.useState(false);
  const [saveSuccess, setSaveSuccess] = React.useState(false);
  const [saveError, setSaveError] = React.useState<string | null>(null);

  // Business Hours Local State
  const [hours, setHours] = React.useState<Record<string, {open: string;close: string;closed: boolean;}>>(
    settings.businessHours || {}
  );

  // Holidays Local State
  const [holidays, setHolidays] = React.useState<string[]>(settings.holidays || []);
  const [newHoliday, setNewHoliday] = React.useState("");

  // General Preferences States
  const [languages, setLanguages] = React.useState<string[]>(settings.languages || ["en"]);
  const [leadAssignment, setLeadAssignment] = React.useState(
    settings.leadAssignmentRules?.type || "round_robin"
  );
  const [notifyChannels, setNotifyChannels] = React.useState<string[]>(
    settings.notificationPreferences?.channels || ["email"]
  );

  // Booking Rules Local State
  const [rules, setRules] = React.useState({
    cancellationLeadTime: bookingRules?.cancellationLeadTime ?? 24
  });

  const handleHourChange = (day: string, field: "open" | "close", value: string) => {
    setHours((prev) => ({
      ...prev,
      [day]: {
        ...prev[day],
        [field]: value
      }
    }));
  };

  const handleClosedToggle = (day: string) => {
    setHours((prev) => ({
      ...prev,
      [day]: {
        ...prev[day],
        closed: !prev[day].closed
      }
    }));
  };

  const handleAddHoliday = () => {
    if (!newHoliday) return;
    if (holidays.includes(newHoliday)) return;
    setHolidays((prev) => [...prev, newHoliday].sort());
    setNewHoliday("");
  };

  const handleRemoveHoliday = (date: string) => {
    setHolidays((prev) => prev.filter((d) => d !== date));
  };

  const handleLangToggle = (lang: string) => {
    setLanguages((prev) =>
    prev.includes(lang) ? prev.filter((l) => l !== lang) : [...prev, lang]
    );
  };

  const handleChannelToggle = (channel: string) => {
    setNotifyChannels((prev) =>
    prev.includes(channel) ? prev.filter((c) => c !== channel) : [...prev, channel]
    );
  };

  const onSaveHours = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    setSaveSuccess(false);
    setSaveError(null);

    try {
      const res = await saveBusinessHoursAction(hours, holidays);
      if (res.success) {
        setSaveSuccess(true);
        setTimeout(() => setSaveSuccess(false), 3000);
      } else {
        setSaveError(res.error || "Failed to save hours");
      }
    } catch (err: any) {
      setSaveError(err?.message || "An unexpected error occurred");
    } finally {
      setIsSaving(false);
    }
  };

  const onSavePreferences = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    setSaveSuccess(false);
    setSaveError(null);

    try {
      const res = await saveGeneralSettingsAction({
        languages,
        bookingPreferences: settings.bookingPreferences || {},
        notificationPreferences: { ...settings.notificationPreferences, channels: notifyChannels },
        leadAssignmentRules: { ...settings.leadAssignmentRules, type: leadAssignment }
      });
      if (res.success) {
        setSaveSuccess(true);
        setTimeout(() => setSaveSuccess(false), 3000);
      } else {
        setSaveError(res.error || "Failed to save configurations");
      }
    } catch (err: any) {
      setSaveError(err?.message || "An unexpected error occurred");
    } finally {
      setIsSaving(false);
    }
  };

  const onSaveBookingRules = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    setSaveSuccess(false);
    setSaveError(null);

    try {
      const res = await saveBookingRulesAction(rules);
      if (res.success) {
        setSaveSuccess(true);
        setTimeout(() => setSaveSuccess(false), 3000);
      } else {
        setSaveError(res.error || "Failed to save booking rules");
      }
    } catch (err: any) {
      setSaveError(err?.message || "An unexpected error occurred");
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="space-y-space-4 w-full">
      {/* shadcn Tabs — brand color active, underline style */}
      <Tabs value={activeTab} onValueChange={(val: any) => { setActiveTab(val); setSaveSuccess(false); }} className="w-full mb-space-4">
        <TabsList className="w-full h-auto p-1 bg-[hsl(var(--foreground)/0.04)] border border-[hsl(var(--foreground)/0.06)] rounded-lg grid grid-cols-1 sm:grid-cols-3 gap-1 mb-space-4">
          <TabsTrigger value="hours" className="gap-1.5 text-xs font-medium">
            <Clock className="h-3.5 w-3.5 shrink-0" /> Hours &amp; Holidays
          </TabsTrigger>
          <TabsTrigger value="notifications" className="gap-1.5 text-xs font-medium">
            <Bell className="h-3.5 w-3.5 shrink-0" /> Languages &amp; Rules
          </TabsTrigger>
          <TabsTrigger value="bookingRules" className="gap-1.5 text-xs font-medium">
            <Settings2 className="h-3.5 w-3.5 shrink-0" /> Booking Rules
          </TabsTrigger>
        </TabsList>
      </Tabs>

 {saveSuccess &&
      <Badge variant="success" className="animate-fade-in">
 <Check className="h-4 w-4 shrink-0 text-emerald-500" /> Workspace configurations updated successfully.
 </Badge>
      }

 {saveError &&
      <Badge variant="destructive" className="animate-fade-in">
 {saveError}
 </Badge>
      }

 {/* Tab content 1: Business Hours */}
 {activeTab === "hours" &&
      <form onSubmit={onSaveHours} className="space-y-space-4 animate-fade-in">

  {/* Side-by-side: Operating Hours + Holiday Closures */}
  <div className="grid grid-cols-1 xl:grid-cols-2 gap-space-4 items-start">

   {/* LEFT: Operating Hours */}
   <div className="bg-card border border-[hsl(var(--foreground)/0.06)] radius-xl overflow-hidden flex flex-col">
    <div className="p-space-4 border-b border-[hsl(var(--foreground)/0.06)] bg-[hsl(var(--foreground)/0.005)] shrink-0 flex items-center gap-space-3">
     <div className="h-8 w-8 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
      <Clock className="h-4 w-4 text-primary" />
     </div>
     <div>
      <h4 className="text-caption font-semibold text-foreground">Operating Hours</h4>
      <p className="text-caption text-muted-foreground/65 mt-space-0.5">Define weekly slots Operator AI can verify.</p>
     </div>
    </div>

    <div className="p-space-4 space-y-space-2.5 bg-[hsl(var(--foreground)/0.002)] flex-1">
     {DAYS_OF_WEEK.map((day) => {
      const dayHours = hours[day] || { open: "09:00", close: "17:00", closed: false };
      return (
       <div key={day} className="flex flex-wrap items-center justify-between gap-space-2 p-space-2.5 rounded-xl border border-[hsl(var(--foreground)/0.04)] bg-[hsl(var(--foreground)/0.005)] hover:border-[hsl(var(--foreground)/0.08)] transition-all duration-200">
        {/* Day toggle */}
        <div className="flex items-center gap-space-2 w-24 shrink-0">
         <NativeButton
          type="button"
          role="switch"
          aria-checked={!dayHours.closed}
          onClick={() => handleClosedToggle(day)}
          className={cn(
           "relative inline-flex h-5.5 w-9.5 shrink-0 cursor-pointer items-center rounded-full transition-colors duration-200 px-[2px] outline-none focus:outline-none focus:ring-2 focus:ring-primary/20",
           !dayHours.closed ? "bg-primary" : "bg-[hsl(var(--foreground)/0.12)]"
          )}>
          <span className={cn(
           "pointer-events-none block h-4 w-4 rounded-full bg-background shadow-sm transition-transform duration-200",
           !dayHours.closed ? "translate-x-space-4" : "translate-x-0"
          )} />
         </NativeButton>
         <Label onClick={() => handleClosedToggle(day)} className="capitalize text-caption font-semibold text-foreground cursor-pointer select-none w-16">
          {day}
         </Label>
        </div>

        {/* Time inputs — no Clock overlay; browser native icon is sufficient */}
        <div className="flex items-center gap-space-2 flex-1 justify-center">
         <Input
          type="time"
          value={dayHours.open}
          onChange={(e) => handleHourChange(day, "open", e.target.value)}
          disabled={dayHours.closed}
          className="w-32 text-caption h-8 bg-background border-[hsl(var(--foreground)/0.08)] disabled:opacity-30 disabled:cursor-not-allowed px-space-2 focus-visible:ring-primary/20" />
         <span className="text-caption text-muted-foreground/50 uppercase font-bold tracking-wider text-[10px]">TO</span>
         <Input
          type="time"
          value={dayHours.close}
          onChange={(e) => handleHourChange(day, "close", e.target.value)}
          disabled={dayHours.closed}
          className="w-32 text-caption h-8 bg-background border-[hsl(var(--foreground)/0.08)] disabled:opacity-30 disabled:cursor-not-allowed px-space-2 focus-visible:ring-primary/20" />
        </div>

        {/* Status badge */}
        <span className={cn(
         "inline-flex text-[10px] font-semibold border px-space-2 py-space-0.5 rounded-full uppercase tracking-wider shrink-0",
         !dayHours.closed
          ? "bg-[hsl(var(--state-success-bg))] border-[hsl(var(--state-success-border))] text-[hsl(var(--state-success-text))]"
          : "bg-[hsl(var(--state-error-bg))] border-[hsl(var(--state-error-border))] text-[hsl(var(--state-error-text))]"
        )}>
         {!dayHours.closed ? "Open" : "Closed"}
        </span>
       </div>
      );
     })}
    </div>
   </div>

   {/* RIGHT: Holiday Closures */}
   <div className="bg-card border border-[hsl(var(--foreground)/0.06)] radius-xl overflow-hidden flex flex-col">
    <div className="p-space-4 border-b border-[hsl(var(--foreground)/0.06)] bg-[hsl(var(--foreground)/0.005)] shrink-0 flex items-center gap-space-3">
     <div className="h-8 w-8 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
      <Calendar className="h-4 w-4 text-primary" />
     </div>
     <div>
      <h4 className="text-caption font-semibold text-foreground">Holiday Closures</h4>
      <p className="text-caption text-muted-foreground/65 mt-space-0.5">Dates when the Operator AI replies the business is closed.</p>
     </div>
    </div>

    <div className="p-space-4 space-y-space-4 bg-[hsl(var(--foreground)/0.002)] flex-1">
     <div className="flex gap-space-2">
      <div className="relative flex-1">
       <Calendar className="absolute left-space-2.5 top-space-2.5 h-3.5 w-3.5 text-muted-foreground/50 z-10 pointer-events-none" />
       <Input
        type="date"
        value={newHoliday}
        onChange={(e) => setNewHoliday(e.target.value)}
        className="h-8.5 text-caption bg-background border-[hsl(var(--foreground)/0.08)] focus-visible:ring-primary/20 pl-space-8" />
      </div>
      <Button type="button" onClick={handleAddHoliday} size="sm" className="text-caption px-space-4 shrink-0">
       Add Date
      </Button>
     </div>

     {holidays.length === 0
      ? <p className="text-caption text-muted-foreground/60 italic">No closed holiday dates configured.</p>
      : <div className="flex flex-wrap gap-space-2 pt-space-1">
       {holidays.map((date) =>
        <Badge key={date}>
         <Calendar className="h-3.5 w-3.5 text-primary/70 shrink-0" />
         {date}
         <Button type="button" onClick={() => handleRemoveHoliday(date)}
          className="text-muted-foreground/75 hover:text-rose-500 transition-colors ml-space-1 font-semibold cursor-pointer">
          &times;
         </Button>
        </Badge>
       )}
      </div>
     }
    </div>
   </div>
  </div>

  {/* Save footer */}
  <div className="flex justify-end">
   <Button type="submit" disabled={isSaving} className="text-caption text-white gap-space-1.5 px-space-5">
    {isSaving
     ? <><Loader2 className="h-3.5 w-3.5 animate-spin" /> Saving...</>
     : <><Save className="h-3.5 w-3.5" /> Save Hours &amp; Closures</>
    }
   </Button>
  </div>
 </form>
      }

 {/* Tab content 2: Languages & Preferences */}
 {activeTab === "notifications" &&
      <form onSubmit={onSavePreferences} className="space-y-space-4 animate-fade-in">
 {/* Languages supported */}
 <div className="bg-card border border-[hsl(var(--foreground)/0.06)] radius-xl overflow-hidden soft-">
 <div className="p-space-4 border-b border-[hsl(var(--foreground)/0.06)] bg-[hsl(var(--foreground)/0.005)] shrink-0 flex items-center gap-space-3">
 <div className="h-8 w-8 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
 <Globe className="h-4 w-4 text-primary" />
 </div>
 <div>
 <h4 className="text-caption font-semibold text-foreground">Languages Supported</h4>
 <p className="text-caption text-muted-foreground/65 mt-space-0.5">
 Select which spoken languages Operator AI should answer in.
 </p>
 </div>
 </div>

 <div className="p-space-5 grid gap-space-3 sm:grid-cols-2 bg-[hsl(var(--foreground)/0.002)]">
 {[
            { code: "en", label: "English (US/UK)" },
            { code: "es", label: "Spanish (Español)" },
            { code: "fr", label: "French (Français)" },
            { code: "de", label: "German (Deutsch)" }].
            map((lang) => {
              const isSelected = languages.includes(lang.code);
              return (
                <div
                  key={lang.code}
                  onClick={() => handleLangToggle(lang.code)}
                  className={cn(
                    "flex items-center gap-space-3 p-space-3.5 rounded-xl border transition-all duration-200 cursor-pointer select-none",
                    isSelected ?
                    "bg-primary/5 border-primary/20 text-foreground" :
                    "bg-[hsl(var(--foreground)/0.005)] border-[hsl(var(--foreground)/0.04)] hover:border-[hsl(var(--foreground)/0.08)]"
                  )} tabIndex={0} onKeyDown={() => {}}>
                  
 <NativeButton type="button" role="checkbox" aria-checked={isSelected} className={cn("h-4 w-4 rounded border flex items-center justify-center transition-colors outline-none focus:outline-none focus:ring-1 focus:ring-primary/20", isSelected ? "bg-primary border-primary text-primary-foreground" : "border-[hsl(var(--foreground)/0.15)] bg-background")}>
 {isSelected && <Check className="h-3 w-3 text-white stroke-[3]" />}
 </NativeButton>
 <span className="text-caption font-semibold text-foreground">
 {lang.label}
 </span>
 </div>);

            })}
 </div>
 </div>

 {/* Lead Assignment Rules */}
 <div className="bg-card border border-[hsl(var(--foreground)/0.06)] radius-xl overflow-hidden soft-">
 <div className="p-space-4 border-b border-[hsl(var(--foreground)/0.06)] bg-[hsl(var(--foreground)/0.005)] shrink-0 flex items-center gap-space-3">
 <div className="h-8 w-8 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
 <Users className="h-4 w-4 text-primary" />
 </div>
 <div>
 <h4 className="text-caption font-semibold text-foreground">Lead Assignment Strategy</h4>
 <p className="text-caption text-muted-foreground/65 mt-space-0.5">
 Select how new qualified client leads should be routed to team operators.
 </p>
 </div>
 </div>

 <div className="p-space-5 bg-[hsl(var(--foreground)/0.002)]">
 <div className="space-y-space-1.5 max-w-sm">
 <Label htmlFor="lead_assign" className="text-caption uppercase tracking-wider font-semibold text-muted-foreground/75">Assignment Protocol</Label>
 <div className="relative">
 <Users className="absolute left-space-3 top-space-3 h-3.5 w-3.5 text-muted-foreground/50 z-10 pointer-events-none" />
 <Select value={leadAssignment} onValueChange={(val) => setLeadAssignment(val)}>
 <SelectTrigger className="h-9.5 text-caption bg-background border-[hsl(var(--foreground)/0.08)] focus-visible:ring-primary/20 pl-space-9">
 <SelectValue placeholder="Select Strategy" />
 </SelectTrigger>
 <SelectContent>
 <SelectItem value="round_robin">Round Robin (Sequential)</SelectItem>
 <SelectItem value="broadcast">Broadcast to All Operators</SelectItem>
 <SelectItem value="direct">Direct to Account Owner</SelectItem>
 </SelectContent>
 </Select>
 </div>
 </div>
 </div>
 </div>

 {/* Notification Preferences */}
 <div className="bg-card border border-[hsl(var(--foreground)/0.06)] radius-xl overflow-hidden soft-">
 <div className="p-space-4 border-b border-[hsl(var(--foreground)/0.06)] bg-[hsl(var(--foreground)/0.005)] shrink-0 flex items-center gap-space-3">
 <div className="h-8 w-8 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
 <Bell className="h-4 w-4 text-primary" />
 </div>
 <div>
 <h4 className="text-caption font-semibold text-foreground">System Notification Preferences</h4>
 <p className="text-caption text-muted-foreground/65 mt-space-0.5">
 Choose the channels where you receive summaries of qualified leads and call reports.
 </p>
 </div>
 </div>

 <div className="p-space-5 grid gap-space-3 sm:grid-cols-2 bg-[hsl(var(--foreground)/0.002)]">
 {[
            { code: "email", label: "Email Summaries", desc: "Sent immediately after customer calls." },
            { code: "sms", label: "SMS Text Alerts", desc: "Sent for high priority emergency calls." }].
            map((channel) => {
              const isChecked = notifyChannels.includes(channel.code);
              return (
                <div
                  key={channel.code}
                  onClick={() => handleChannelToggle(channel.code)}
                  className={cn(
                    "flex items-start gap-space-3.5 p-space-3.5 rounded-xl border transition-all duration-200 cursor-pointer select-none",
                    isChecked ?
                    "bg-primary/5 border-primary/20 text-foreground" :
                    "bg-[hsl(var(--foreground)/0.005)] border-[hsl(var(--foreground)/0.04)] hover:border-[hsl(var(--foreground)/0.08)]"
                  )} tabIndex={0} onKeyDown={() => {}}>
                  
 <NativeButton type="button" role="checkbox" aria-checked={isChecked} className={cn("h-4 w-4 rounded border flex items-center justify-center transition-colors shrink-0 mt-space-0.5 outline-none focus:outline-none focus:ring-1 focus:ring-primary/20", isChecked ? "bg-primary border-primary text-primary-foreground" : "border-[hsl(var(--foreground)/0.15)] bg-background")}>
 {isChecked && <Check className="h-3 w-3 text-white stroke-[3]" />}
 </NativeButton>
 <div className="space-y-space-0.5">
 <Label className="text-caption font-semibold text-foreground cursor-pointer leading-tight">
 {channel.label}
 </Label>
 <p className="text-caption text-muted-foreground/75 leading-relaxed">{channel.desc}</p>
 </div>
 </div>);

            })}
 </div>
 
 <div className="px-space-5 py-space-4 border-t border-[hsl(var(--foreground)/0.06)] bg-[hsl(var(--foreground)/0.005)] flex justify-end">
 <Button type="submit" disabled={isSaving} className="text-caption text-white gap-space-1.5 px-space-5">
 {isSaving ?
              <>
 <Loader2 className="h-3.5 w-3.5 animate-spin" /> Saving...
 </> :

              <>
 <Save className="h-3.5 w-3.5" /> Save Rules & Languages
 </>
              }
 </Button>
 </div>
 </div>
 </form>
      }

 {/* Tab content 3: Booking Rules */}
 {activeTab === "bookingRules" &&
      <form onSubmit={onSaveBookingRules} className="space-y-space-4 animate-fade-in">
 <div className="bg-card border border-[hsl(var(--foreground)/0.06)] radius-xl overflow-hidden soft-">
 <div className="p-space-4 border-b border-[hsl(var(--foreground)/0.06)] bg-[hsl(var(--foreground)/0.005)] shrink-0 flex items-center gap-space-3">
 <div className="h-8 w-8 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
 <Settings2 className="h-4 w-4 text-primary" />
 </div>
 <div>
 <h4 className="text-caption font-semibold text-foreground">Booking Rules & Windows</h4>
 <p className="text-caption text-muted-foreground/65 mt-space-0.5">
 Configure schedule logic to prevent last-minute bookings or too-far-out appointments.
 </p>
 </div>
 </div>

 <div className="p-space-5 space-y-space-5 bg-[hsl(var(--foreground)/0.002)]">
 <div className="grid gap-space-4 sm:grid-cols-2">
 <div className="space-y-space-1.5">
 <Label htmlFor="minLeadTime" className="text-caption uppercase tracking-wider font-semibold text-muted-foreground/75">Minimum Lead Time (hours)</Label>
 <div className="relative">
 <Clock className="absolute left-space-3 top-space-3 h-3.5 w-3.5 text-muted-foreground/50 z-10" />
 <Input
                    id="minLeadTime"
                    type="number"
                    min={0}
                    value={rules.minLeadTime}
                    onChange={(e) => setRules({ ...rules, minLeadTime: parseInt(e.target.value) || 0 })}
                    className="h-9.5 text-caption bg-background border-[hsl(var(--foreground)/0.08)] focus-visible:ring-primary/20 pl-space-9" />
                  
 </div>
 <p className="text-caption text-muted-foreground/60 leading-relaxed">
 Prevents clients from booking slots within this many hours of current time.
 </p>
 </div>

 <div className="space-y-space-1.5">
 <Label htmlFor="maxLookahead" className="text-caption uppercase tracking-wider font-semibold text-muted-foreground/75">Maximum Lookahead (days)</Label>
 <div className="relative">
 <Calendar className="absolute left-space-3 top-space-3 h-3.5 w-3.5 text-muted-foreground/50 z-10" />
 <Input
                    id="maxLookahead"
                    type="number"
                    min={1}
                    value={rules.maxLookahead}
                    onChange={(e) => setRules({ ...rules, maxLookahead: parseInt(e.target.value) || 1 })}
                    className="h-9.5 text-caption bg-background border-[hsl(var(--foreground)/0.08)] focus-visible:ring-primary/20 pl-space-9" />
                  
 </div>
 <p className="text-caption text-muted-foreground/60 leading-relaxed">
 Restricts clients to search availability within this many days in advance.
 </p>
 </div>
 </div>

 <div className="grid gap-space-4 sm:grid-cols-2 border-t border-[hsl(var(--foreground)/0.05)] pt-space-4">
 <div className="space-y-space-1.5">
 <Label htmlFor="bufferBefore" className="text-caption uppercase tracking-wider font-semibold text-muted-foreground/75">Buffer Before Appointment (minutes)</Label>
 <div className="relative">
 <Clock className="absolute left-space-3 top-space-3 h-3.5 w-3.5 text-muted-foreground/50 z-10" />
 <Input
                    id="bufferBefore"
                    type="number"
                    min={0}
                    step={5}
                    value={rules.defaultBufferBefore}
                    onChange={(e) => setRules({ ...rules, defaultBufferBefore: parseInt(e.target.value) || 0 })}
                    className="h-9.5 text-caption bg-background border-[hsl(var(--foreground)/0.08)] focus-visible:ring-primary/20 pl-space-9" />
                  
 </div>
 <p className="text-caption text-muted-foreground/60 leading-relaxed">
 Rest period added before each booked slot to prevent overlaps.
 </p>
 </div>

 <div className="space-y-space-1.5">
 <Label htmlFor="bufferAfter" className="text-caption uppercase tracking-wider font-semibold text-muted-foreground/75">Buffer After Appointment (minutes)</Label>
 <div className="relative">
 <Clock className="absolute left-space-3 top-space-3 h-3.5 w-3.5 text-muted-foreground/50 z-10" />
 <Input
                    id="bufferAfter"
                    type="number"
                    min={0}
                    step={5}
                    value={rules.defaultBufferAfter}
                    onChange={(e) => setRules({ ...rules, defaultBufferAfter: parseInt(e.target.value) || 0 })}
                    className="h-9.5 text-caption bg-background border-[hsl(var(--foreground)/0.08)] focus-visible:ring-primary/20 pl-space-9" />
                  
 </div>
 <p className="text-caption text-muted-foreground/60 leading-relaxed">
 Cooldown time added after each booked slot.
 </p>
 </div>
 </div>

 <div className="space-y-space-3.5 border-t border-[hsl(var(--foreground)/0.05)] pt-space-4">
 <h4 className="text-caption font-semibold uppercase tracking-wider text-muted-foreground/70">Client Actions</h4>
 
 <div className="grid gap-space-4 sm:grid-cols-2">
 <div
                  onClick={() => setRules({ ...rules, allowRescheduling: !rules.allowRescheduling })}
                  className={cn(
                    "flex items-start gap-space-3.5 p-space-3.5 rounded-xl border transition-all duration-200 cursor-pointer select-none",
                    rules.allowRescheduling ?
                    "bg-primary/5 border-primary/20 text-foreground" :
                    "bg-[hsl(var(--foreground)/0.005)] border-[hsl(var(--foreground)/0.04)] hover:border-[hsl(var(--foreground)/0.08)]"
                  )} tabIndex={0} onKeyDown={() => {}}>
                  
 <NativeButton type="button" role="checkbox" aria-checked={rules.allowRescheduling} className={cn("h-4 w-4 rounded border flex items-center justify-center transition-colors shrink-0 mt-space-0.5 outline-none focus:outline-none focus:ring-1 focus:ring-primary/20", rules.allowRescheduling ? "bg-primary border-primary text-primary-foreground" : "border-[hsl(var(--foreground)/0.15)] bg-background")}>
 {rules.allowRescheduling && <Check className="h-3 w-3 text-white stroke-[3]" />}
 </NativeButton>
 <div className="space-y-space-0.5">
 <Label className="text-caption font-semibold text-foreground cursor-pointer leading-tight">
 Allow Rescheduling
 </Label>
 <p className="text-caption text-muted-foreground/75 leading-relaxed">
 Permit Operator AI to suggest alternative times.
 </p>
 </div>
 </div>

 <div
                  onClick={() => setRules({ ...rules, allowCancellation: !rules.allowCancellation })}
                  className={cn(
                    "flex items-start gap-space-3.5 p-space-3.5 rounded-xl border transition-all duration-200 cursor-pointer select-none",
                    rules.allowCancellation ?
                    "bg-primary/5 border-primary/20 text-foreground" :
                    "bg-[hsl(var(--foreground)/0.005)] border-[hsl(var(--foreground)/0.04)] hover:border-[hsl(var(--foreground)/0.08)]"
                  )} tabIndex={0} onKeyDown={() => {}}>
                  
 <NativeButton type="button" role="checkbox" aria-checked={rules.allowCancellation} className={cn("h-4 w-4 rounded border flex items-center justify-center transition-colors shrink-0 mt-space-0.5 outline-none focus:outline-none focus:ring-1 focus:ring-primary/20", rules.allowCancellation ? "bg-primary border-primary text-primary-foreground" : "border-[hsl(var(--foreground)/0.15)] bg-background")}>
 {rules.allowCancellation && <Check className="h-3 w-3 text-white stroke-[3]" />}
 </NativeButton>
 <div className="space-y-space-0.5">
 <Label className="text-caption font-semibold text-foreground cursor-pointer leading-tight">
 Allow Cancellation
 </Label>
 <p className="text-caption text-muted-foreground/75 leading-relaxed">
 Allow automated cancellations during dialogue checks.
 </p>
 </div>
 </div>
 </div>

 {rules.allowCancellation &&
              <div className="space-y-space-1.5 max-w-sm pt-space-2 animate-fade-in">
 <Label htmlFor="cancellationLeadTime" className="text-caption uppercase tracking-wider font-semibold text-muted-foreground/75">Cancellation Minimum Lead Time (hours)</Label>
 <div className="relative">
 <Clock className="absolute left-space-3 top-space-3 h-3.5 w-3.5 text-muted-foreground/50 z-10" />
 <Input
                    id="cancellationLeadTime"
                    type="number"
                    min={0}
                    value={rules.cancellationLeadTime}
                    onChange={(e) => setRules({ ...rules, cancellationLeadTime: parseInt(e.target.value) || 0 })}
                    className="h-9.5 text-caption bg-background border-[hsl(var(--foreground)/0.08)] focus-visible:ring-primary/20 pl-space-9" />
                  
 </div>
 <p className="text-caption text-muted-foreground/60 leading-relaxed">
 Minimum hours prior to start time that cancellation is permitted.
 </p>
 </div>
              }
 </div>
 </div>
 
 <div className="px-space-5 py-space-4 border-t border-[hsl(var(--foreground)/0.06)] bg-[hsl(var(--foreground)/0.005)] flex justify-end">
 <Button type="submit" disabled={isSaving} className="text-caption text-white gap-space-1.5 px-space-5">
 {isSaving ?
              <>
 <Loader2 className="h-3.5 w-3.5 animate-spin" /> Saving...
 </> :

              <>
 <Save className="h-3.5 w-3.5" /> Save Booking Rules
 </>
              }
            </Button>
          </div>
        </div>
      </form>
      )}
    </div>
  );
}