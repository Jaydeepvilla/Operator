"use client";import { Badge } from "@/components/shared/badge";

import { useState } from "react";
import {
  Users,
  UserPlus,
  Mail,
  ShieldAlert,
  ShieldCheck,
  Shield,
  Search,
  UserMinus,
  Lock,
  Check,
  Loader2,
  Calendar,
  Sparkles } from
"lucide-react";
import { Button } from "@/components/shared/button";
import { PageTitle } from "@/components/shared/page-title";
import { Input } from "@/components/shared/input";
import { Label } from "@/components/shared/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle } from
"@/components/shared/dialog";
import { cn } from "@/components/shared/utils";
import { NativeTable } from "@/components/shared/native";
import { ScrollArea } from "@/components/ui/scroll-area";

interface TeamMember {
  id: string;
  name: string;
  email: string;
  role: "owner" | "manager" | "staff" | "admin";
  status: "active" | "pending";
  joinedAt: string;
}

export default function TeamPage() {
  // Members List State for interactive UI simulations
  const [members, setMembers] = useState<TeamMember[]>([
  {
    id: "1",
    name: "Workspace Creator",
    email: "owner@operator.ai",
    role: "owner",
    status: "active",
    joinedAt: "Jun 22, 2026"
  },
  {
    id: "2",
    name: "Office Manager",
    email: "manager@operator.ai",
    role: "manager",
    status: "active",
    joinedAt: "Jun 28, 2026"
  },
  {
    id: "3",
    name: "Front Desk Staff",
    email: "staff@operator.ai",
    role: "staff",
    status: "pending",
    joinedAt: "Jul 01, 2026"
  }]
  );

  // UI state hooks
  const [showInviteForm, setShowInviteForm] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [roleFilter, setRoleFilter] = useState<string>("all");
  const [successBanner, setSuccessBanner] = useState<string | null>(null);

  // Form input hooks
  const [inviteName, setInviteName] = useState("");
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteRole, setInviteRole] = useState<"staff" | "manager" | "admin">("staff");
  const [inviting, setInviting] = useState(false);

  // Seat Configuration
  const maxSeats = 10;
  const usedSeats = members.length;
  const remainingSeats = maxSeats - usedSeats;
  const seatProgress = usedSeats / maxSeats * 100;

  // Handles adding new operator
  const handleInviteSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!inviteName.trim() || !inviteEmail.trim()) return;

    setInviting(true);

    // Simulate network delay for premium feel
    setTimeout(() => {
      const newMember: TeamMember = {
        id: Math.random().toString(36).substring(2, 9),
        name: inviteName,
        email: inviteEmail,
        role: inviteRole,
        status: "pending",
        joinedAt: new Date().toLocaleDateString("en-US", {
          month: "short",
          day: "2-digit",
          year: "numeric"
        })
      };

      setMembers((prev) => [...prev, newMember]);
      setSuccessBanner(`Successfully sent email invitation to ${inviteEmail}!`);
      setInviteName("");
      setInviteEmail("");
      setInviteRole("staff");
      setInviting(false);
      setShowInviteForm(false);
    }, 1200);
  };

  // Revoke/Delete user handler
  const handleRevoke = (id: string, name: string) => {
    setMembers((prev) => prev.filter((m) => m.id !== id));
    setSuccessBanner(`Revoked invitation for ${name}.`);
  };

  // Filter members list based on filters & queries
  const filteredMembers = members.filter((member) => {
    const matchesSearch =
    member.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    member.email.toLowerCase().includes(searchQuery.toLowerCase());

    const matchesRole = roleFilter === "all" || member.role === roleFilter || roleFilter === "pending" && member.status === "pending";
    return matchesSearch && matchesRole;
  });

  const getRoleIcon = (role: string) => {
    switch (role) {
      case "owner":
        return ShieldAlert;
      case "manager":
        return ShieldCheck;
      case "admin":
        return ShieldAlert;
      default:
        return Shield;
    }
  };

  const getRoleGradient = (role: string) => {
    switch (role) {
      case "owner":
        return "from-violet-600 to-indigo-600";
      case "admin":
        return "from-rose-500 to-red-600";
      case "manager":
        return "from-emerald-500 to-teal-500";
      default:
        return "from-blue-500 to-indigo-500";
    }
  };

  const getRoleBadgeClass = (role: string) => {
    switch (role) {
      case "owner":
        return "bg-violet-500/10 text-violet-500 border-violet-500/20";
      case "admin":
        return "bg-rose-500/10 text-rose-500 border-rose-500/20";
      case "manager":
        return "bg-emerald-500/10 text-emerald-500 border-emerald-500/20";
      default:
        return "bg-neutral-500/10 text-muted-foreground border-neutral-500/20";
    }
  };

  return (
    <div className="space-y-space-4 w-full animate-fade-in pb-space-10">
 
 {/* Header section */}
 <PageTitle
        title="Team"
        description="People who use this platform. Invite your team and set their access level."
        actions={
        <Button onClick={() => setShowInviteForm(true)} size="sm">
          
 <UserPlus className="h-3.5 w-3.5" /> Invite Team Member
 </Button>
        } />
      

 {/* Success Banner feedback */}
 {successBanner &&
      <Badge className="animate-fade-in">
 <Check className="h-4 w-4 shrink-0" />
 <span className="flex-1 font-medium">{successBanner}</span>
 <Button className="hover:opacity-70 transition-opacity px-space-1 text-body-sm" onClick={() => setSuccessBanner(null)}>
          
 ✕
 </Button>
 </Badge>
      }

 {/* KPI metrics row from analytics page styling */}
 <div className="grid grid-cols-1 sm:grid-cols-3 gap-space-4 shrink-0">
 
 {/* 1. Seat Allocation card */}
 <div className="bg-card border border-[hsl(var(--foreground)/0.06)] radius-xl p-space-5 soft- flex justify-between items-center transition-all duration-300 hover:scale-[1.01] hover:border-[hsl(var(--primary)/0.2)]">
 <div className="space-y-space-1.5 flex-1 min-w-0">
 <span className="text-caption font-semibold uppercase tracking-wider text-muted-foreground/60 block">Plan Seats</span>
 <div className="flex items-baseline gap-space-1 mt-space-1">
 <span className="text-title-lg font-semibold text-foreground tracking-tight">{usedSeats}</span>
 <span className="text-caption text-muted-foreground">/ {maxSeats} used</span>
 </div>
 <div className="w-full bg-[hsl(var(--foreground)/0.06)] h-1.5 rounded-full overflow-hidden mt-space-2">
 <div
                className="h-full bg-primary transition-all duration-500 rounded-full"
                style={{ width: `${seatProgress}%` }} />
              
 </div>
 <span className="text-caption text-muted-foreground/80 block mt-space-2">
 {remainingSeats} seats available in plan
 </span>
 </div>
 <div className="h-10 w-10 rounded-full bg-primary/10 text-primary flex items-center justify-center shrink-0 ring-1 ring-primary/15 ml-space-3">
 <Users className="h-4.5 w-4.5" />
 </div>
 </div>

 {/* 2. Active Operators overview */}
 <div className="bg-card border border-[hsl(var(--foreground)/0.06)] radius-xl p-space-5 soft- flex justify-between items-center transition-all duration-300 hover:scale-[1.01] hover:border-[hsl(var(--primary)/0.2)]">
 <div className="space-y-space-1 flex-1 min-w-0">
 <span className="text-caption font-semibold uppercase tracking-wider text-muted-foreground/60 block">Active Status</span>
 <span className="text-title-lg font-semibold text-foreground mt-space-1 block tracking-tight">
 {members.filter((m) => m.status === "active").length} Online
 </span>
 <span className="text-caption text-muted-foreground/80 mt-space-1.5 flex items-center gap-space-1">
 <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse shrink-0" />
 All sessions synced
 </span>
 </div>
 <div className="h-10 w-10 rounded-full bg-emerald-500/10 text-emerald-500 flex items-center justify-center shrink-0 ring-1 ring-emerald-500/15 ml-space-3">
 <ShieldCheck className="h-4.5 w-4.5" />
 </div>
 </div>

 {/* 3. Pending Invites overview */}
 <div className="bg-card border border-[hsl(var(--foreground)/0.06)] radius-xl p-space-5 soft- flex justify-between items-center transition-all duration-300 hover:scale-[1.01] hover:border-[hsl(var(--primary)/0.2)]">
 <div className="space-y-space-1 flex-1 min-w-0">
 <span className="text-caption font-semibold uppercase tracking-wider text-muted-foreground/60 block">Pending Invites</span>
 <span className="text-title-lg font-semibold text-foreground mt-space-1 block tracking-tight">
 {members.filter((m) => m.status === "pending").length} Awaiting
 </span>
 <span className="text-caption text-muted-foreground/80 mt-space-1.5 flex items-center gap-space-1">
 <Sparkles className="h-3.5 w-3.5 text-amber-500/80" /> Invitation link dispatched
 </span>
 </div>
 <div className="h-10 w-10 rounded-full bg-amber-500/10 text-amber-500 flex items-center justify-center shrink-0 ring-1 ring-amber-500/15 ml-space-3">
 <Mail className="h-4.5 w-4.5" />
 </div>
 </div>

 </div>

 {/* Main Content Workspace Members table - identical container structure to ContactsPage */}
 <div className="flex flex-col bg-card border border-[hsl(var(--foreground)/0.06)] radius-xl overflow-hidden soft- relative z-10 w-full">
 
 {/* Table Filters/Search bar matching Contacts directory styling */}
 <div className="p-space-3 border-b border-[hsl(var(--foreground)/0.06)] bg-[hsl(var(--foreground)/0.005)] flex flex-col sm:flex-row justify-between items-center gap-space-3 shrink-0">
 <div className="relative w-full sm:w-72">
 <Search className="absolute left-space-3 top-space-2.5 h-4 w-4 text-muted-foreground/50" />
 <Input
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search members by name or email..."
              className="pl-space-9 bg-background text-caption h-8.5 border-[hsl(var(--foreground)/0.08)] focus-visible:ring-primary/20" />
            
 </div>

 <ScrollArea className="flex gap-space-1.5 w-full sm:w-auto pb-space-1 sm:pb-space-0" vertical={false}>
                   {[
                              { id: "all", label: `All (${members.length})` },
                              { id: "owner", label: `Owners (${members.filter((m) => m.role === "owner").length})` },
                              { id: "manager", label: `Managers (${members.filter((m) => m.role === "manager").length})` },
                              { id: "staff", label: `Staff (${members.filter((m) => m.role === "staff").length})` },
                              { id: "pending", label: `Pending (${members.filter((m) => m.status === "pending").length})` }].
                              map((pill) =>
                              <Button key={pill.id} onClick={() => setRoleFilter(pill.id)}
                              className={cn(
                                "px-space-2.5 py-space-1 text-caption font-normal uppercase tracking-wider rounded-full border cursor-pointer transition-all shrink-0",
                                roleFilter === pill.id ?
                                "bg-primary border-primary text-primary-foreground" :
                                "bg-background border-[hsl(var(--foreground)/0.08)] text-muted-foreground hover:text-foreground hover:bg-secondary/20"
                              )}>
                                
                   {pill.label}
                   </Button>
                              )}
                   </ScrollArea>
 </div>

 {/* Members Table */}
 <ScrollArea className="w-full bg-[hsl(var(--foreground)/0.002)]" vertical={false}>
               <NativeTable className="w-full text-left text-caption divide-y divide-[hsl(var(--foreground)/0.06)]">
               <thead className="bg-[hsl(var(--foreground)/0.015)] uppercase text-caption font-semibold text-muted-foreground/55 tracking-wider sticky top-space-0 z-10 border-b border-[hsl(var(--foreground)/0.06)]">
               <tr>
               <th className="p-space-3.5 pl-space-6">Member</th>
               <th className="p-space-3.5">Access Role</th>
               <th className="p-space-3.5">Status</th>
               <th className="p-space-3.5">Joined/Invited</th>
               <th className="p-space-3.5 text-right pr-space-6">Actions</th>
               </tr>
               </thead>
               <tbody className="divide-y divide-[hsl(var(--foreground)/0.04)]">
               {filteredMembers.length === 0 ?
                            <tr>
               <td colSpan={5} className="p-space-8 text-center text-muted-foreground/60 italic text-caption">
               No workspace members found matching current filters.
               </td>
               </tr> :

                            filteredMembers.map((member) => {
                              const RoleIcon = getRoleIcon(member.role);
                              const roleGradient = getRoleGradient(member.role);

                              return (
                                <tr key={member.id} className="hover:bg-[hsl(var(--foreground)/0.01)] transition-colors duration-150">
               
               {/* 1. Member Information (Avatar, Name, Email) */}
               <td className="p-space-3.5 pl-space-6">
               <div className="flex items-center gap-space-3">
               <div className="relative shrink-0">
               <div className={cn(
                                          "flex h-8.5 w-8.5 items-center justify-center rounded-full text-white font-bold text-caption bg-gradient-to-tr",
                                          roleGradient
                                        )}>
               {member.name.split("").map((w) => w.charAt(0)).join("").substring(0, 2).toUpperCase()}
               </div>
               <span
                                          className={cn(
                                            "absolute -bottom-space-0.5 -right-space-0.5 h-2.5 w-2.5 rounded-full border border-card",
                                            member.status === "active" ? "bg-emerald-500" : "bg-amber-500 animate-pulse"
                                          )} />
                                        
               </div>
               <div className="flex flex-col min-w-0">
               <span className="text-caption font-semibold text-foreground leading-snug truncate">
               {member.name}
               </span>
               <span className="text-caption text-muted-foreground/80 mt-space-0.5 flex items-center gap-space-1.5 truncate">
               <Mail className="h-3 w-3 text-muted-foreground/50 shrink-0" />
               {member.email}
               </span>
               </div>
               </div>
               </td>

               {/* 2. Access Role Badging */}
               <td className="p-space-3.5">
               <span
                                      className={cn(
                                        "inline-flex items-center gap-space-1.5 rounded-full border px-space-2.5 py-space-0.5 text-caption font-normal uppercase tracking-wider",
                                        getRoleBadgeClass(member.role)
                                      )}>
                                      
               <RoleIcon className="h-2.5 w-2.5 shrink-0" />
               {member.role}
               </span>
               </td>

               {/* 3. Status Badging */}
               <td className="p-space-3.5">
               <span
                                      className={cn(
                                        "inline-flex text-caption font-normal border px-space-2 py-space-0.5 rounded-full uppercase tracking-wider",
                                        member.status === "active" ?
                                        "bg-emerald-500/8 border-emerald-500/15 text-emerald-500" :
                                        "bg-amber-500/8 border-amber-500/15 text-amber-500 animate-pulse"
                                      )}>
                                      
               {member.status}
               </span>
               </td>

               {/* 4. Access Timeline */}
               <td className="p-space-3.5">
               <span className="text-caption text-muted-foreground/80 flex items-center gap-space-1.5">
               <Calendar className="h-3.5 w-3.5 text-muted-foreground/45 shrink-0" />
               {member.status === "active" ? "Joined" : "Invited"} {member.joinedAt}
               </span>
               </td>

               {/* 5. Item Actions */}
               <td className="p-space-3.5 text-right pr-space-6">
               <div className="flex justify-end items-center">
               {member.role === "owner" ?
                                      <span
                                        title="Owner profile cannot be modified"
                                        className="h-7 w-7 rounded-full flex items-center justify-center text-muted-foreground/30 cursor-not-allowed">
                                        
               <Lock className="h-3.5 w-3.5" />
               </span> :

                                      <Button onClick={() => handleRevoke(member.id, member.name)}
                                      title={member.status === "pending" ? "Revoke Invitation" : "Remove Member"}
                                      className="h-7 w-7 rounded-full flex items-center justify-center border border-[hsl(var(--foreground)/0.08)] bg-transparent hover:bg-rose-500/8 hover:border-rose-500/15 hover:text-rose-500 text-muted-foreground/75 transition-all cursor-pointer">
                                        
               <UserMinus className="h-3 w-3" />
               </Button>
                                      }
               </div>
               </td>

               </tr>);

                            })
                            }
               </tbody>
               </NativeTable>
               </ScrollArea>
 </div>

 {/* 6. High-fidelity Dialog Modal overlay for inviting operators */}
 <Dialog open={showInviteForm} onOpenChange={setShowInviteForm}>
 <DialogContent className="max-w-md bg-card border border-[hsl(var(--foreground)/0.08)] p-space-0 overflow-hidden">
 
 <div className="px-space-5 pt-space-5 pb-space-4 border-b border-[hsl(var(--foreground)/0.05)]">
 <div className="flex items-center gap-space-2.5">
 <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
 <UserPlus className="h-4 w-4 text-primary" />
 </div>
 <div>
 <DialogTitle className="text-body-sm font-semibold text-foreground">
 Send Email Invitation
 </DialogTitle>
 <DialogDescription className="text-caption text-muted-foreground/55 mt-space-0.5">
 Provide credentials and access tier details to dispatch an invitation link.
 </DialogDescription>
 </div>
 </div>
 </div>

 <form onSubmit={handleInviteSubmit} className="px-space-5 pb-space-5 pt-space-4 space-y-space-4">
 
 <div className="space-y-space-1.5">
 <Label htmlFor="invite-name" className="text-caption uppercase tracking-wider font-semibold text-muted-foreground/55">Full Name</Label>
 <Input
                id="invite-name"
                type="text"
                required
                placeholder="e.g. Sarah Connor"
                value={inviteName}
                onChange={(e) => setInviteName(e.target.value)}
                className="h-9.5 text-caption bg-background border-[hsl(var(--foreground)/0.08)] focus-visible:ring-primary/20" />
              
 </div>

 <div className="space-y-space-1.5">
 <Label htmlFor="invite-email" className="text-caption uppercase tracking-wider font-semibold text-muted-foreground/55">Email Address</Label>
 <Input
                id="invite-email"
                type="email"
                required
                placeholder="sarah@operator.ai"
                value={inviteEmail}
                onChange={(e) => setInviteEmail(e.target.value)}
                className="h-9.5 text-caption bg-background border-[hsl(var(--foreground)/0.08)] focus-visible:ring-primary/20" />
              
 </div>

 {/* Access Role cards */}
 <div className="space-y-space-2">
 <span className="text-caption uppercase tracking-wider font-semibold text-muted-foreground/55 block">Access Authorization Tier</span>
 <div className="space-y-space-2">
 
 {/* Staff Tile */}
 <div
                  onClick={() => setInviteRole("staff")}
                  className={cn(
                    "border p-space-3 radius-lg flex items-start gap-space-2.5 transition-all duration-200 cursor-pointer select-none relative group",
                    inviteRole === "staff" ?
                    "border-primary bg-primary/5" :
                    "border-[hsl(var(--foreground)/0.06)] bg-secondary/10 hover:bg-secondary/15 hover:border-border"
                  )} tabIndex={0} onKeyDown={() => {}}>
                  
 <div className={cn(
                    "h-7 w-7 rounded-full flex items-center justify-center border transition-all duration-200 shrink-0",
                    inviteRole === "staff" ?
                    "bg-primary/10 border-primary/20 text-primary" :
                    "bg-neutral-500/10 border-neutral-500/25 text-muted-foreground"
                  )}>
 <Shield className="h-3.5 w-3.5" />
 </div>
 <div className="text-left">
 <span className="text-caption font-semibold text-foreground block">Staff Member</span>
 <span className="text-caption text-muted-foreground/80 mt-space-0.5 block leading-normal">
 Can answer incoming call queries and reply to live chat messages.
 </span>
 </div>
 </div>

 {/* Manager Tile */}
 <div
                  onClick={() => setInviteRole("manager")}
                  className={cn(
                    "border p-space-3 radius-lg flex items-start gap-space-2.5 transition-all duration-200 cursor-pointer select-none relative group",
                    inviteRole === "manager" ?
                    "border-emerald-500 bg-emerald-500/5" :
                    "border-[hsl(var(--foreground)/0.06)] bg-secondary/10 hover:bg-secondary/15 hover:border-border"
                  )} tabIndex={0} onKeyDown={() => {}}>
                  
 <div className={cn(
                    "h-7 w-7 rounded-full flex items-center justify-center border transition-all duration-200 shrink-0",
                    inviteRole === "manager" ?
                    "bg-emerald-500/10 border-emerald-500/20 text-emerald-500" :
                    "bg-neutral-500/10 border-neutral-500/25 text-muted-foreground"
                  )}>
 <ShieldCheck className="h-3.5 w-3.5" />
 </div>
 <div className="text-left">
 <span className="text-caption font-semibold text-foreground block">Office Manager</span>
 <span className="text-caption text-muted-foreground/80 mt-space-0.5 block leading-normal">
 Can edit services list, config FAQs, edit flows, and assign staff.
 </span>
 </div>
 </div>

 {/* Admin Tile */}
 <div
                  onClick={() => setInviteRole("admin")}
                  className={cn(
                    "border p-space-3 radius-lg flex items-start gap-space-2.5 transition-all duration-200 cursor-pointer select-none relative group",
                    inviteRole === "admin" ?
                    "border-rose-500 bg-rose-500/5" :
                    "border-[hsl(var(--foreground)/0.06)] bg-secondary/10 hover:bg-secondary/15 hover:border-border"
                  )} tabIndex={0} onKeyDown={() => {}}>
                  
 <div className={cn(
                    "h-7 w-7 rounded-full flex items-center justify-center border transition-all duration-200 shrink-0",
                    inviteRole === "admin" ?
                    "bg-rose-500/10 border-rose-500/20 text-rose-500" :
                    "bg-neutral-500/10 border-neutral-500/25 text-muted-foreground"
                  )}>
 <ShieldAlert className="h-3.5 w-3.5" />
 </div>
 <div className="text-left">
 <span className="text-caption font-semibold text-foreground block">System Admin</span>
 <span className="text-caption text-muted-foreground/80 mt-space-0.5 block leading-normal">
 Full access permissions, including team rosters and billing.
 </span>
 </div>
 </div>

 </div>
 </div>

 {/* Form footer */}
 <div className="flex gap-space-2 justify-end border-t border-[hsl(var(--foreground)/0.05)] pt-space-4">
 <Button type="button" variant="outline" size="sm" onClick={() => setShowInviteForm(false)}
              className="h-8.5 text-caption ">
                
 Cancel
 </Button>
 <Button type="submit" size="sm" disabled={inviting} className="min-w-28 text-caption">
 {inviting ?
                <>
 <Loader2 className="h-3 w-3 animate-spin mr-space-1.5" /> Sending...
 </> :

                "Send Invitation"
                }
 </Button>
 </div>
 
 </form>
 
 </DialogContent>
 </Dialog>

 </div>);

}