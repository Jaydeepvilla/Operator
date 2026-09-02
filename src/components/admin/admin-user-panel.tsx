"use client";;
import * as React from "react";
import {
 Search,
 UserCheck,
 UserX,
 Lock,
 RefreshCw,
 ChevronLeft,
 ChevronRight,
 History,
 FileText,
 X,
 Key,
 ShieldAlert,
 SlidersHorizontal,
 Loader2,
 AlertTriangle,
 Smartphone,
 Eye,
 EyeOff,
 CheckCircle,
 Check,
} from "lucide-react";
import { Button } from "@/components/shared/button";
import { Input } from "@/components/shared/input";
import { Label } from "@/components/shared/label";
import { Badge } from "@/components/shared/badge";
import {
 getAdminUsersAction,
 getAdminUserProfileDetailAction,
 suspendUserAction,
 activateUserAction,
 deleteUserAction,
 restoreUserAction,
 resetUserPasswordAction,
 forceLogoutUserAction,
} from "@/server/actions/admin";
import { useToast } from "@/components/shared/toast";
import { formatUserErrorMessage } from "@/lib/errors";

import { getButtonClasses } from '@/design-system/button-tokens';

export function AdminUserPanel() {
 const [usersList, setUsersList] = React.useState<any[]>([]);
 const [search, setSearch] = React.useState("");
 const [statusFilter, setStatusFilter] = React.useState("all");
 const [page, setPage] = React.useState(1);
 const [totalPages, setTotalPages] = React.useState(1);
 const [totalCount, setTotalCount] = React.useState(0);
 const [loading, setLoading] = React.useState(true);

 // Detail drawer state
 const [selectedUserId, setSelectedUserId] = React.useState<string | null>(null);
 const [userDetail, setUserDetail] = React.useState<any | null>(null);
 const [loadingDetail, setLoadingDetail] = React.useState(false);

 // Admin override password reset form
 const [newOverridePassword, setNewOverridePassword] = React.useState("");
 const [showOverridePw, setShowOverridePw] = React.useState(false);
 const [resettingPassword, setResettingPassword] = React.useState(false);
 const [resetSuccess, setResetSuccess] = React.useState(false);
 const [resetError, setResetError] = React.useState<string | null>(null);

 // Bulk actions loading
 const [actionLoadingId, setActionLoadingId] = React.useState<string | null>(null);
 const toast = useToast();

 // Refresh user list
 const fetchUsers = React.useCallback(async () => {
 setLoading(true);
 try {
 const res = await getAdminUsersAction({
 search: search || undefined,
 status: statusFilter !== "all" ? statusFilter : undefined,
 page,
 limit: 10,
 });

 if (res.success && res.users) {
 setUsersList(res.users);
 setTotalPages(res.pagination?.totalPages || 1);
 setTotalCount(res.pagination?.totalCount || 0);
 } else if (!res.success) {
 toast.error("Failed to load users", formatUserErrorMessage(res.error));
 }
 } catch (e) {
 toast.error("Error", formatUserErrorMessage(e, "An unexpected error occurred loading users."));
 } finally {
 setLoading(false);
 }
 }, [search, statusFilter, page, toast]);

 // Load details
 const fetchDetail = React.useCallback(async (userId: string) => {
 setLoadingDetail(true);
 setResetSuccess(false);
 setResetError(null);
 setNewOverridePassword("");
 try {
 const res = await getAdminUserProfileDetailAction(userId);
 if (res.success && res.data) {
 setUserDetail(res.data);
 } else {
 toast.error("Failed to load user", formatUserErrorMessage(res.error));
 setSelectedUserId(null);
 }
 } catch (e) {
 toast.error("Error", formatUserErrorMessage(e, "Failed to retrieve user profile details."));
 } finally {
 setLoadingDetail(false);
 }
 }, [toast]);

 React.useEffect(() => {
 fetchUsers();
 }, [fetchUsers]);

 React.useEffect(() => {
 if (selectedUserId) {
 fetchDetail(selectedUserId);
 } else {
 setUserDetail(null);
 }
 }, [selectedUserId, fetchDetail]);

 // Handle Search Input Change with local trigger
 const handleSearchSubmit = (e: React.FormEvent) => {
 e.preventDefault();
 setPage(1);
 fetchUsers();
 };

 // Suspension action
 const handleToggleSuspension = async (user: any) => {
 setActionLoadingId(user.id);
 try {
 const isSuspended = user.status === "suspended";
 const res = isSuspended
 ? await activateUserAction(user.id)
 : await suspendUserAction(user.id);

 if (res.success) {
 toast.success(isSuspended ? "User Activated" : "User Suspended", `Account status changed for ${user.email}.`);
 await fetchUsers();
 if (selectedUserId === user.id) {
 await fetchDetail(user.id);
 }
 } else {
 toast.error("Action failed", formatUserErrorMessage(res.error));
 }
 } catch (e) {
 toast.error("Error", formatUserErrorMessage(e, "Failed to update user status."));
 } finally {
 setActionLoadingId(null);
 }
 };

 // Deactivate/Soft Delete action
 const handleToggleDeletion = async (user: any) => {
 setActionLoadingId(user.id);
 try {
 const isDeactivated = user.status === "deactivated";
 const res = isDeactivated
 ? await restoreUserAction(user.id)
 : await deleteUserAction(user.id);

 if (res.success) {
 toast.success(isDeactivated ? "User Restored" : "User Deactivated", `Account status updated.`);
 await fetchUsers();
 if (selectedUserId === user.id) {
 await fetchDetail(user.id);
 }
 } else {
 toast.error("Action failed", formatUserErrorMessage(res.error));
 }
 } catch (e) {
 toast.error("Error", formatUserErrorMessage(e, "Failed to change user deletion state."));
 } finally {
 setActionLoadingId(null);
 }
 };

 // Password Override action
 const handleOverridePassword = async (e: React.FormEvent) => {
 e.preventDefault();
 if (!selectedUserId || !newOverridePassword) return;

 setResettingPassword(true);
 setResetSuccess(false);
 setResetError(null);

 try {
 const res = await resetUserPasswordAction(selectedUserId, newOverridePassword);
 if (res.success) {
 setResetSuccess(true);
 setNewOverridePassword("");
 toast.success("Password Reset", "Admin override password updated successfully.");
 setTimeout(() => setResetSuccess(false), 3000);
 // Refresh details for updated sessions
 await fetchDetail(selectedUserId);
 } else {
 const errorMsg = formatUserErrorMessage(res.error, "Failed to reset password");
 setResetError(errorMsg);
 toast.error("Password Reset Failed", errorMsg);
 }
 } catch (err: any) {
 const errorMsg = formatUserErrorMessage(err, "An unexpected error occurred");
 setResetError(errorMsg);
 toast.error("Password Reset Failed", errorMsg);
 } finally {
 setResettingPassword(false);
 }
 };

 // Force Logout
 const handleForceLogout = async (userId: string) => {
 if (!confirm("Are you sure you want to terminate all active sessions for this user?")) return;
 try {
 const res = await forceLogoutUserAction(userId);
 if (res.success) {
 toast.success("Sessions Terminated", "User has been logged out from all active devices.");
 if (selectedUserId === userId) {
 await fetchDetail(userId);
 }
 } else {
 toast.error("Failed to force logout", formatUserErrorMessage(res.error));
 }
 } catch (e) {
 toast.error("Error", formatUserErrorMessage(e, "Failed to terminate active sessions."));
 }
 };

 const getStatusBadge = (status: string) => {
 switch (status) {
 case "active":
 return (
 <Badge className="bg-emerald-500/10 text-emerald-400 border-emerald-500/20 text-[10px] font-bold uppercase tracking-wider px-2 py-0.5">
 Active
 </Badge>
 );
 case "suspended":
 return (
 <Badge className="bg-amber-500/10 text-amber-400 border-amber-500/20 text-[10px] font-bold uppercase tracking-wider px-2 py-0.5">
 Suspended
 </Badge>
 );
 case "deactivated":
 return (
 <Badge className="bg-rose-500/10 text-rose-400 border-rose-500/20 text-[10px] font-bold uppercase tracking-wider px-2 py-0.5">
 Deactivated
 </Badge>
 );
 default:
 return (
 <Badge className="bg-slate-500/10 text-slate-400 border-slate-500/20 text-[10px] font-bold uppercase tracking-wider px-2 py-0.5">
 {status}
 </Badge>
 );
 }
 };

 return (
 <div className="space-y-6 relative">
 {/* Search & Filters */}
 <div className="flex flex-col sm:flex-row gap-4 justify-between items-center bg-[#0d0c18]/45 border-white/5 p-4 rounded-2xl backdrop-blur-md">
 <form onSubmit={handleSearchSubmit} className="flex gap-2 w-full sm:max-w-md">
 <div className="relative flex-1">
 <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-500" />
 <Input
 type="text"
 value={search}
 onChange={(e) => setSearch(e.target.value)}
 placeholder="Search user by name or email..."
 className="pl-9 bg-slate-950/40 border-slate-800 focus:border-violet-500/50 outline-none"
 />
 </div>
 <Button type="submit" className="bg-violet-600 hover:bg-violet-500 px-4">
 Search
 </Button>
 </form>

 <div className="flex gap-2 w-full sm:w-auto shrink-0 justify-end">
 <div className="flex items-center gap-2 text-xs font-semibold text-slate-400 shrink-0">
 <SlidersHorizontal className="h-4 w-4" /> Filter Status:
 </div>
 <select
 value={statusFilter}
 onChange={(e) => {
 setStatusFilter(e.target.value);
 setPage(1);
 }}
 className="bg-slate-950/40 border-slate-800 text-xs font-semibold text-slate-300 rounded-xl px-3 py-2 outline-none focus:border-violet-500/50 cursor-pointer"
 >
 <option value="all">All statuses</option>
 <option value="active">Active only</option>
 <option value="suspended">Suspended only</option>
 <option value="deactivated">Deactivated only</option>
 </select>
 </div>
 </div>
 {/* Users table */}
 <div className="bg-[#0d0c18]/30 border-white/5 rounded-2xl overflow-hidden backdrop-blur-md">
 {loading ? (
 <div className="flex flex-col justify-center items-center py-20 gap-3">
 <Loader2 className="h-8 w-8 text-violet-400 animate-spin" />
 <p className="text-xs text-slate-400">Loading user database directory...</p>
 </div>
 ) : usersList.length === 0 ? (
 <div className="flex flex-col justify-center items-center py-20 text-center px-4">
 <UserX className="h-10 w-10 text-slate-600 mb-3" />
 <h3 className="text-sm font-bold text-white">No users found</h3>
 <p className="text-xs text-slate-400 mt-1 max-w-xs">
 No matching workspace members match your query filters. Try adjusting your parameters.
 </p>
 </div>
 ) : (
 <div className="overflow-x-auto">
 <table className="w-full text-left border-collapse text-xs">
 <thead>
 <tr className="border-b border-white/5 bg-white/[0.01]">
 <th className="p-4 font-bold text-slate-400 uppercase tracking-wider text-[10px]">User Details</th>
 <th className="p-4 font-bold text-slate-400 uppercase tracking-wider text-[10px]">Status</th>
 <th className="p-4 font-bold text-slate-400 uppercase tracking-wider text-[10px]">Organization Role</th>
 <th className="p-4 font-bold text-slate-400 uppercase tracking-wider text-[10px]">Created Date</th>
 <th className="p-4 font-bold text-slate-400 uppercase tracking-wider text-[10px] text-right">Actions</th>
 </tr>
 </thead>
 <tbody className="divide-y divide-white/5">
 {usersList.map((user) => (
 <tr
 key={user.id}
 onClick={() => setSelectedUserId(user.id)}
 className="hover:bg-white/[0.01] transition-colors cursor-pointer group"
 >
 <td className="p-4">
 <div className="flex gap-3 items-center">
 <div className="h-9 w-9 rounded-xl bg-violet-600/10 border-violet-500/20 flex items-center justify-center text-violet-400 font-bold uppercase shrink-0">
 {user.avatar ? (
 // eslint-disable-next-line @next/next/no-img-element
 (<img src={user.avatar} alt="Avatar" className="h-full w-full object-cover rounded-xl" />)
 ) : (
 user.name ? user.name.charAt(0) : "U"
 )}
 </div>
 <div>
 <div className="font-semibold text-white group-hover:text-violet-400 transition-colors">
 {user.name || "Unnamed User"}
 </div>
 <div className="text-[10px] text-slate-400 mt-0.5">{user.email}</div>
 </div>
 </div>
 </td>
 <td className="p-4">{getStatusBadge(user.status)}</td>
 <td className="p-4">
 <span className="font-semibold text-slate-300 capitalize">{user.role}</span>
 </td>
 <td className="p-4 text-slate-400">
 {new Date(user.createdAt).toLocaleDateString()}
 </td>
 <td className="p-4 text-right" onClick={(e) => e.stopPropagation()}>
 <div className="flex justify-end gap-1.5">
 {/* Suspend / Activate button */}
 <button
 onClick={() => handleToggleSuspension(user)}
 disabled={actionLoadingId === user.id}
 title={user.status === "suspended" ? "Unsuspend User" : "Suspend User"}
 className={getButtonClasses(
 'primary',
 'filled',
 'medium',
 `p-2 border transition-all duration-300 ${user.status === "suspended"
 ? "bg-amber-500/10 text-amber-400 border-amber-500/25 hover:bg-amber-500/20"
 : "bg-slate-900 text-slate-400 border-white/5 hover:text-amber-400 hover:border-amber-500/20"}`
 )}
 >
 {actionLoadingId === user.id ? (
 <Loader2 className="h-3.5 w-3.5 animate-spin" />
 ) : (
 <ShieldAlert className="h-3.5 w-3.5" />
 )}
 </button>

 {/* Soft Delete / Restore button */}
 <button
 onClick={() => handleToggleDeletion(user)}
 disabled={actionLoadingId === user.id}
 title={user.status === "deactivated" ? "Restore User Profile" : "Soft Delete User"}
 className={getButtonClasses(
 'primary',
 'filled',
 'medium',
 `p-2 border transition-all duration-300 ${user.status === "deactivated"
 ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/25 hover:bg-emerald-500/20"
 : "bg-slate-900 text-slate-400 border-white/5 hover:text-rose-400 hover:border-rose-500/20"}`
 )}
 >
 {actionLoadingId === user.id ? (
 <Loader2 className="h-3.5 w-3.5 animate-spin" />
 ) : (
 <UserX className="h-3.5 w-3.5" />
 )}
 </button>
 </div>
 </td>
 </tr>
 ))}
 </tbody>
 </table>
 </div>
 )}

 {/* Pagination Bar */}
 {totalPages > 1 && (
 <div className="flex items-center justify-between p-4 border-t border-white/5 text-slate-400">
 <span className="text-[11px]">
 Total Users: <strong>{totalCount}</strong> • Page <strong>{page}</strong> of <strong>{totalPages}</strong>
 </span>
 <div className="flex gap-2">
 <Button
 onClick={() => setPage((p) => Math.max(1, p - 1))}
 disabled={page === 1}
 className="bg-slate-900 hover:bg-slate-800 border-white/5 text-xs py-1.5 px-3 flex items-center gap-1"
 >
 <ChevronLeft className="h-3.5 w-3.5" /> Prev
 </Button>
 <Button
 onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
 disabled={page === totalPages}
 className="bg-slate-900 hover:bg-slate-800 border-white/5 text-xs py-1.5 px-3 flex items-center gap-1"
 >
 Next <ChevronRight className="h-3.5 w-3.5" />
 </Button>
 </div>
 </div>
 )}
 </div>
 {/* ─── USER DETAILS DRAWER (SLIDE OVER) ─── */}
 {selectedUserId && (
 <div className="fixed inset-0 z-50 overflow-hidden bg-black/40 backdrop-blur-sm flex justify-end">
 <div 
 role="dialog"
 aria-modal="true"
 className="w-full max-w-xl bg-[#090812] border-l border-white/5 h-full flex flex-col shadow-2xl relative animate-slide-in"
 >
 {/* Header */}
 <div className="p-6 border-b border-white/5 flex items-center justify-between bg-white/[0.01]">
 <div className="flex items-center gap-3">
 <div className="p-2 bg-violet-600/10 border-violet-500/20 text-violet-400 rounded-xl">
 <SlidersHorizontal className="h-5 w-5" />
 </div>
 <div>
 <h3 className="text-sm font-bold text-white">Administrative Portal</h3>
 <p className="text-[10px] text-slate-400">Manage logs, active device sessions, and overrides.</p>
 </div>
 </div>
 <button
 onClick={() => setSelectedUserId(null)}
 className={getButtonClasses(
 'secondary',
 'filled',
 'medium',
 'p-1.5 hover: border-transparent hover:/5 text-slate-400 hover: transition-all duration-300'
 )}
 >
 <X className="h-4.5 w-4.5" />
 </button>
 </div>

 {/* Scrollable details panel */}
 <div className="flex-1 overflow-y-auto p-6 space-y-8 max-h-[calc(100vh-140px)]">
 {loadingDetail ? (
 <div className="flex flex-col justify-center items-center py-20 gap-3">
 <Loader2 className="h-6 w-6 text-violet-400 animate-spin" />
 <p className="text-xs text-slate-500">Querying user logs...</p>
 </div>
 ) : userDetail ? (
 <>
 {/* Quick Profile Bio Card */}
 <div className="flex gap-4 items-start bg-slate-950/20 border-slate-900 p-5 rounded-2xl">
 <div className="h-12 w-12 rounded-xl bg-violet-600/10 border-violet-500/20 flex items-center justify-center text-violet-400 font-bold uppercase text-lg shrink-0">
 {userDetail.user.avatar ? (
 // eslint-disable-next-line @next/next/no-img-element
 (<img src={userDetail.user.avatar} alt="Avatar" className="h-full w-full object-cover rounded-xl" />)
 ) : (
 userDetail.user.name ? userDetail.user.name.charAt(0) : "U"
 )}
 </div>
 <div className="flex-1">
 <div className="flex items-center gap-2">
 <h4 className="text-sm font-bold text-white">{userDetail.user.name}</h4>
 {getStatusBadge(userDetail.user.status)}
 </div>
 <p className="text-[10px] text-slate-400 mt-0.5">{userDetail.user.email}</p>
 <div className="flex gap-1.5 mt-2 flex-wrap">
 <Badge className="bg-white/5 border-white/10 text-slate-300 text-[9px] capitalize px-2 py-0.5">
 Role: {userDetail.user.role}
 </Badge>
 <Badge className="bg-white/5 border-white/10 text-slate-300 text-[9px] px-2 py-0.5">
 ID: {userDetail.user.id}
 </Badge>
 </div>
 </div>
 </div>

 {/* Account Actions Box */}
 <div className="space-y-3">
 <h5 className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Quick Profile Controls</h5>
 <div className="grid grid-cols-2 gap-3">
 <Button
 onClick={() => handleToggleSuspension(userDetail.user)}
 className={`text-xs py-2.5 rounded-xl border flex items-center justify-center gap-1.5 ${
 userDetail.user.status === "suspended"
 ? "bg-amber-500/15 hover:bg-amber-500/25 text-amber-300 border-amber-500/20"
 : "bg-slate-900 hover:bg-slate-800 text-slate-300 border-white/5"
 }`}
 >
 <ShieldAlert className="h-3.5 w-3.5" />
 {userDetail.user.status === "suspended" ? "Unsuspend account" : "Suspend account"}
 </Button>

 <Button
 onClick={() => handleToggleDeletion(userDetail.user)}
 className={`text-xs py-2.5 rounded-xl border flex items-center justify-center gap-1.5 ${
 userDetail.user.status === "deactivated"
 ? "bg-emerald-500/15 hover:bg-emerald-500/25 text-emerald-300 border-emerald-500/20"
 : "bg-rose-500/10 hover:bg-rose-500/15 text-rose-300 border-rose-500/20"
 }`}
 >
 <UserX className="h-3.5 w-3.5" />
 {userDetail.user.status === "deactivated" ? "Restore profile" : "Deactivate profile"}
 </Button>
 </div>
 </div>

 {/* Active sessions check */}
 <div className="space-y-3">
 <div className="flex justify-between items-center">
 <h5 className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Active Device Connections</h5>
 {userDetail.sessions.length > 0 && (
 <button
 onClick={() => handleForceLogout(userDetail.user.id)}
 className={getButtonClasses(
 'primary',
 'filled',
 'medium',
 'text-[10px] text-rose-400 transition-colors'
 )}
 >
 Revoke All Sessions
 </button>
 )}
 </div>

 {userDetail.sessions.length === 0 ? (
 <p className="text-[10px] text-slate-500 italic p-3 border-white/5 rounded-xl text-center">
 No active logins or open sessions registered.
 </p>
 ) : (
 <div className="divide-y divide-white/5 border-white/5 rounded-xl bg-slate-950/15">
 {userDetail.sessions.map((session: any) => (
 <div key={session.id} className="flex justify-between items-center p-3 text-[10px]">
 <div className="flex gap-2.5 items-center">
 <Smartphone className="h-3.5 w-3.5 text-slate-500" />
 <div>
 <div className="font-semibold text-white">
 {session.userAgent ? (
 session.userAgent.includes("Chrome") ? "Chrome browser" :
 session.userAgent.includes("Safari") ? "Safari browser" :
 session.userAgent.includes("Firefox") ? "Firefox browser" : "Web browser"
 ) : "Unknown Device"}
 </div>
 <div className="text-slate-400 mt-0.5">
 IP: {session.ipAddress || "Unknown"} • Created: {new Date(session.createdAt).toLocaleDateString()}
 </div>
 </div>
 </div>
 </div>
 ))}
 </div>
 )}
 </div>

 {/* Password Override */}
 <form onSubmit={handleOverridePassword} className="space-y-3 bg-slate-950/30 border-slate-900 p-4 rounded-xl">
 <div className="flex justify-between items-center">
 <h5 className="text-[10px] font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1">
 <Key className="h-3 w-3" /> Password Override
 </h5>
 </div>

 {resetSuccess && (
 <div className="flex items-center gap-1.5 text-emerald-400 text-[10px] font-semibold animate-fade-in">
 <Check className="h-3.5 w-3.5" /> Password updated, all other user sessions terminated!
 </div>
 )}

 {resetError && (
 <div className="flex items-center gap-1.5 text-rose-400 text-[10px] font-semibold animate-fade-in">
 <AlertTriangle className="h-3.5 w-3.5" /> {resetError}
 </div>
 )}

 <div className="space-y-1.5">
 <Label htmlFor="override-pw" className="text-[10px]">Assign New Credentials Password</Label>
 <div className="relative">
 <input
 id="override-pw"
 type={showOverridePw ? "text" : "password"}
 required
 value={newOverridePassword}
 onChange={(e) => setNewOverridePassword(e.target.value)}
 placeholder="Type a secure new password..."
 className="w-full bg-slate-950/40 border-slate-800 focus:border-violet-500/50 radius-xl pl-3 pr-8 py-2 text-xs text-white placeholder-slate-600 outline-none transition-all duration-300"
 />
 <button
 type="button"
 onClick={() => setShowOverridePw(!showOverridePw)}
 className={getButtonClasses(
 'primary',
 'filled',
 'medium',
 'absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-500 focus:outline-none'
 )}
 >
 {showOverridePw ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
 </button>
 </div>
 </div>

 <Button
 type="submit"
 disabled={resettingPassword || !newOverridePassword}
 className="bg-violet-600 hover:bg-violet-500 text-[11px] py-2 px-4 rounded-xl w-full"
 >
 {resettingPassword ? "Applying reset..." : "Override user credentials"}
 </Button>
 </form>

 {/* User history logs */}
 <div className="space-y-3">
 <h5 className="text-[10px] font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1">
 <History className="h-3.5 w-3.5" /> Login History Trail
 </h5>

 {userDetail.history.length === 0 ? (
 <p className="text-[10px] text-slate-500 italic p-3 border-white/5 rounded-xl text-center">
 No login history audits recorded yet.
 </p>
 ) : (
 <div className="border-white/5 rounded-xl overflow-hidden bg-slate-950/10">
 {userDetail.history.map((log: any) => (
 <div key={log.id} className="flex justify-between items-center p-3 text-[10px] hover:bg-white/[0.01] transition-colors border-b last:border-0 border-white/5">
 <div>
 <div className="font-semibold text-slate-300">
 {log.browser} on {log.os} ({log.device})
 </div>
 <div className="text-slate-500 mt-0.5">IP Address: {log.ipAddress || "Unknown"}</div>
 </div>
 <span className="text-slate-500 text-[9px]">
 {new Date(log.loginAt).toLocaleString()}
 </span>
 </div>
 ))}
 </div>
 )}
 </div>

 {/* Audit trail */}
 <div className="space-y-3">
 <h5 className="text-[10px] font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1">
 <FileText className="h-3.5 w-3.5" /> Security Audit Log
 </h5>

 {userDetail.auditLogs.length === 0 ? (
 <p className="text-[10px] text-slate-500 italic p-3 border-white/5 rounded-xl text-center">
 No security actions recorded in user ledger.
 </p>
 ) : (
 <div className="border-white/5 rounded-xl overflow-hidden bg-slate-950/10">
 {userDetail.auditLogs.map((log: any) => (
 <div key={log.id} className="p-3 text-[10px] hover:bg-white/[0.01] transition-colors border-b last:border-0 border-white/5 space-y-1">
 <div className="flex justify-between items-center">
 <span className="font-semibold text-violet-400 uppercase text-[9px] tracking-wider">
 {log.action}
 </span>
 <span className="text-slate-500 text-[9px]">
 {new Date(log.createdAt).toLocaleString()}
 </span>
 </div>
 <p className="text-slate-300 leading-normal">
 Resource: <strong>{log.resource}</strong> (ID: {log.resourceId})
 </p>
 {log.metadata && (
 <pre className="bg-black/30 border-white/5 p-1.5 rounded-lg text-[9px] text-slate-400 font-mono overflow-x-auto max-w-full">
 {JSON.stringify(log.metadata, null, 2)}
 </pre>
 )}
 </div>
 ))}
 </div>
 )}
 </div>
 </>
 ) : (
 <div className="flex flex-col justify-center items-center py-20 text-center text-slate-500 text-xs">
 <UserX className="h-8 w-8 mb-2" /> Select a user to inspect profile controls.
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
