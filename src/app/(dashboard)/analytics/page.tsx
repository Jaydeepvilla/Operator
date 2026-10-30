"use client";

import { useState, useEffect, useMemo, useCallback } from "react";
import { getAnalyticsAction } from "@/server/actions/admin";
import {
  Clock,
  TrendingUp,
  MessageSquare,
  AlertTriangle,
  Users,
  Compass,
  Activity,
  Award,
  RotateCw,
  Calendar,
  Percent,
  DollarSign,
  CreditCard,
  ArrowUpRight,
  Wallet,
  Sparkles,
  CheckCircle2,
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
      <div className="skeleton h-3.5 w-20 rounded" />
      <div className="skeleton h-8 w-16 rounded" />
      <div className="skeleton h-3 w-28 rounded" />
    </div>
  );
}

export default function AnalyticsPage() {
  const [data, setData] = useState<Record<string, unknown> | null>(null);
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState("");
  const [timeframe, setTimeframe] = useState("all");

  const loadAnalytics = useCallback(async () => {
    try {
      setLoading(true);
      const res = await getAnalyticsAction();
      if (res.success && res.data) {
        setData(res.data as unknown as Record<string, unknown>);
      } else {
        setErrorMsg(res.error || "Failed to load reports data");
      }
    } catch (e: unknown) {
      setErrorMsg(e instanceof Error ? e.message : "An unexpected error occurred");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    let ignore = false;
    getAnalyticsAction().then((res) => {
      if (ignore) return;
      if (res.success && res.data) {
        setData(res.data as unknown as Record<string, unknown>);
      } else {
        setErrorMsg(res.error || "Failed to load reports data");
      }
      setLoading(false);
    }).catch((err: unknown) => {
      if (ignore) return;
      setErrorMsg(err instanceof Error ? err.message : "An unexpected error occurred");
      setLoading(false);
    });
    return () => {
      ignore = true;
    };
  }, []);

  const rawConversations = (data?.conversations as Record<string, unknown>) || {};
  const conversations = {
    total: Number(rawConversations.total) || 0,
    active: Number(rawConversations.active) || 0,
    closed: Number(rawConversations.closed) || 0,
    escalated: Number(rawConversations.escalated) || 0,
  };
  const funnel = (data?.funnel as Record<string, unknown>) || {};
  const rawLeads = (data?.leads as Record<string, unknown>) || {};
  const leads = {
    total: Number(rawLeads.total) || 0,
    qualified: Number(rawLeads.qualified) || 0,
    conversionRate: Number(rawLeads.conversionRate) || 0,
    averageScore: Number(rawLeads.averageScore) || 0,
  };
  const rawEscalations = (data?.escalations as Record<string, unknown>) || {};
  const escalations = {
    total: Number(rawEscalations.total) || 0,
    pending: Number(rawEscalations.pending) || 0,
    resolved: Number(rawEscalations.resolved) || 0,
  };
  const rawFeedback = (data?.feedback as Record<string, unknown>) || {};
  const feedback = {
    total: Number(rawFeedback.total) || 0,
    averageRating: Number(rawFeedback.averageRating) || 0,
  };
  const intents = (data?.intents as Record<string, unknown>) || {};
  const financials = (data?.financials as Record<string, unknown>) || {};

  const fin = {
    mrr: Number(financials.mrr) || 0,
    arr: Number(financials.arr) || 0,
    arpu: Number(financials.arpu) || 0,
    ltv: Number(financials.ltv) || 0,
    churnRate: Number(financials.churnRate) || 0,
    grossRevenue: Number(financials.grossRevenue) || 0,
    netRevenue: Number(financials.netRevenue) || 0,
    revenueGrowthPercent: Number(financials.revenueGrowthPercent) || 0,
    activeSubscriptionsCount: Number(financials.activeSubscriptionsCount) || 0,
    mrrHistory: Array.isArray(financials.mrrHistory) ? (financials.mrrHistory as Array<Record<string, unknown>>) : [],
  };

  const conversationStatuses = [
    { label: "Active", count: Number(conversations.active) || 0, color: "bg-emerald-500" },
    { label: "Needs Attention", count: Number(conversations.escalated) || 0, color: "bg-rose-500" },
    { label: "Resolved", count: Number(conversations.closed) || 0, color: "bg-slate-400" },
  ];

  const conversionsTrend = useMemo(() => {
    const days = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
    const totalBooked = Number(funnel?.Booked) || 0;
    const totalEscalated = Number(escalations?.total) || 0;

    return days.map((day) => ({
      date: day,
      appointments: totalBooked > 0 ? Math.max(0, Math.round(totalBooked / 7)) : 0,
      missed: totalEscalated > 0 ? Math.max(0, Math.round(totalEscalated / 7)) : 0,
    }));
  }, [funnel, escalations]);

  const revenueTrend = useMemo(() => {
    if (fin.mrrHistory && fin.mrrHistory.length > 0) {
      return fin.mrrHistory.map((item: Record<string, unknown>) => ({
        month: String(item.month || ""),
        actual: Number(item.revenue) || 0,
        estimated: Number(item.mrr) || 0,
      }));
    }
    const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun"];
    return months.map((month) => ({ month, actual: 0, estimated: 0 }));
  }, [fin]);

  const aiVsHumanBreakdown = useMemo(() => {
    const total = Number(conversations.total) || 0;
    const escalated = Number(escalations.total) || 0;
    const pendingHuman = Number(escalations.pending) || 0;
    const fullyAi = Math.max(0, total - escalated);

    if (total === 0 && escalated === 0) {
      return [];
    }

    return [
      { source: "Fully AI Handled", count: fullyAi },
      { source: "AI + Staff Follow-up", count: escalated },
      { source: "Direct to Staff", count: pendingHuman },
    ];
  }, [conversations, escalations]);

  const funnelData = useMemo(() => {
    return Object.entries(funnel)
      .filter(([_, v]) => (Number(v) || 0) > 0)
      .map(([k, v]) => ({ stage: k, count: Number(v) || 0 }));
  }, [funnel]);

  const intentData = useMemo(() => {
    return Object.entries(intents)
      .filter(([_, v]) => (Number(v) || 0) > 0)
      .map(([k, v]) => ({ intent: k.replace("_", " "), count: Number(v) || 0 }));
  }, [intents]);

  const hasActivity = conversations.total > 0 || leads.total > 0 || fin.grossRevenue > 0;

  if (loading) {
    return (
      <div className="space-y-space-4 animate-fade-in w-full pb-space-8">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-space-3 pb-space-2 border-b border-[hsl(var(--foreground)/0.06)] shrink-0">
          <div className="space-y-space-1">
            <div className="skeleton h-6 w-32 rounded" />
            <div className="skeleton h-3.5 w-64 rounded" />
          </div>
        </div>

        <div className="grid grid-cols-2 lg:grid-cols-4 gap-space-4 shrink-0">
          {[1, 2, 3, 4].map((i) => <SkeletonCard key={i} />)}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-space-4">
          <div className="skeleton radius-xl border border-[hsl(var(--foreground)/0.06)] bg-card soft- h-full min-h-60" />
          <div className="skeleton radius-xl border border-[hsl(var(--foreground)/0.06)] bg-card soft- h-full min-h-60" />
        </div>
      </div>
    );
  }

  if (errorMsg || !data) {
    return (
      <div className="flex h-96 flex-col items-center justify-center text-center p-space-8 radius-xl border border-[hsl(var(--foreground)/0.06)] bg-card soft- max-w-lg mx-auto mt-space-10">
        <div className="flex h-12 w-12 items-center justify-center radius-xl bg-destructive/10 text-destructive mb-space-4 ring-1 ring-destructive/15">
          <AlertTriangle className="h-6 w-6" />
        </div>
        <h3 className="text-body-sm font-semibold text-foreground">Failed to load reports</h3>
        <p className="text-xs text-muted-foreground mt-space-1 mb-space-4 leading-normal max-w-xs">{errorMsg || "An unknown error occurred"}</p>
        <Button variant="outline" size="sm" onClick={loadAnalytics} className="text-xs">
          <RotateCw className="h-3.5 w-3.5 mr-space-1" />
          Retry
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-space-6 animate-fade-in w-full pb-space-8">
      {/* Header with purpose line */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-space-3 shrink-0">
        <PageTitle
          title="Reports & Insights"
          description="Track how many messages your assistant answered, appointments booked, and hours saved."
          className="mb-space-0"
        />

        <div className="flex items-center gap-space-2 self-start sm:self-center">
          <Select value={timeframe} onValueChange={(val) => setTimeframe(val)}>
            <SelectTrigger className="h-8.5 w-36 bg-background text-xs border-[hsl(var(--foreground)/0.08)] hover:border-[hsl(var(--primary)/0.25)] transition-all radius-md">
              <div className="flex items-center gap-space-1.5 font-medium">
                <Calendar className="h-3.5 w-3.5 text-muted-foreground/50 shrink-0" />
                <SelectValue placeholder="All Time" />
              </div>
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all" className="text-xs">All Time</SelectItem>
              <SelectItem value="7d" className="text-xs">Last 7 Days</SelectItem>
              <SelectItem value="30d" className="text-xs">Last 30 Days</SelectItem>
            </SelectContent>
          </Select>

          <Button size="icon" variant="ghost" className="w-8.5 hover:bg-[hsl(var(--foreground)/0.05)]" onClick={loadAnalytics} title="Refresh reports">
            <RotateCw className={cn("h-4 w-4 text-muted-foreground/65 transition-transform duration-500", loading && "animate-spin")} />
          </Button>
        </div>
      </div>

      {/* Empty State Banner if no activity yet */}
      {!hasActivity && (
        <div className="p-space-6 rounded-2xl border border-primary/20 bg-primary/5 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <Sparkles className="h-4 w-4 text-primary" />
              <h3 className="text-sm font-semibold text-foreground">Welcome to your business reports</h3>
            </div>
            <p className="text-sm text-muted-foreground max-w-xl">
              As soon as your AI assistant answers incoming messages or books appointments, your live conversation trends, revenue estimates, and time saved will automatically appear here.
            </p>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <span className="text-xs font-medium px-3 py-1 rounded-full bg-background border border-border-default text-muted-foreground">
              Example: ~4.5 hrs saved per 20 chats
            </span>
          </div>
        </div>
      )}

      {/* Operational KPI Row */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-space-4 shrink-0">
        <StatCard
          label="Conversations"
          value={conversations.total}
          icon={MessageSquare}
          subtitle="Customer inquiries answered"
          iconClassName="bg-indigo-500/10 text-indigo-500 ring-1 ring-indigo-500/15"
          chartData={[{ v: 10 }, { v: 14 }, { v: 12 }, { v: 18 }, { v: conversations.total || 15 }]}
          chartCategories={["v"]}
          chartColors={["hsl(var(--primary))"]}
        />
        <StatCard
          label="Customers & Leads"
          value={leads.total}
          icon={Users}
          trend={{ value: `${leads.qualified} qualified`, positive: true }}
          subtitle="Captured from chats & calls"
          iconClassName="bg-blue-500/10 text-blue-500 ring-1 ring-blue-500/15"
          chartData={[{ v: 80 }, { v: 95 }, { v: 90 }, { v: 105 }, { v: leads.total || 110 }]}
          chartCategories={["v"]}
          chartColors={["#3b82f6"]}
        />
        <StatCard
          label="Needs Attention"
          value={escalations.pending}
          icon={AlertTriangle}
          subtitle="Waiting for your reply"
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
          label="Customer Rating"
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
        {/* Lead Pipeline Funnel */}
        <div className="flex flex-col bg-card border border-[hsl(var(--foreground)/0.06)] radius-xl overflow-hidden soft-">
          <div className="p-space-5 pb-space-2 border-b border-[hsl(var(--foreground)/0.06)] bg-[hsl(var(--foreground)/0.005)] shrink-0">
            <div className="flex items-center gap-space-2">
              <TrendingUp className="h-4 w-4 text-primary" />
              <h4 className="text-sm font-semibold text-foreground">Customer Booking Pipeline</h4>
            </div>
            <p className="text-xs text-muted-foreground mt-space-0.5">Stages from initial enquiry to confirmed booking</p>
          </div>
          <div className="flex-1 p-space-5 bg-[hsl(var(--foreground)/0.002)]">
            <BarChartCard
              data={funnelData}
              index="stage"
              categories={["count"]}
              layout="horizontal"
              barSize={16}
              height={260}
              emptyMessage="No customer booking stages recorded yet"
            />
          </div>
        </div>

        {/* Classified Intents */}
        <div className="flex flex-col bg-card border border-[hsl(var(--foreground)/0.06)] radius-xl overflow-hidden soft-">
          <div className="p-space-5 pb-space-2 border-b border-[hsl(var(--foreground)/0.06)] bg-[hsl(var(--foreground)/0.005)] shrink-0">
            <div className="flex items-center gap-space-2">
              <Compass className="h-4 w-4 text-indigo-500" />
              <h4 className="text-sm font-semibold text-foreground">What Customers Ask About</h4>
            </div>
            <p className="text-xs text-muted-foreground mt-space-0.5">Appointments, pricing, hours, and location questions</p>
          </div>
          <div className="flex-1 p-space-5 bg-[hsl(var(--foreground)/0.002)]">
            <DonutChartCard
              data={intentData}
              index="intent"
              category="count"
              height={260}
              emptyMessage="No customer topics recorded yet"
            />
          </div>
        </div>
      </div>

      {/* Advanced Trends */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-space-4 shrink-0">
        <Card className="border border-border-default bg-card radius-xl overflow-hidden">
          <CardHeader className="p-space-5 pb-space-2">
            <CardTitle className="text-sm font-semibold">Bookings Over Time</CardTitle>
            <CardDescription className="text-xs">Appointments booked vs missed calls</CardDescription>
          </CardHeader>
          <CardContent className="p-space-5 pt-space-0">
            <AreaChartCard
              data={conversionsTrend}
              index="date"
              categories={["appointments", "missed"]}
              colors={["#10b981", "#ef4444"]}
              height={260}
              emptyMessage="No appointments logged this week yet"
            />
          </CardContent>
        </Card>

        <Card className="border border-border-default bg-card radius-xl overflow-hidden">
          <CardHeader className="p-space-5 pb-space-2">
            <CardTitle className="text-sm font-semibold">AI vs Staff Handling</CardTitle>
            <CardDescription className="text-xs">Conversations resolved automatically vs transferred to staff</CardDescription>
          </CardHeader>
          <CardContent className="p-space-5 pt-space-0">
            <DonutChartCard
              data={aiVsHumanBreakdown}
              index="source"
              category="count"
              variant="pie"
              height={260}
              emptyMessage="No conversations recorded yet"
            />
          </CardContent>
        </Card>
      </div>

      {/* Session Breakdown */}
      <div className="bg-card border border-[hsl(var(--foreground)/0.06)] radius-xl p-space-5 soft- flex flex-col justify-between gap-space-4">
        <div>
          <div className="flex items-center gap-space-2">
            <Activity className="h-4 w-4 text-emerald-500" />
            <h4 className="text-sm font-semibold text-foreground">Message Resolution Status</h4>
          </div>
          <p className="text-xs text-muted-foreground mt-space-0.5">Active inquiries vs resolved vs waiting for staff reply</p>
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
                    "radius-xl border p-space-3 text-left transition-all duration-200",
                    stat.label === "Active" ? "border-emerald-500/20 bg-emerald-500/[0.03]" :
                    stat.label === "Needs Attention" ? "border-rose-500/20 bg-rose-500/[0.03]" :
                    "border-border-default bg-muted/[0.03]"
                  )}
                >
                  <div className="flex items-center gap-space-1.5 justify-between">
                    <div className="flex items-center gap-space-1.5 min-w-0">
                      <span className={cn("h-2 w-2 rounded-full shrink-0", stat.color)} />
                      <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider truncate">{stat.label}</span>
                    </div>
                    <span className="text-xs font-bold text-muted-foreground tabular-nums shrink-0">{pct}%</span>
                  </div>
                  <div className="mt-space-2 flex items-baseline gap-space-1">
                    <span className="text-xl font-bold text-foreground tabular-nums leading-none">{stat.count}</span>
                    <span className="text-xs text-muted-foreground leading-none">session{stat.count !== 1 && "s"}</span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
