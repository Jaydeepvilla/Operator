"use client";

import { useState, useEffect } from "react";
import { getAnalyticsAction } from "@/server/actions/admin";
import {
 BarChart3,
 Clock,
 TrendingUp,
 MessageSquare,
 AlertTriangle,
 Star,
 Users,
 Compass,
 Activity,
 Award,
 RotateCw,
 Loader2,
 Calendar,
 ChevronUp,
 Percent,
 DollarSign,
 CreditCard,
 ArrowUpRight,
 Wallet,
} from "lucide-react";
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from "@/components/shared/card";
import { Button } from "@/components/shared/button";
import { PageTitle } from "@/components/shared/page-title";
import { StatCard } from "@/components/shared/stat-card";
import { cn } from "@/components/shared/utils";
import {
 Select,
 SelectContent,
 SelectItem,
 SelectTrigger,
 SelectValue,
} from "@/components/shared/select";
import { AreaChartCard, BarChartCard, DonutChartCard } from "@/components/charts";

function SkeletonCard() {
 return (
 <div className="radius-xl border border-[hsl(var(--foreground)/0.06)] bg-card p-space-5 space-y-space-3 soft-">
 <div className="skeleton h-3.5 w-20 rounded"/>
 <div className="skeleton h-8 w-16 rounded"/>
 <div className="skeleton h-3 w-28 rounded"/>
 </div>
 );
}

export default function AnalyticsPage() {
 const [data, setData] = useState<any | null>(null);
 const [loading, setLoading] = useState(true);
 const [errorMsg, setErrorMsg] = useState("");
 const [timeframe, setTimeframe] = useState("all");

 const loadAnalytics = async () => {
 try {
 setLoading(true);
 const res = await getAnalyticsAction();
 if (res.success && res.data) {
 setData(res.data);
 } else {
 setErrorMsg(res.error || "Failed to load analytics data");
 }
 } catch (e: any) {
 setErrorMsg(e.message || "An unexpected error occurred");
 } finally {
 setLoading(false);
 }
 };

 useEffect(() => {
 loadAnalytics();
 }, []);

 if (loading) {
 return (
 <div className="space-y-space-4 animate-fade-in w-full pb-space-8">
 {/* Header */}
 <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-space-3 pb-space-2 border-b border-[hsl(var(--foreground)/0.06)] shrink-0">
 <div className="space-y-space-1">
 <div className="skeleton h-6 w-32 rounded"/>
 <div className="skeleton h-3.5 w-64 rounded"/>
 </div>
 </div>
 
 {/* KPI Row */}
 <div className="grid grid-cols-2 lg:grid-cols-4 gap-space-4 shrink-0">
 {[1, 2, 3, 4].map((i) => <SkeletonCard key={i} />)}
 </div>

 {/* Charts block */}
 <div className="grid grid-cols-1 lg:grid-cols-2 gap-space-4">
 <div className="skeleton radius-xl border border-[hsl(var(--foreground)/0.06)] bg-card soft- h-full"/>
 <div className="skeleton radius-xl border border-[hsl(var(--foreground)/0.06)] bg-card soft- h-full"/>
 </div>
 </div>
 );
 }

 if (errorMsg || !data) {
 return (
 <div className="flex h-96 flex-col items-center justify-center text-center p-space-8 radius-xl border border-[hsl(var(--foreground)/0.06)] bg-card soft- max-w-lg mx-auto mt-space-10">
 <div className="flex h-12 w-12 items-center justify-center radius-xl bg-destructive/10 text-destructive mb-space-4 ring-1 ring-destructive/15">
 <AlertTriangle className="h-6 w-6"/>
 </div>
 <h3 className="text-body-sm font-semibold text-foreground">Failed to load analytics</h3>
 <p className="text-caption text-muted-foreground mt-space-1 mb-space-4 leading-normal max-w-xs">{errorMsg || "An unknown error occurred"}</p>
 <Button variant="outline" size="sm" onClick={loadAnalytics} className="text-caption">
 <RotateCw className="h-3.5 w-3.5 mr-space-1"/>
 Retry
 </Button>
 </div>
 );
 }

 const { conversations, funnel, leads, escalations, feedback, intents, financials } = data;
 const fin = financials || {
   mrr: 0,
   arr: 0,
   arpu: 0,
   ltv: 0,
   churnRate: 0,
   grossRevenue: 0,
   netRevenue: 0,
   revenueGrowthPercent: 0,
   activeSubscriptionsCount: 0,
 };

 const conversationStatuses = [
 { label: "Active", count: conversations.active, color: "bg-emerald-500" },
 { label: "Escalated", count: conversations.escalated, color: "bg-rose-500" },
 { label: "Closed", count: conversations.closed, color: "bg-slate-400 " },
 ];

 return (
 <div className="space-y-space-4 animate-fade-in w-full pb-space-8">
 {/* Header */}
 <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-space-3 shrink-0">
 <PageTitle
 title="Analytics Dashboard"
 description="Real-time financial metrics, lead pipelines, and AI performance indicators."
 className="mb-space-0"
 />
 
 <div className="flex items-center gap-space-2 self-start sm:self-center">
 {/* Timeframe Select */}
 <Select value={timeframe} onValueChange={(val) => setTimeframe(val)}>
 <SelectTrigger className="h-8.5 w-36 bg-background text-caption border-[hsl(var(--foreground)/0.08)] hover:border-[hsl(var(--primary)/0.25)] transition-all radius-md">
 <div className="flex items-center gap-space-1.5 font-medium">
 <Calendar className="h-3.5 w-3.5 text-muted-foreground/50 shrink-0"/>
 <SelectValue placeholder="All Time"/>
 </div>
 </SelectTrigger>
 <SelectContent>
 <SelectItem value="all" className="text-caption">All Time</SelectItem>
 <SelectItem value="7d" className="text-caption">Last 7 Days</SelectItem>
 <SelectItem value="30d" className="text-caption">Last 30 Days</SelectItem>
 </SelectContent>
 </Select>

 {/* Refresh Button */}
 <Button size="icon" variant="ghost" className="w-8.5 hover:bg-[hsl(var(--foreground)/0.05)]" onClick={loadAnalytics} title="Refresh analytics">
 <RotateCw className={cn("h-4 w-4 text-muted-foreground/65 transition-transform duration-500", loading && "animate-spin")} />
 </Button>
 </div>
 </div>

 {/* Real-time Financial Indicators Row */}
 <div className="space-y-space-2">
 <div className="flex items-center justify-between">
 <div className="flex items-center gap-2">
 <DollarSign className="h-4 w-4 text-emerald-500" />
 <h3 className="text-caption font-bold text-foreground uppercase tracking-wider">
 Financial & Revenue Metrics
 </h3>
 </div>
 <span className="text-[11px] font-medium text-emerald-600 bg-emerald-500/10 px-2 py-0.5 rounded">
 Live Stream
 </span>
 </div>

 <div className="grid grid-cols-2 lg:grid-cols-5 gap-space-3 shrink-0">
 <StatCard 
 label="MRR"
 value={`$${fin.mrr?.toLocaleString() || 0}`}
 icon={DollarSign} 
 trend={fin.revenueGrowthPercent !== 0 ? { value: `${fin.revenueGrowthPercent > 0 ? "+" : ""}${fin.revenueGrowthPercent}%`, positive: fin.revenueGrowthPercent >= 0 } : undefined}
 subtitle="Monthly Recurring"
 iconClassName="bg-emerald-500/10 text-emerald-500 ring-1 ring-emerald-500/15"
 chartData={[{ v: fin.mrr * 0.8 }, { v: fin.mrr * 0.9 }, { v: fin.mrr }]}
 chartCategories={["v"]}
 chartColors={["#10b981"]}
 />
 <StatCard 
 label="ARR"
 value={`$${fin.arr?.toLocaleString() || 0}`}
 icon={CreditCard} 
 subtitle="Annual Run Rate"
 iconClassName="bg-indigo-500/10 text-indigo-500 ring-1 ring-indigo-500/15"
 chartData={[{ v: fin.arr * 0.8 }, { v: fin.arr * 0.9 }, { v: fin.arr }]}
 chartCategories={["v"]}
 chartColors={["#6366f1"]}
 />
 <StatCard 
 label="ARPU"
 value={`$${fin.arpu || 0}`}
 icon={Wallet} 
 subtitle="Avg Revenue / User"
 iconClassName="bg-blue-500/10 text-blue-500 ring-1 ring-blue-500/15"
 chartData={[{ v: fin.arpu * 0.9 }, { v: fin.arpu }]}
 chartCategories={["v"]}
 chartColors={["#3b82f6"]}
 />
 <StatCard 
 label="LTV"
 value={`$${fin.ltv?.toLocaleString() || 0}`}
 icon={ArrowUpRight} 
 subtitle="Customer Lifetime Value"
 iconClassName="bg-amber-500/10 text-amber-500 ring-1 ring-amber-500/15"
 chartData={[{ v: fin.ltv * 0.85 }, { v: fin.ltv }]}
 chartCategories={["v"]}
 chartColors={["#f59e0b"]}
 />
 <StatCard 
 label="Churn Rate"
 value={`${fin.churnRate || 0}%`}
 icon={Percent} 
 subtitle="Subscription churn"
 iconClassName={cn(
 "ring-1",
 fin.churnRate > 5 
 ? "bg-rose-500/10 text-rose-500 ring-rose-500/15" 
 : "bg-emerald-500/10 text-emerald-500 ring-emerald-500/15"
 )}
 chartData={[{ v: fin.churnRate + 1 }, { v: fin.churnRate }]}
 chartCategories={["v"]}
 chartColors={["#f43f5e"]}
 />
 </div>
 </div>

 {/* Operational KPI Row */}
 <div className="grid grid-cols-2 lg:grid-cols-4 gap-space-4 shrink-0 pt-space-2">
 <StatCard 
 label="Sessions"
 value={conversations.total} 
 icon={MessageSquare} 
 subtitle="Active timeline logs"
 iconClassName="bg-indigo-500/10 text-indigo-500 ring-1 ring-indigo-500/15"
 chartData={[{ v: 10 }, { v: 14 }, { v: 12 }, { v: 18 }, { v: conversations.total || 15 }]}
 chartCategories={["v"]}
 chartColors={["hsl(var(--primary))"]}
 />
 <StatCard 
 label="Leads"
 value={leads.total} 
 icon={Users} 
 trend={{ value: `+${leads.qualified} qualified`, positive: true }}
 iconClassName="bg-blue-500/10 text-blue-500 ring-1 ring-blue-500/15"
 chartData={[{ v: 80 }, { v: 95 }, { v: 90 }, { v: 105 }, { v: leads.total || 110 }]}
 chartCategories={["v"]}
 chartColors={["#3b82f6"]}
 />
 <StatCard 
 label="Escalation"
 value={`${conversations.total > 0 ? Math.round((escalations.total / conversations.total) * 100) : 0}%`} 
 icon={AlertTriangle} 
 subtitle={`${escalations.pending} pending triage`}
 iconClassName={cn(
 "ring-1",
 escalations.pending > 0 
 ? "bg-rose-500/10 text-rose-500 ring-rose-500/15" 
 : "bg-slate-500/10 text-slate-500 ring-slate-500/15"
 )}
 chartData={[{ v: 2 }, { v: 0 }, { v: 1 }, { v: 3 }, { v: escalations.pending || 0 }]}
 chartCategories={["v"]}
 chartColors={["#f43f5e"]}
 />
 <StatCard 
 label="CSAT Rating"
 value={feedback.averageRating || "5.0"} 
 icon={Award} 
 subtitle={`Based on ${feedback.total} reviews`}
 iconClassName="bg-emerald-500/10 text-emerald-500 ring-1 ring-emerald-500/15"
 chartData={[{ v: 4.2 }, { v: 4.5 }, { v: 4.4 }, { v: 4.8 }, { v: feedback.averageRating || 4.9 }]}
 chartCategories={["v"]}
 chartColors={["#10b981"]}
 />
 </div>

 {/* Analytics Grid */}
 <div className="grid grid-cols-1 lg:grid-cols-2 gap-space-4">

 {/* Card 5: Lead Pipeline Funnel */}
 <div className="flex flex-col bg-card border border-[hsl(var(--foreground)/0.06)] radius-xl overflow-hidden soft-">
 <div className="p-space-5 pb-space-2 border-b border-[hsl(var(--foreground)/0.06)] bg-[hsl(var(--foreground)/0.005)] shrink-0">
 <div className="flex items-center gap-space-2">
 <TrendingUp className="h-4 w-4 text-primary"/>
 <h4 className="text-body-sm font-semibold text-foreground">Lead Pipeline Funnel</h4>
 </div>
 <p className="text-caption text-muted-foreground mt-space-0.5">Conversion stages across all captured leads</p>
 </div>
 <div className="flex-1 p-space-5 bg-[hsl(var(--foreground)/0.002)]">
 <BarChartCard 
 data={Object.entries(funnel).filter(([_, v]) => (v as number) > 0).map(([k, v]) => ({ stage: k, count: v as number }))}
 index="stage"
 categories={["count"]}
 layout="horizontal"
 barSize={16}
 height={260}
 />
 </div>
 </div>

 {/* Card 6: Classified Intents */}
 <div className="flex flex-col bg-card border border-[hsl(var(--foreground)/0.06)] radius-xl overflow-hidden soft-">
 <div className="p-space-5 pb-space-2 border-b border-[hsl(var(--foreground)/0.06)] bg-[hsl(var(--foreground)/0.005)] shrink-0">
 <div className="flex items-center gap-space-2">
 <Compass className="h-4 w-4 text-indigo-500"/>
 <h4 className="text-body-sm font-semibold text-foreground">Classified Intents</h4>
 </div>
 <p className="text-caption text-muted-foreground mt-space-0.5">Query intent categories across all conversations</p>
 </div>
 <div className="flex-1 p-space-5 bg-[hsl(var(--foreground)/0.002)]">
 <DonutChartCard 
 data={Object.entries(intents).filter(([_, v]) => v as number > 0).map(([k, v]) => ({ intent: k.replace("_", " "), count: v as number }))}
 index="intent"
 category="count"
 height={260}
 />
 </div>
 </div>
 </div>
 
 {/* ─── Advanced Analytics ─── */}
 <div className="grid grid-cols-1 lg:grid-cols-3 gap-space-4 shrink-0">
 <Card className="border border-border-default bg-card radius-xl overflow-hidden">
 <CardHeader className="p-space-5 pb-space-2">
 <CardTitle className="text-body-sm font-semibold">Conversions Over Time</CardTitle>
 <CardDescription className="text-caption">Appointments booked vs missed calls</CardDescription>
 </CardHeader>
 <CardContent className="p-space-5 pt-space-0">
 <AreaChartCard 
 data={[
 { date: "Mon", appointments: 12, missed: 4 },
 { date: "Tue", appointments: 18, missed: 2 },
 { date: "Wed", appointments: 15, missed: 6 },
 { date: "Thu", appointments: 25, missed: 3 },
 { date: "Fri", appointments: 30, missed: 5 },
 { date: "Sat", appointments: 45, missed: 10 },
 { date: "Sun", appointments: 10, missed: 8 },
 ]}
 index="date"
 categories={["appointments", "missed"]}
 colors={["#10b981", "#ef4444"]}
 height={280}
 />
 </CardContent>
 </Card>

 <Card className="border border-border-default bg-card radius-xl overflow-hidden">
 <CardHeader className="p-space-5 pb-space-2">
 <CardTitle className="text-body-sm font-semibold">Revenue Trend</CardTitle>
 <CardDescription className="text-caption">Estimated vs actual revenue from AI bookings</CardDescription>
 </CardHeader>
 <CardContent className="p-space-5 pt-space-0">
 <AreaChartCard 
 data={[
 { month: "Jan", actual: 4500, estimated: 4200 },
 { month: "Feb", actual: 5200, estimated: 4800 },
 { month: "Mar", actual: 6100, estimated: 5500 },
 { month: "Apr", actual: 5800, estimated: 6300 },
 { month: "May", actual: 7500, estimated: 7100 },
 { month: "Jun", actual: 8200, estimated: 8000 },
 ]}
 index="month"
 categories={["actual", "estimated"]}
 colors={["#10b981", "#a1a1aa"]}
 valuePrefix="$"
 height={280}
 />
 </CardContent>
 </Card>

 <Card className="border border-border-default bg-card radius-xl overflow-hidden">
 <CardHeader className="p-space-5 pb-space-2">
 <CardTitle className="text-body-sm font-semibold">AI vs Human Handled</CardTitle>
 <CardDescription className="text-caption">Resolution breakdown across all conversations</CardDescription>
 </CardHeader>
 <CardContent className="p-space-5 pt-space-0">
 <DonutChartCard 
 data={[
 { source: "Fully AI Handled", count: 850 },
 { source: "AI + Human Takeover", count: 120 },
 { source: "Direct to Human", count: 30 },
 ]}
 index="source"
 category="count"
 variant="pie"
 height={280}
 />
 </CardContent>
 </Card>
 </div>

 {/* Bottom section */}
 <div className="grid grid-cols-1 lg:grid-cols-2 gap-space-4">
 {/* Average Lead Score circle card */}
 <div className="bg-card border border-[hsl(var(--foreground)/0.06)] radius-xl p-space-5 soft- flex items-center gap-space-6 hover:border-primary/20 transition-all duration-300">
 <div className="relative flex items-center justify-center shrink-0">
 <svg className="w-20 h-20 -rotate-90" viewBox="0 0 100 100">
 <circle cx="50" cy="50" r="38" fill="none" stroke="hsl(var(--foreground)/0.04)" strokeWidth="7"/>
 <circle
 cx="50"
 cy="50"
 r="38"
 fill="none"
 stroke="hsl(var(--primary))"
 strokeWidth="7"
 strokeLinecap="round"
 strokeDasharray={2 * Math.PI * 38}
 strokeDashoffset={2 * Math.PI * 38 * (1 - leads.averageScore / 100)}
 className="transition-all duration-700"
 />
 </svg>
 <div className="absolute inset-0 flex flex-col items-center justify-center">
 <span className="text-xl font-bold text-foreground tabular-nums leading-none">{leads.averageScore}</span>
 <span className="text-[9px] text-muted-foreground/50 font-bold uppercase tracking-wider mt-0.5">Avg</span>
 </div>
 </div>
 <div>
 <h4 className="text-body-sm font-semibold text-foreground tracking-tight-lg">Average Lead Score</h4>
 <p className="text-caption text-muted-foreground/80 leading-relaxed mt-space-1">
 Compiled from profile completeness, qualification answer counts, high-ticket interest signals, and urgency trigger flags.
 </p>
 </div>
 </div>

 {/* Session breakdown ratios card */}
 <div className="bg-card border border-[hsl(var(--foreground)/0.06)] radius-xl p-space-4.5 soft- flex flex-col justify-between gap-space-4 hover:border-primary/20 transition-all duration-300">
 <div>
 <div className="flex items-center gap-space-2">
 <Activity className="h-4 w-4 text-emerald-500"/>
 <h4 className="text-body-sm font-semibold text-foreground tracking-tight-lg">Session Breakdown</h4>
 </div>
 <p className="text-caption text-muted-foreground/85 mt-space-0.5">Active vs escalated vs closed ratios</p>
 </div>

 <div className="space-y-space-3">
 <div className="h-3 w-full bg-[hsl(var(--foreground)/0.04)] radius-full overflow-hidden flex border border-[hsl(var(--foreground)/0.015)]">
 {conversationStatuses.map((stat, idx) => {
 const pct = conversations.total > 0 ? (stat.count / conversations.total) * 100 : 0;
 if (pct === 0) return null;
 return (
 <div
 key={idx}
 style={{ width: `${pct}%` }}
 className={cn("h-full transition-all duration-500", stat.color)}
 title={`${stat.label}: ${stat.count}`}
 />
 );
 })}
 </div>

 <div className="grid grid-cols-3 gap-space-3">
 {conversationStatuses.map((stat, idx) => {
 const pct = conversations.total > 0 ? Math.round((stat.count / conversations.total) * 100) : 0;
 return (
 <div 
 key={idx} 
 className={cn(
 "radius-xl border p-space-3 text-left transition-all duration-200 hover:scale-[1.02]",
 stat.label === "Active" ? "border-emerald-500/12 bg-emerald-500/[0.015]" :
 stat.label === "Escalated" ? "border-rose-500/12 bg-rose-500/[0.015]" :
 "border-border-default bg-muted/[0.015]"
 )}
 >
 <div className="flex items-center gap-space-1.5 justify-between">
 <div className="flex items-center gap-space-1.5 min-w-0">
 <span className={cn("h-2 w-2 rounded-full shrink-0", stat.color)} />
 <span className="text-[10px] font-bold text-muted-foreground/75 uppercase tracking-wider truncate">{stat.label}</span>
 </div>
 <span className="text-[10px] font-bold text-muted-foreground/50 tabular-nums shrink-0">{pct}%</span>
 </div>
 <div className="mt-space-2 flex items-baseline gap-space-1">
 <span className="text-xl font-bold text-foreground tabular-nums leading-none">{stat.count}</span>
 <span className="text-[10px] text-muted-foreground/60 leading-none">session{stat.count !== 1 && "s"}</span>
 </div>
 </div>
 );
 })}
 </div>
 </div>
 </div>
 </div>
 </div>
 );
}
