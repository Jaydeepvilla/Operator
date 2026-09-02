"use client";

import { useState } from "react";
import {
  Building,
  TrendingUp,
  DollarSign,
  Activity,
  ShieldAlert,
  Clock,
  Terminal,
  Layers,
  LineChart,
  BarChart,
  Percent,
  TrendingDown
} from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/shared/card";
import { Tabs, TabsList, TabsTrigger } from "@/components/shared/tabs";
import { NativeTable } from "@/components/shared/native";
import { ScrollArea } from "@/components/ui/scroll-area";

interface AuditLog {
  id: string;
  action: string;
  targetId: string | null;
  details: any;
  createdAt: Date;
  user?: {
    name: string | null;
    email: string;
  } | null;
}

export function AgencyDashboardClient({
  agency,
  logs,
  metrics
}: {
  agency: any;
  logs: any[];
  metrics: any;
}) {
  const [activeTab, setActiveTab] = useState<"overview" | "finance">("overview");
  const [auditLogs] = useState<AuditLog[]>(logs as AuditLog[]);

  // Fallback metrics
  const mrr = metrics?.mrr || "$948.00";
  const arr = metrics?.arr || "$11,376.00";
  const churn = metrics?.churnRate || "2.8%";
  const ltv = metrics?.ltv || "$1,840.00";
  const arpu = metrics?.arpu || "$68.00";

  const clientGrowthData = [
    { month: "Jan", count: 4, revenue: 800 },
    { month: "Feb", count: 6, revenue: 1200 },
    { month: "Mar", count: 8, revenue: 1600 },
    { month: "Apr", count: 9, revenue: 1800 },
    { month: "May", count: 11, revenue: 2200 },
    { month: "Jun", count: 12, revenue: 2450 },
  ];

  return (
    <div className="space-y-space-6">
      {/* Switcher tabs */}
      <Tabs value={activeTab} onValueChange={(val: any) => setActiveTab(val)} variant="segmented" className="w-full max-w-xs">
        <TabsList className="w-full bg-muted/20 border border-border/20 p-space-1 radius-lg">
          <TabsTrigger value="overview" className="flex-1 text-caption cursor-pointer border-none">
            <Building className="h-3.5 w-3.5 mr-space-2 text-primary" />
            Dashboard
          </TabsTrigger>
          <TabsTrigger value="finance" className="flex-1 text-caption cursor-pointer border-none">
            <LineChart className="h-3.5 w-3.5 mr-space-2 text-success" />
            Finance Stats
          </TabsTrigger>
        </TabsList>
      </Tabs>

      {activeTab === "overview" ? (
        /* OVERVIEW TAB */
        <div className="space-y-space-8 animate-fade-in">
          {/* Executive Command Cards */}
          <div className="grid gap-space-6 sm:grid-cols-2 lg:grid-cols-4">
            <Card className="bg-card/45 backdrop-blur-md border border-border/50 flex items-center justify-between p-space-6">
              <div className="space-y-space-1">
                <span className="text-caption text-muted-foreground">Active Client Accounts</span>
                <h3 className="text-heading-lg text-foreground">{clientGrowthData[5].count}</h3>
                <span className="text-caption text-success-500 flex items-center gap-space-1 mt-space-1">
                  <TrendingUp className="h-3 w-3" />
                  +20% growth this month
                </span>
              </div>
              <div className="h-10 w-10 radius-lg bg-primary/10 text-primary flex items-center justify-center">
                <Building className="h-5 w-5" />
              </div>
            </Card>

            <Card className="bg-card/45 backdrop-blur-md border border-border/50 flex items-center justify-between p-space-6">
              <div className="space-y-space-1">
                <span className="text-caption text-muted-foreground">Monthly Recurring Revenue</span>
                <h3 className="text-heading-lg text-foreground">{mrr}</h3>
                <span className="text-caption text-success-500 flex items-center gap-space-1 mt-space-1">
                  <TrendingUp className="h-3 w-3" />
                  +$250 net new MRR
                </span>
              </div>
              <div className="h-10 w-10 radius-lg bg-success-500/10 text-success-500 flex items-center justify-center">
                <DollarSign className="h-5 w-5" />
              </div>
            </Card>

            <Card className="bg-card/45 backdrop-blur-md border border-border/50 flex items-center justify-between p-space-6">
              <div className="space-y-space-1">
                <span className="text-caption text-muted-foreground">Annual Recurring Revenue</span>
                <h3 className="text-heading-lg text-foreground">{arr}</h3>
                <span className="text-caption text-muted-foreground mt-space-1">Reseller margin: 68%</span>
              </div>
              <div className="h-10 w-10 radius-lg bg-warning-500/10 text-warning-500 flex items-center justify-center">
                <DollarSign className="h-5 w-5" />
              </div>
            </Card>

            <Card className="bg-card/45 backdrop-blur-md border border-border/50 flex items-center justify-between p-space-6">
              <div className="space-y-space-1">
                <span className="text-caption text-muted-foreground">Platform Status</span>
                <h3 className="text-heading-lg text-foreground">Operational</h3>
                <span className="text-caption text-success-500 flex items-center gap-space-1 mt-space-1">
                  <span className="h-1.5 w-1.5 radius-md bg-success-500" />
                  All whitelabel Trunks Online
                </span>
              </div>
              <div className="h-10 w-10 radius-lg bg-primary-500/10 text-primary-400 flex items-center justify-center">
                <Activity className="h-5 w-5" />
              </div>
            </Card>
          </div>

          {/* Analytics & Impersonation Alert Panel */}
          <div className="grid gap-space-8 lg:grid-cols-12">
            {/* Left Column: Growth Breakdown */}
            <div className="lg:col-span-7 space-y-space-6">
              <Card className="bg-card/40 backdrop-blur-md border border-border/50">
                <CardHeader>
                  <CardTitle className="text-body-md flex items-center gap-space-2">
                    <Layers className="h-5 w-5 text-primary" />
                    Reseller Revenue Growth Metrics
                  </CardTitle>
                  <CardDescription className="text-caption">
                    Track your client signup volumes and recurring platform MRR.
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-space-4 pt-space-2">
                    {clientGrowthData.map((data, index) => (
                      <div key={index} className="space-y-space-1">
                        <div className="flex justify-between text-caption">
                          <span className="text-foreground">{data.month} ({data.count} Clients)</span>
                          <span className="text-primary font-mono">${data.revenue} / mo</span>
                        </div>
                        <div className="w-full bg-border/50 h-2 radius-md overflow-hidden">
                          <div
                            className="bg-primary h-full radius-md transition-all duration-500"
                            style={{ width: `${(data.revenue / 2500) * 100}%` }}
                          />
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Right Column: Security Auditing Alerts */}
            <div className="lg:col-span-5">
              <Card className="bg-card/40 backdrop-blur-md border border-error-500/20">
                <CardHeader className="pb-space-3 border-b border-border/20">
                  <CardTitle className="text-body-md flex items-center gap-space-2">
                    <ShieldAlert className="h-5 w-5 text-destructive" />
                    Client Access Policy Alerts
                  </CardTitle>
                  <CardDescription className="text-caption">
                    Important rules concerning client workspace takeover auditing.
                  </CardDescription>
                </CardHeader>
                <CardContent className="pt-space-4 space-y-space-3 text-caption leading-relaxed text-muted-foreground">
                  <p>
                    As a white-label reseller partner, you are authorized to login and configure client portals using
                    the <strong className="text-foreground">impersonate client</strong> utility to troubleshoot setup rules, knowledge sources, or schedules.
                  </p>
                  <div className="p-space-3 bg-destructive/5 border border-error-500/10 radius-lg text-error-500 space-y-space-1">
                    <span className="flex items-center gap-space-1">
                      <Terminal className="h-3.5 w-3.5" />
                      Impersonation Audit Rules:
                    </span>
                    <ul className="list-disc pl-space-4 space-y-space-1">
                      <li>Every workspace takeover session is logged with the actor's ID and IP address.</li>
                      <li>Token links expire in 15 minutes.</li>
                      <li>Client owners do not see any reference to the Operator platform name or logs.</li>
                    </ul>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>

          {/* Security Audit Trail Logs */}
          <Card className="bg-card/40 backdrop-blur-md border border-border/50">
            <CardHeader>
              <CardTitle className="text-body-md flex items-center gap-space-2">
                <Clock className="h-5 w-5 text-primary" />
                Platform Security Audit Logs
              </CardTitle>
              <CardDescription className="text-caption">
                Detailed historical review of administrative agency actions.
              </CardDescription>
            </CardHeader>
            <CardContent className="p-space-0 border-t border-border/10">
              {auditLogs.length === 0 ? (
                <div className="py-space-12 text-center text-muted-foreground text-body-sm">
                  No recent audit trail records generated.
                </div>
              ) : (
                <ScrollArea className="" vertical={false}>
                  <NativeTable className="w-full text-left border-collapse text-caption">
                    <thead>
                      <tr className="border-b border-border/30 bg-muted/20 text-caption uppercase tracking-wider text-muted-foreground">
                        <th className="px-space-6 py-space-4">Actor</th>
                        <th className="px-space-6 py-space-4">Action</th>
                        <th className="px-space-6 py-space-4">Target Reference ID</th>
                        <th className="px-space-6 py-space-4">Details</th>
                        <th className="px-space-6 py-space-4 text-right">Timestamp</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border/20 text-muted-foreground">
                      {auditLogs.map((log) => (
                        <tr key={log.id} className="hover:bg-accent/5 transition-colors">
                          <td className="px-space-6 py-space-4 text-foreground">
                            {log.user?.email || "Agency Owner"}
                          </td>
                          <td className="px-space-6 py-space-4">
                            <span className={`inline-flex items-center gap-space-1 px-space-2 py-space-1 radius-md text-caption uppercase tracking-wider ${log.action.includes("impersonation")
                              ? "bg-destructive/10 text-error-500 border border-error-500/20"
                              : "bg-primary/10 text-primary border border-primary/20"
                            }`}>
                              {log.action.replace("-", " ")}
                            </span>
                          </td>
                          <td className="px-space-6 py-space-4 font-mono text-caption">{log.targetId || "—"}</td>
                          <td className="px-space-6 py-space-4 font-mono text-caption truncate max-w-xs">
                            {JSON.stringify(log.details)}
                          </td>
                          <td className="px-space-6 py-space-4 text-right font-mono text-caption">
                            {new Date(log.createdAt).toLocaleString()}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </NativeTable>
                </ScrollArea>
              )}
            </CardContent>
          </Card>
        </div>
      ) : (
        /* FINANCE ANALYTICS TAB */
        <div className="space-y-space-8 animate-fade-in">
          {/* Financial Overview stats cards */}
          <div className="grid gap-space-6 sm:grid-cols-2 lg:grid-cols-4">
            <Card className="bg-card/45 border border-border/50 p-space-6 flex flex-col justify-between">
              <div className="space-y-space-1">
                <span className="text-caption text-muted-foreground">Monthly Recurring Revenue</span>
                <h3 className="text-heading-lg text-foreground">{mrr}</h3>
                <p className="text-caption text-success-500 flex items-center gap-space-1 mt-space-1">
                  <TrendingUp className="h-3 w-3" />
                  +12.4% vs last month
                </p>
              </div>
            </Card>

            <Card className="bg-card/45 border border-border/50 p-space-6 flex flex-col justify-between">
              <div className="space-y-space-1">
                <span className="text-caption text-muted-foreground">Annual Recurring Revenue</span>
                <h3 className="text-heading-lg text-foreground">{arr}</h3>
                <p className="text-caption text-muted-foreground mt-space-1">Annualized projections active</p>
              </div>
            </Card>

            <Card className="bg-card/45 border border-border/50 p-space-6 flex flex-col justify-between">
              <div className="space-y-space-1">
                <span className="text-caption text-muted-foreground">Customer Churn Rate</span>
                <h3 className="text-heading-lg text-foreground">{churn}</h3>
                <p className="text-caption text-success-500 flex items-center gap-space-1 mt-space-1">
                  <TrendingDown className="h-3 w-3" />
                  -0.4% improvement
                </p>
              </div>
            </Card>

            <Card className="bg-card/45 border border-border/50 p-space-6 flex flex-col justify-between">
              <div className="space-y-space-1">
                <span className="text-caption text-muted-foreground">Average Revenue Per User (ARPU)</span>
                <h3 className="text-heading-lg text-foreground">{arpu}</h3>
                <p className="text-caption text-muted-foreground mt-space-1">LTV Ratio: {ltv}</p>
              </div>
            </Card>
          </div>

          {/* Revenue distribution and performance */}
          <div className="grid gap-space-6 md:grid-cols-2">
            <Card className="bg-card/45 border border-border/50">
              <CardHeader>
                <CardTitle className="text-body-md flex items-center gap-space-2">
                  <BarChart className="h-5 w-5 text-primary" />
                  Plan Performance Distribution
                </CardTitle>
                <CardDescription className="text-caption">
                  Active billing plans mapped across client tenants.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-space-4 pt-space-2">
                <div className="space-y-space-1">
                  <div className="flex justify-between text-caption">
                    <span>Professional Tier ($79/mo)</span>
                    <span className="text-primary font-mono">8 active (66.7%)</span>
                  </div>
                  <div className="w-full bg-border h-2 radius-md overflow-hidden">
                    <div className="bg-primary h-full radius-md w-2/3" />
                  </div>
                </div>

                <div className="space-y-space-1">
                  <div className="flex justify-between text-caption">
                    <span>Business Tier ($299/mo)</span>
                    <span className="text-warning-500 font-mono">2 active (16.7%)</span>
                  </div>
                  <div className="w-full bg-border h-2 radius-md overflow-hidden">
                    <div className="bg-warning-500 h-full radius-md w-1/6" />
                  </div>
                </div>

                <div className="space-y-space-1">
                  <div className="flex justify-between text-caption">
                    <span>Starter Trial ($0/mo)</span>
                    <span className="text-muted-foreground font-mono">2 active (16.7%)</span>
                  </div>
                  <div className="w-full bg-border h-2 radius-md overflow-hidden">
                    <div className="bg-muted h-full radius-md w-1/6" />
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="bg-card/45 border border-border/50">
              <CardHeader>
                <CardTitle className="text-body-md flex items-center gap-space-2">
                  <Percent className="h-5 w-5 text-success" />
                  Conversion & Growth Funnels
                </CardTitle>
                <CardDescription className="text-caption">
                  Customer signup conversion ratios.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-space-4 pt-space-2">
                <div className="space-y-space-1">
                  <div className="flex justify-between text-caption">
                    <span>Trial Conversion Rate</span>
                    <span className="font-mono text-foreground">34.8%</span>
                  </div>
                  <div className="w-full bg-border h-2 radius-md overflow-hidden">
                    <div className="bg-success-500 h-full radius-md w-1/3" />
                  </div>
                </div>

                <div className="space-y-space-1">
                  <div className="flex justify-between text-caption">
                    <span>Upgrade Rate (Professional ➜ Business)</span>
                    <span className="font-mono text-foreground">12.5%</span>
                  </div>
                  <div className="w-full bg-border h-2 radius-md overflow-hidden">
                    <div className="bg-primary-500 h-full radius-md w-1/8" />
                  </div>
                </div>

                <div className="space-y-space-1">
                  <div className="flex justify-between text-caption">
                    <span>Refund Rate</span>
                    <span className="font-mono text-foreground">0.8%</span>
                  </div>
                  <div className="w-full bg-border h-2 radius-md overflow-hidden">
                    <div className="bg-destructive h-full radius-md w-0" />
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      )}
    </div>
  );
}
