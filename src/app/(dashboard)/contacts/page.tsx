"use client";

import { useState, useEffect } from "react";
import { getContactsAction, updateContactAction } from "@/server/actions/omnichannel";
import {
 User,
 Search,
 Plus,
 Tag,
 DollarSign,
 TrendingUp,
 MessageSquare,
 Trash2,
 Edit2,
 Loader2,
 AlertCircle,
 Mail,
 Phone,
 Settings,
 Filter,
 CheckCircle,
 FileText,
} from "lucide-react";
import { Button } from "@/components/shared/button";
import { Input } from "@/components/shared/input";
import { PageTitle } from "@/components/shared/page-title";
import { LoadingState } from "@/components/shared/loading-state";
import { Label } from "@/components/shared/label";
import { cn } from "@/components/shared/utils";
import {
 Select,
 SelectTrigger,
 SelectValue,
 SelectContent,
 SelectItem
} from "@/components/shared/select";
import { ScrollArea } from "@/components/ui/scroll-area";

import { AreaChartCard, DonutChartCard } from "@/components/charts";

export default function ContactsPage() {
 const [loading, setLoading] = useState(true);
 const [contacts, setContacts] = useState<any[]>([]);
 const [searchQuery, setSearchQuery] = useState("");
 const [statusFilter, setStatusFilter] = useState("all");
 const [editingContact, setEditingContact] = useState<any | null>(null);
 const [errorMsg, setErrorMsg] = useState("");

 // Edit state fields
 const [editName, setEditName] = useState("");
 const [editEmail, setEditEmail] = useState("");
 const [editPhone, setEditPhone] = useState("");
 const [editStatus, setEditStatus] = useState("New");
 const [editNotes, setEditNotes] = useState("");
 const [editTags, setEditTags] = useState("");
 const [editLtv, setEditLtv] = useState(0);
 const [savingEdit, setSavingEdit] = useState(false);

 const loadContacts = async () => {
 try {
 setLoading(true);
 const res = await getContactsAction();
 if (res.success && res.contacts) {
 setContacts(res.contacts);
 if (res.contacts.length > 0 && !editingContact) {
 handleEditClick(res.contacts[0]);
 }
 } else {
 setErrorMsg(res.error || "Failed to load contacts directory.");
 }
 } catch (e: any) {
 setErrorMsg(e.message || "An unexpected error occurred");
 } finally {
 setLoading(false);
 }
 };

 useEffect(() => {
 loadContacts();
 }, []);

 const handleEditClick = (contact: any) => {
 setEditingContact(contact);
 setEditName(contact.name || "");
 setEditEmail(contact.email || "");
 setEditPhone(contact.phone || "");
 setEditStatus(contact.status || "New");
 setEditNotes(contact.notes || "");
 setEditTags(contact.tags ? contact.tags.join(",") : "");
 setEditLtv(contact.lifetimeValue || 0);
 };

 const handleSaveEdit = async (e: React.FormEvent) => {
 e.preventDefault();
 if (!editingContact) return;

 try {
 setSavingEdit(true);
 const res = await updateContactAction({
 id: editingContact.id,
 name: editName,
 email: editEmail,
 phone: editPhone,
 status: editStatus,
 notes: editNotes,
 lifetimeValue: editLtv,
 tags: editTags.split(",").map((t) => t.trim()).filter(Boolean)
 });

 if (res.success) {
 setEditingContact(null);
 await loadContacts();
 } else {
 setErrorMsg(res.error || "Failed to update contact profile.");
 }
 } catch (err: any) {
 setErrorMsg(err.message || "Failed to save contact profile.");
 } finally {
 setSavingEdit(false);
 }
 };

 // Filter contacts
 const filteredContacts = contacts.filter((c) => {
 const nameMatch = c.name?.toLowerCase().includes(searchQuery.toLowerCase());
 const emailMatch = c.email?.toLowerCase().includes(searchQuery.toLowerCase());
 const phoneMatch = c.phone?.toLowerCase().includes(searchQuery.toLowerCase());
 const queryMatch = searchQuery ? (nameMatch || emailMatch || phoneMatch) : true;

 const statusMatch = statusFilter === "all" ? true : c.status === statusFilter;

 return queryMatch && statusMatch;
 });

 const getLeadStatusBadge = (status: string) => {
 switch (status) {
 case "New":
 return <span className="badge-status badge-info text-caption px-space-1.5 py-space-0.5 rounded">New</span>;
 case "Qualified":
 return <span className="badge-status badge-success text-caption px-space-1.5 py-space-0.5 rounded">Qualified</span>;
 case "Hot":
 return <span className="badge-status badge-warning text-caption px-space-1.5 py-space-0.5 rounded">Hot</span>;
 case "Booked":
 return <span className="badge-status badge-primary text-caption px-space-1.5 py-space-0.5 rounded">Booked</span>;
 case "Escalated":
 return <span className="badge-status badge-error text-caption px-space-1.5 py-space-0.5 rounded">Escalated</span>;
 case "Closed":
 return <span className="badge-status badge-neutral text-caption px-space-1.5 py-space-0.5 rounded">Closed</span>;
 default:
 return <span className="badge-status badge-neutral text-caption px-space-1.5 py-space-0.5 rounded">{status}</span>;
 }
 };

 const getInitials = (name: string) => {
 if (!name) return "CT";
 const parts = name.trim().split(/\s+/);
 if (parts.length >= 2 && parts[0] && parts[1]) {
 return (parts[0][0] + parts[1][0]).toUpperCase();
 }
 return name.slice(0, 2).toUpperCase();
 };

 const getAvatarGradient = (name: string) => {
 const hash = name.split("").reduce((acc, char) => acc + char.charCodeAt(0), 0);
 const gradients = [
 "from-indigo-500 to-purple-500",
 "from-blue-500 to-cyan-500",
 "from-purple-500 to-pink-500",
 "from-emerald-500 to-teal-500",
 "from-amber-500 to-orange-500",
 ];
 return gradients[hash % gradients.length];
 };

 return (
 <div className="space-y-space-4 animate-fade-in w-full pb-space-8">
 {/* Header */}
 <PageTitle
 title="Contacts"
 description="Everyone who's contacted your business. View conversations, booking history, and notes."
 />

 <div className="grid grid-cols-1 lg:grid-cols-2 gap-space-4 shrink-0">
 <div className="bg-card border border-border-default radius-xl overflow-hidden flex flex-col">
 <div className="p-space-5 pb-space-2 shrink-0">
 <h3 className="text-body-sm font-semibold">Lead Source Distribution</h3>
 <p className="text-caption text-muted-foreground">Where your contacts are coming from</p>
 </div>
 <div className="flex-1 p-space-5 pt-0">
 <DonutChartCard 
 data={[
 { source: "Organic Search", count: 124 },
 { source: "Paid Ads", count: 85 },
 { source: "Referral", count: 42 },
 { source: "Social Media", count: 35 },
 { source: "Direct", count: 28 }
 ]}
 index="source"
 category="count"
 variant="pie"
 height={220}
 />
 </div>
 </div>

 <div className="bg-card border border-border-default radius-xl overflow-hidden flex flex-col">
 <div className="p-space-5 pb-space-2 shrink-0">
 <h3 className="text-body-sm font-semibold">Contacts Growth</h3>
 <p className="text-caption text-muted-foreground">New contacts added over time</p>
 </div>
 <div className="flex-1 p-space-5 pt-0">
 <AreaChartCard 
 data={[
 { date: "Jan", contacts: 12 },
 { date: "Feb", contacts: 25 },
 { date: "Mar", contacts: 45 },
 { date: "Apr", contacts: 78 },
 { date: "May", contacts: 112 },
 { date: "Jun", contacts: 156 },
 { date: "Jul", contacts: 210 }
 ]}
 index="date"
 categories={["contacts"]}
 colors={["#3b82f6"]}
 height={220}
 />
 </div>
 </div>
 </div>

 {errorMsg && (
 <div className="flex items-center gap-space-2 radius-lg bg-state-error-bg border border-state-error-text/15 px-space-4 py-space-2.5 text-caption text-state-error-text shrink-0 animate-fade-in">
 <AlertCircle className="h-4 w-4 shrink-0"/>
 <span className="flex-1 font-medium">{errorMsg}</span>
 <Button className="hover:opacity-70 transition-opacity font-semibold px-space-1 text-body-sm cursor-pointer" onClick={() => setErrorMsg("")}>×</Button>
 </div>
 )}

 {loading ? (
 <LoadingState message="Loading contacts directory"/>
 ) : (
 <div className="flex-1 min-h-[600px] grid grid-cols-1 lg:grid-cols-12 gap-space-4">

 {/* Left Column: Main Directory Table */}
 <div className="lg:col-span-8 flex flex-col h-[600px] bg-card border border-[hsl(var(--foreground)/0.06)] radius-xl overflow-hidden soft-">
 {/* Filters bar */}
 <div className="p-space-3 border-b border-[hsl(var(--foreground)/0.06)] bg-[hsl(var(--foreground)/0.005)] flex flex-col sm:flex-row gap-space-2 shrink-0">
 <div className="relative flex-1">
 <Search className="absolute left-space-3 top-space-2.5 h-4 w-4 text-muted-foreground/50"/>
 <Input
 value={searchQuery}
 onChange={(e) => setSearchQuery(e.target.value)}
 placeholder="Search by name, phone, or email..."
 className="pl-space-9 bg-background text-caption h-8.5 border-[hsl(var(--foreground)/0.08)] focus-visible:ring-primary/20"
 />
 </div>

 <div className="w-full sm:w-48">
 <Select value={statusFilter} onValueChange={setStatusFilter}>
 <SelectTrigger className="bg-background text-caption border-[hsl(var(--foreground)/0.08)] hover:border-[hsl(var(--primary)/0.25)] transition-all h-8.5 radius-md">
 <div className="flex items-center gap-space-1.5 font-medium">
 <Filter className="h-3.5 w-3.5 text-muted-foreground/60 shrink-0"/>
 <SelectValue placeholder="All Classifications"/>
 </div>
 </SelectTrigger>
 <SelectContent>
 <SelectItem value="all" className="text-caption">All Classifications</SelectItem>
 <SelectItem value="New" className="text-caption">New</SelectItem>
 <SelectItem value="Qualified" className="text-caption">Qualified</SelectItem>
 <SelectItem value="Hot" className="text-caption">Hot</SelectItem>
 <SelectItem value="Booked" className="text-caption">Booked</SelectItem>
 <SelectItem value="Escalated" className="text-caption">Escalated</SelectItem>
 <SelectItem value="Closed" className="text-caption">Closed</SelectItem>
 </SelectContent>
 </Select>
 </div>
 </div>

 {/* Contacts Table List */}
 <ScrollArea className="flex-1 bg-[hsl(var(--foreground)/0.002)]" horizontal={false}>
 <table className="w-full text-left text-caption divide-y divide-[hsl(var(--foreground)/0.06)]">
 <thead className="bg-card uppercase text-[11px] font-semibold text-muted-foreground/55 tracking-wider sticky top-0 z-10 border-b border-[hsl(var(--foreground)/0.06)]">
 <tr>
 <th className="p-space-3">Contact</th>
 <th className="p-space-3">Lead Status</th>
 <th className="p-space-3">Score</th>
 <th className="p-space-3">LTV</th>
 <th className="p-space-3 text-center">Conversations</th>
 <th className="p-space-3 text-right">Actions</th>
 </tr>
 </thead>
 <tbody className="divide-y divide-[hsl(var(--foreground)/0.04)]">
 {filteredContacts.length === 0 ? (
 <tr>
 <td colSpan={6} className="p-space-12 text-center">
 <div className="flex flex-col items-center gap-space-3 max-w-xs mx-auto">
 <div className="h-11 w-11 radius-full bg-[hsl(var(--primary)/0.08)] flex items-center justify-center">
 <User className="h-5 w-5 text-primary/60"/>
 </div>
 <div>
 <p className="text-caption font-semibold text-foreground">No contacts yet</p>
 <p className="text-caption text-muted-foreground/70 mt-space-1 leading-relaxed">
 Contacts appear automatically when someone messages Operator AI, books an appointment, or calls your business number.
 </p>
 </div>
 <p className="text-caption text-muted-foreground/50 italic">
 💡 Most businesses see their first contact within 24 hours of going live.
 </p>
 </div>
 </td>
 </tr>
 ) : (
 filteredContacts.map((c) => {
 const isSelected = editingContact && editingContact.id === c.id;
 const initials = getInitials(c.name || "Anonymous Contact");
 const gradient = getAvatarGradient(c.name || "Anonymous Contact");

 return (
 <tr 
 key={c.id} 
 onClick={() => handleEditClick(c)}
 className={cn(
 "cursor-pointer transition-all duration-150 text-caption group",
 isSelected 
 ? "bg-[hsl(var(--primary)/0.04)]"
 : "hover:bg-[hsl(var(--foreground)/0.015)]"
 )}
 >
 <td className="p-space-3">
 <div className="flex items-center gap-space-2.5">
 <div className={`h-8 w-8 radius-full bg-gradient-to-br ${gradient} text-white text-caption font-semibold flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform`}>
 {initials}
 </div>
 <div className="min-w-0">
 <span className="text-caption font-medium text-foreground block truncate">{c.name || "Anonymous Contact"}</span>
 <span className="text-caption text-muted-foreground/75 block truncate mt-space-0.5">{c.phone || c.email || "No handle details"}</span>
 </div>
 </div>
 </td>
 <td className="p-space-3">
 {getLeadStatusBadge(c.status)}
 </td>
 <td className="p-space-3 font-semibold text-primary/80">
 {c.leadScore} pts
 </td>
 <td className="p-space-3 font-semibold text-emerald-500 ">
 ${c.lifetimeValue || 0}
 </td>
 <td className="p-space-3 text-center text-muted-foreground/80">
 <div className="inline-flex items-center justify-center gap-space-1.5">
 <MessageSquare className="h-3.5 w-3.5 text-muted-foreground/40 shrink-0"/>
 <span>{c.conversationCount || 0}</span>
 </div>
 </td>
 <td className="p-space-3 text-right">
 <Button
 variant="ghost"
 size="sm"
 className="h-8 w-8 radius-full hover:bg-[hsl(var(--foreground)/0.055)]"
 onClick={(e) => {
 e.stopPropagation();
 handleEditClick(c);
 }}
 >
 <Edit2 className="h-3.5 w-3.5 text-muted-foreground/60"/>
 </Button>
 </td>
 </tr>
 );
 })
 )}
 </tbody>
 </table>
 </ScrollArea>
 </div>

 {/* Right Column: Edit Drawer Sidebar (Sticky right) */}
 <div className="lg:col-span-4 flex flex-col h-full bg-card border border-[hsl(var(--foreground)/0.06)] radius-xl overflow-hidden soft-">
 {editingContact ? (
 <form onSubmit={handleSaveEdit} className="flex flex-col h-full">
 <div className="p-space-4 border-b border-[hsl(var(--foreground)/0.06)] bg-[hsl(var(--foreground)/0.005)] shrink-0">
 <div className="flex items-center gap-space-2.5">
 <div className={`h-9 w-9 radius-full bg-gradient-to-br ${getAvatarGradient(editingContact.name || "Anonymous Contact")} text-white text-caption font-bold flex items-center justify-center shrink-0`}>
 {getInitials(editingContact.name || "Anonymous Contact")}
 </div>
 <div className="min-w-0">
 <h4 className="text-body-sm font-semibold text-foreground truncate">{editingContact.name || "Anonymous Contact"}</h4>
 <p className="text-caption text-muted-foreground/75 truncate mt-space-0.5">ID: <span className="font-mono">{editingContact.id}</span></p>
 </div>
 </div>
 </div>

 <div className="flex-1 overflow-y-auto p-space-4 space-y-space-4 sidebar-scroll bg-[hsl(var(--foreground)/0.002)]">
 {/* Stats strip */}
 <div className="grid grid-cols-2 gap-space-2 bg-[hsl(var(--foreground)/0.015)] border border-[hsl(var(--foreground)/0.04)] radius-lg p-space-2.5 text-center shrink-0">
 <div className="border-r border-[hsl(var(--foreground)/0.05)]">
 <span className="text-caption font-semibold text-muted-foreground/60 uppercase tracking-wider block">Lead Score</span>
 <span className="text-body-md font-semibold text-primary block mt-space-0.5">{editingContact.leadScore} pts</span>
 </div>
 <div>
 <span className="text-caption font-semibold text-muted-foreground/60 uppercase tracking-wider block">Total LTV</span>
 <span className="text-body-md font-semibold text-emerald-500 block mt-space-0.5">${editingContact.lifetimeValue || 0}</span>
 </div>
 </div>

 <div className="space-y-space-1">
 <Label htmlFor="editName" className="text-caption uppercase tracking-wider font-semibold text-muted-foreground/70">Contact Name</Label>
 <Input
 id="editName"
 value={editName}
 onChange={(e) => setEditName(e.target.value)}
 className="h-9 bg-background text-caption border-[hsl(var(--foreground)/0.08)] focus-visible:ring-primary/20"
 required
 />
 </div>

 <div className="grid grid-cols-1 sm:grid-cols-2 gap-space-3">
 <div className="space-y-space-1">
 <Label htmlFor="editEmail" className="text-caption uppercase tracking-wider font-semibold text-muted-foreground/70">Email Address</Label>
 <Input
 id="editEmail"
 type="email"
 value={editEmail}
 onChange={(e) => setEditEmail(e.target.value)}
 className="h-9 bg-background text-caption border-[hsl(var(--foreground)/0.08)] focus-visible:ring-primary/20"
 />
 </div>
 <div className="space-y-space-1">
 <Label htmlFor="editPhone" className="text-caption uppercase tracking-wider font-semibold text-muted-foreground/70">Phone Number</Label>
 <Input
 id="editPhone"
 value={editPhone}
 onChange={(e) => setEditPhone(e.target.value)}
 className="h-9 bg-background text-caption border-[hsl(var(--foreground)/0.08)] focus-visible:ring-primary/20"
 />
 </div>
 </div>

 <div className="grid grid-cols-1 sm:grid-cols-2 gap-space-3">
 <div className="space-y-space-1">
 <Label htmlFor="editStatus" className="text-caption uppercase tracking-wider font-semibold text-muted-foreground/70">Classification</Label>
 <Select value={editStatus} onValueChange={(val) => setEditStatus(val)}>
 <SelectTrigger className="bg-background text-caption border-[hsl(var(--foreground)/0.08)] hover:border-[hsl(var(--primary)/0.25)] transition-all h-9 radius-md">
 <SelectValue />
 </SelectTrigger>
 <SelectContent>
 <SelectItem value="New" className="text-caption">New</SelectItem>
 <SelectItem value="Qualified" className="text-caption">Qualified</SelectItem>
 <SelectItem value="Hot" className="text-caption">Hot</SelectItem>
 <SelectItem value="Booked" className="text-caption">Booked</SelectItem>
 <SelectItem value="Escalated" className="text-caption">Escalated</SelectItem>
 <SelectItem value="Closed" className="text-caption">Closed</SelectItem>
 </SelectContent>
 </Select>
 </div>
 <div className="space-y-space-1">
 <Label htmlFor="editLtv" className="text-caption uppercase tracking-wider font-semibold text-muted-foreground/70">LTV Value ($)</Label>
 <Input
 id="editLtv"
 type="number"
 value={editLtv}
 onChange={(e) => setEditLtv(parseInt(e.target.value) || 0)}
 className="h-9 bg-background text-caption border-[hsl(var(--foreground)/0.08)] focus-visible:ring-primary/20"
 />
 </div>
 </div>

 <div className="space-y-space-1">
 <Label htmlFor="editTags" className="text-caption uppercase tracking-wider font-semibold text-muted-foreground/70">Tags (comma-separated)</Label>
 <Input
 id="editTags"
 value={editTags}
 onChange={(e) => setEditTags(e.target.value)}
 placeholder="vip, client, active"
 className="h-9 bg-background text-caption border-[hsl(var(--foreground)/0.08)] focus-visible:ring-primary/20"
 />
 </div>

 <div className="space-y-space-1">
 <Label htmlFor="editNotes" className="text-caption uppercase tracking-wider font-semibold text-muted-foreground/70">Internal Staff Notes</Label>
 <textarea
 id="editNotes"
 rows={4}
 value={editNotes}
 onChange={(e) => setEditNotes(e.target.value)}
 className="flex min-h-20 w-full radius-lg border border-[hsl(var(--foreground)/0.08)] bg-background px-space-3 py-space-2 text-caption placeholder:text-muted-foreground/45 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-primary/20 text-foreground leading-normal"
 />
 </div>
 </div>

 <div className="p-space-3 border-t border-[hsl(var(--foreground)/0.06)] bg-background flex gap-space-2 justify-end shrink-0">
 <Button
 type="button"
 variant="outline"
 size="sm"
 onClick={() => setEditingContact(null)}
 className="h-8.5 text-caption font-semibold"
 >
 Cancel
 </Button>
 <Button type="submit" size="sm" className="h-8.5 text-caption font-semibold" disabled={savingEdit}>
 {savingEdit ? (
 <>
 <Loader2 className="h-3 w-3 animate-spin mr-space-1"/>
 <span>Saving...</span>
 </>
 ) : (
 <span>Save Profile</span>
 )}
 </Button>
 </div>
 </form>
 ) : (
 <div className="h-full flex flex-col items-center justify-center p-space-6 text-center text-caption text-muted-foreground gap-space-2.5 py-space-24">
 <div className="h-10 w-10 radius-full bg-[hsl(var(--foreground)/0.03)] border border-[hsl(var(--foreground)/0.06)] flex items-center justify-center text-muted-foreground/30 animate-float">
 <User className="h-4.5 w-4.5"/>
 </div>
 <span className="text-caption font-medium max-w-48 leading-normal text-muted-foreground/70">Select a contact from the directory table to inspect or edit profiles</span>
 </div>
 )}
 </div>

 </div>
 )}
 </div>
 );
}
