"use client";

import { useState, useTransition } from "react";
import {
  CreditCard,
  Plus,
  Trash2,
  CheckCircle2,
  AlertCircle,
  RefreshCw,
  Check,
  Sliders,
  DollarSign,
  TrendingUp,
  Activity,
  Tag,
  Gift,
} from "lucide-react";
import { Badge } from "@/components/shared/badge";
import { Button } from "@/components/shared/button";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/shared/tabs";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/shared/card";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/shared/dialog";
import { Input } from "@/components/shared/input";
import { Label } from "@/components/shared/label";
import { useToast } from "@/components/shared/toast";
import { formatUserErrorMessage } from "@/lib/errors";
import { createResellerPlanAction, deleteResellerPlanAction } from "@/server/actions/agency";
import { createCouponAction } from "@/server/actions/billing";
import { ConfirmDialog } from "@/components/shared/confirm-dialog";
import { NativeSelect, NativeTable } from "@/components/shared/native";
import { ScrollArea } from "@/components/ui/scroll-area";

interface ResellerPlan {
  id: string;
  name: string;
  price: string;
  interval: string;
  limits: any;
  createdAt: Date;
}

export function AgencyBillingClient({
  initialPlans,
  initialCoupons,
}: {
  initialPlans: any[];
  initialCoupons: any[];
}) {
  const [plans, setPlans] = useState<ResellerPlan[]>(initialPlans as ResellerPlan[]);
  const [coupons, setCoupons] = useState<any[]>(initialCoupons);
  const [activeTab, setActiveTab] = useState<"plans" | "coupons">("plans");
  const [confirmDialogId, setConfirmDialogId] = useState<string | null>(null);
  const toast = useToast();

  // Plans Form State
  const [isPlanOpen, setIsPlanOpen] = useState(false);
  const [planName, setPlanName] = useState("");
  const [planPrice, setPlanPrice] = useState("");
  const [planInterval, setPlanInterval] = useState("month");
  const [seatsLimit, setSeatsLimit] = useState("5");
  const [minutesLimit, setMinutesLimit] = useState("500");
  const [planError, setPlanError] = useState<string | null>(null);

  // Coupons Form State
  const [isCouponOpen, setIsCouponOpen] = useState(false);
  const [couponCode, setCouponCode] = useState("");
  const [couponType, setCouponType] = useState<"percent" | "fixed" | "free_months">("percent");
  const [couponValue, setCouponValue] = useState("");
  const [couponDays, setCouponDays] = useState("30");
  const [couponError, setCouponError] = useState<string | null>(null);

  const [isPending, startTransition] = useTransition();

  const handleCreatePlan = () => {
    if (!planName.trim()) {
      setPlanError("Plan Name is required.");
      return;
    }
    if (!planPrice.trim() || isNaN(parseFloat(planPrice))) {
      setPlanError("Please enter a valid price.");
      return;
    }

    setPlanError(null);
    startTransition(async () => {
      const res = await createResellerPlanAction({
        name: planName,
        price: parseFloat(planPrice).toFixed(2),
        limits: {
          seatsLimit: parseInt(seatsLimit, 10) || 5,
          callMinutesLimit: parseInt(minutesLimit, 10) || 500,
          interval: planInterval,
        },
      });

      if (res.success && res.plan) {
        setPlans((prev) => [res.plan as unknown as ResellerPlan, ...prev]);
        setPlanName("");
        setPlanPrice("");
        setIsPlanOpen(false);
        toast.success("Plan Created", `Reseller plan "${planName}" has been created.`);
      } else {
        const errorMsg = formatUserErrorMessage(res.error, "Failed to create plan.");
        setPlanError(errorMsg);
        toast.error("Failed to create plan", errorMsg);
      }
    });
  };

  const handleDeletePlan = (planId: string) => {
    setConfirmDialogId(planId);
  };

  const handleConfirmDeletePlan = async () => {
    if (!confirmDialogId) return;
    const planId = confirmDialogId;
    setConfirmDialogId(null);

    const originalPlans = [...plans];
    setPlans((prev) => prev.filter((p) => p.id !== planId));

    const res = await deleteResellerPlanAction(planId);
    if (!res.success) {
      setPlans(originalPlans);
      toast.error("Failed to delete plan", formatUserErrorMessage(res.error));
    } else {
      toast.success("Plan Deleted", "Reseller plan has been removed.");
    }
  };

  const handleCreateCoupon = () => {
    if (!couponCode.trim()) {
      setCouponError("Coupon Code is required.");
      return;
    }
    if (!couponValue.trim() || isNaN(parseFloat(couponValue))) {
      setCouponError("Please enter a valid discount value.");
      return;
    }

    setCouponError(null);
    startTransition(async () => {
      const res = await createCouponAction({
        code: couponCode,
        type: couponType,
        value: couponValue,
        expirationDays: parseInt(couponDays, 10) || undefined,
      });

      if (res.success && res.coupon) {
        setCoupons((prev) => [res.coupon, ...prev]);
        setCouponCode("");
        setCouponValue("");
        setIsCouponOpen(false);
        toast.success("Coupon Created", `Coupon "${couponCode}" is now active.`);
      } else {
        const errorMsg = formatUserErrorMessage(res.error, "Failed to create coupon.");
        setCouponError(errorMsg);
        toast.error("Failed to create coupon", errorMsg);
      }
    });
  };

  return (
    <div className="space-y-space-6">
      {/* Sub Tabs */}
      <Tabs value={activeTab} onValueChange={(val: any) => setActiveTab(val)} variant="segmented" className="w-full max-w-xs">
        <TabsList className="w-full bg-muted/20 border border-border/20 p-space-1 radius-lg">
          <TabsTrigger value="plans" className="flex-1 text-caption cursor-pointer border-none">
            <Sliders className="h-3.5 w-3.5 mr-space-2 text-primary" />
            Pricing Plans
          </TabsTrigger>
          <TabsTrigger value="coupons" className="flex-1 text-caption cursor-pointer border-none">
            <Tag className="h-3.5 w-3.5 mr-space-2 text-warning-500" />
            Coupons
          </TabsTrigger>
        </TabsList>
      </Tabs>

      <div className="grid gap-space-8 lg:grid-cols-12">
        <div className="lg:col-span-8 space-y-space-6">
          {activeTab === "plans" ? (
            /* PLANS TAB */
            <Card className="bg-card/30 border border-border/50 overflow-hidden">
              <CardHeader className="flex flex-row items-center justify-between pb-space-4 border-b border-border/20">
                <div>
                  <CardTitle className="text-body-md flex items-center gap-space-2">
                    <DollarSign className="h-5 w-5 text-primary" />
                    Reseller Pricing Packages ({plans.length})
                  </CardTitle>
                  <CardDescription className="text-caption">
                    Create subscription packages that clients purchase to activate their workspace templates.
                  </CardDescription>
                </div>

                <Dialog open={isPlanOpen} onOpenChange={setIsPlanOpen}>
                  <DialogTrigger asChild>
                    <Button className="gap-space-1 text-primary-foreground px-space-4 py-space-2">
                      <Plus className="h-4 w-4" />
                      Add Package Plan
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="max-w-md bg-card border-border/80">
                    <DialogHeader>
                      <DialogTitle className="text-title-lg">Create Reseller Pricing Plan</DialogTitle>
                      <DialogDescription>
                        Configure billing parameters and consumption quota limits.
                      </DialogDescription>
                    </DialogHeader>

                    <div className="space-y-space-4 py-space-3">
                      <div className="space-y-space-2">
                        <Label className="text-body-sm">Plan Name</Label>
                        <Input
                          placeholder="e.g. Agency Pro Call Tier"
                          value={planName}
                          onChange={(e) => setPlanName(e.target.value)}
                        />
                      </div>

                      <div className="grid grid-cols-2 gap-space-4">
                        <div className="space-y-space-2">
                          <Label className="text-body-sm">Price per Period ($)</Label>
                          <Input
                            placeholder="199.00"
                            value={planPrice}
                            onChange={(e) => setPlanPrice(e.target.value)}
                          />
                        </div>

                        <div className="space-y-space-2">
                          <Label className="text-body-sm">Billing Period</Label>
                          <NativeSelect
                            value={planInterval}
                            onChange={(e) => setPlanInterval(e.target.value)}
                            className="w-full h-9 radius-md border border-input bg-transparent px-space-3 text-body-sm focus-visible:outline-hidden focus-visible:ring-1 focus-visible:ring-ring text-foreground"
                          >
                            <option value="month">Monthly Interval</option>
                            <option value="year">Annual Interval</option>
                          </NativeSelect>
                        </div>
                      </div>

                      <div className="grid grid-cols-2 gap-space-4">
                        <div className="space-y-space-2">
                          <Label className="text-body-sm">Seat User Limit</Label>
                          <Input
                            type="number"
                            placeholder="5"
                            value={seatsLimit}
                            onChange={(e) => setSeatsLimit(e.target.value)}
                          />
                        </div>

                        <div className="space-y-space-2">
                          <Label className="text-body-sm">Call Minutes Limit</Label>
                          <Input
                            type="number"
                            placeholder="500"
                            value={minutesLimit}
                            onChange={(e) => setMinutesLimit(e.target.value)}
                          />
                        </div>
                      </div>

                      {planError && (
                        <div className="p-space-3 bg-destructive/10 text-destructive border border-error-500/20 text-caption radius-lg flex items-center gap-space-2">
                          <AlertCircle className="h-4 w-4" />
                          <span>{planError}</span>
                        </div>
                      )}
                    </div>

                    <DialogFooter>
                      <Button variant="ghost" onClick={() => setIsPlanOpen(false)}>
                        Cancel
                      </Button>
                      <Button onClick={handleCreatePlan} disabled={isPending} className="text-primary-foreground">
                        {isPending ? <RefreshCw className="h-4 w-4 animate-spin mr-space-2" /> : null}
                        Save Package Plan
                      </Button>
                    </DialogFooter>
                  </DialogContent>
                </Dialog>
              </CardHeader>
              <CardContent className="p-space-0">
                {plans.length === 0 ? (
                  <div className="py-space-16 text-center text-muted-foreground text-body-sm">
                    No pricing plans defined yet. Create your first reseller package to begin selling.
                  </div>
                ) : (
                  <ScrollArea className="" vertical={false}>
                    <NativeTable className="w-full text-left border-collapse text-body-sm">
                      <thead>
                        <tr className="border-b border-border/30 bg-muted/20 text-caption uppercase tracking-wider text-muted-foreground">
                          <th className="px-space-6 py-space-4">Package Name</th>
                          <th className="px-space-6 py-space-4">Billing Rate</th>
                          <th className="px-space-6 py-space-4">Seat Limit</th>
                          <th className="px-space-6 py-space-4">Monthly Call Minutes</th>
                          <th className="px-space-6 py-space-4 text-right">Action</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-border/10 text-foreground">
                        {plans.map((plan) => (
                          <tr key={plan.id} className="hover:bg-accent/5 transition-colors">
                            <td className="px-space-6 py-space-4 text-foreground">{plan.name}</td>
                            <td className="px-space-6 py-space-4 font-mono text-caption text-primary">
                              ${plan.price} / {plan.interval}
                            </td>
                            <td className="px-space-6 py-space-4 font-mono text-caption">{plan.limits?.seatsLimit || 5} seats</td>
                            <td className="px-space-6 py-space-4 font-mono text-caption">{plan.limits?.callMinutesLimit || 500} minutes</td>
                            <td className="px-space-6 py-space-4 text-right">
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => handleDeletePlan(plan.id)}
                                className="text-destructive hover:text-error-500 hover:bg-destructive/10 cursor-pointer h-8 w-8 p-space-0"
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </NativeTable>
                  </ScrollArea>
                )}
              </CardContent>
            </Card>
          ) : (
            /* COUPONS TAB */
            <Card className="bg-card/30 border border-border/50 overflow-hidden">
              <CardHeader className="flex flex-row items-center justify-between pb-space-4 border-b border-border/20">
                <div>
                  <CardTitle className="text-body-md flex items-center gap-space-2">
                    <Tag className="h-5 w-5 text-warning-500" />
                    Coupon & Promotional Codes ({coupons.length})
                  </CardTitle>
                  <CardDescription className="text-caption">
                    Create promo campaigns, percentage discounts, flat fee reductions, or trial extensions for signups.
                  </CardDescription>
                </div>

                <Dialog open={isCouponOpen} onOpenChange={setIsCouponOpen}>
                  <DialogTrigger asChild>
                    <Button className="gap-space-1 text-primary-foreground px-space-4 py-space-2">
                      <Plus className="h-4 w-4" />
                      Add Coupon Code
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="max-w-md bg-card border-border/80">
                    <DialogHeader>
                      <DialogTitle className="text-title-lg">Create Discount Coupon</DialogTitle>
                      <DialogDescription>
                        Generate promotional codes to apply to client checkouts.
                      </DialogDescription>
                    </DialogHeader>

                    <div className="space-y-space-4 py-space-3">
                      <div className="space-y-space-2">
                        <Label className="text-body-sm">Coupon Code (Uppercase)</Label>
                        <Input
                          placeholder="e.g. SUMMER50"
                          value={couponCode}
                          onChange={(e) => setCouponCode(e.target.value.toUpperCase())}
                        />
                      </div>

                      <div className="grid grid-cols-2 gap-space-4">
                        <div className="space-y-space-2">
                          <Label className="text-body-sm">Discount Type</Label>
                          <NativeSelect
                            value={couponType}
                            onChange={(e) => setCouponType(e.target.value as any)}
                            className="w-full h-9 radius-md border border-input bg-transparent px-space-3 text-body-sm focus-visible:outline-hidden focus-visible:ring-1 focus-visible:ring-ring text-foreground"
                          >
                            <option value="percent">Percentage Reduction</option>
                            <option value="fixed">Fixed Dollar Value</option>
                            <option value="free_months">Free Months Offset</option>
                          </NativeSelect>
                        </div>

                        <div className="space-y-space-2">
                          <Label className="text-body-sm">Discount Value</Label>
                          <Input
                            placeholder="e.g. 50"
                            value={couponValue}
                            onChange={(e) => setCouponValue(e.target.value)}
                          />
                        </div>
                      </div>

                      <div className="space-y-space-2">
                        <Label className="text-body-sm">Expiration Duration (Days)</Label>
                        <Input
                          type="number"
                          placeholder="30"
                          value={couponDays}
                          onChange={(e) => setCouponDays(e.target.value)}
                        />
                      </div>

                      {couponError && (
                        <div className="p-space-3 bg-destructive/10 text-destructive border border-error-500/20 text-caption radius-lg flex items-center gap-space-2">
                          <AlertCircle className="h-4 w-4" />
                          <span>{couponError}</span>
                        </div>
                      )}
                    </div>

                    <DialogFooter>
                      <Button variant="ghost" onClick={() => setIsCouponOpen(false)}>
                        Cancel
                      </Button>
                      <Button onClick={handleCreateCoupon} disabled={isPending} className="text-primary-foreground">
                        {isPending ? <RefreshCw className="h-4 w-4 animate-spin mr-space-2" /> : null}
                        Save Coupon Code
                      </Button>
                    </DialogFooter>
                  </DialogContent>
                </Dialog>
              </CardHeader>
              <CardContent className="p-space-0">
                {coupons.length === 0 ? (
                  <div className="py-space-16 text-center text-muted-foreground text-body-sm">
                    No active discount coupons defined. Generate code campaigns to incentivize subscriptions.
                  </div>
                ) : (
                  <ScrollArea className="" vertical={false}>
                    <NativeTable className="w-full text-left border-collapse text-body-sm">
                      <thead>
                        <tr className="border-b border-border/30 bg-muted/20 text-caption uppercase tracking-wider text-muted-foreground">
                          <th className="px-space-6 py-space-4">Promo Code</th>
                          <th className="px-space-6 py-space-4">Type</th>
                          <th className="px-space-6 py-space-4">Discount Value</th>
                          <th className="px-space-6 py-space-4">Status</th>
                          <th className="px-space-6 py-space-4">Expirations</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-border/10 text-foreground">
                        {coupons.map((c) => (
                          <tr key={c.id} className="hover:bg-accent/5 transition-colors">
                            <td className="px-space-6 py-space-4 font-mono text-primary">{c.code}</td>
                            <td className="px-space-6 py-space-4 capitalize">{c.type.replace("_", " ")}</td>
                            <td className="px-space-6 py-space-4 font-mono text-caption">
                              {c.type === "percent" ? `${c.value}%` : c.type === "fixed" ? `$${c.value}` : `${c.value} month(s)`}
                            </td>
                            <td className="px-space-6 py-space-4">
                              <Badge variant="success">Active</Badge>
                            </td>
                            <td className="px-space-6 py-space-4 font-mono text-caption text-muted-foreground">
                              {c.expirationDate ? new Date(c.expirationDate).toLocaleDateString() : "Never Expires"}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </NativeTable>
                  </ScrollArea>
                )}
              </CardContent>
            </Card>
          )}
        </div>

        {/* Metering stats column */}
        <div className="lg:col-span-4 space-y-space-6">
          <Card className="bg-card/30 border border-border/50 overflow-hidden">
            <CardHeader className="pb-space-4 border-b border-border/20">
              <CardTitle className="text-body-md flex items-center gap-space-2">
                <Activity className="h-5 w-5 text-primary" />
                Resource Metering Quota
              </CardTitle>
              <CardDescription className="text-caption">
                Review aggregate resource consumption across all workspaces.
              </CardDescription>
            </CardHeader>
            <CardContent className="p-space-4 space-y-space-4 text-caption">
              <div className="space-y-space-1">
                <div className="flex justify-between">
                  <span>Provisioned Seats</span>
                  <span className="text-muted-foreground font-mono">12 / 50 active</span>
                </div>
                <div className="w-full bg-border h-2 radius-md overflow-hidden">
                  <div className="bg-primary h-full radius-md w-1/4" />
                </div>
              </div>

              <div className="space-y-space-1">
                <div className="flex justify-between">
                  <span>Call Minutes (Monthly)</span>
                  <span className="text-muted-foreground font-mono">842 / 5,000 min</span>
                </div>
                <div className="w-full bg-border h-2 radius-md overflow-hidden">
                  <div className="bg-success-500 h-full radius-md w-1/6" />
                </div>
              </div>

              <div className="space-y-space-1">
                <div className="flex justify-between">
                  <span>AI Token Quotas</span>
                  <span className="text-muted-foreground font-mono">1.2M / 10M tokens</span>
                </div>
                <div className="w-full bg-border h-2 radius-md overflow-hidden">
                  <div className="bg-warning-500 h-full radius-md w-1/8" />
                </div>
              </div>

              <div className="border-t border-border/10 pt-space-4 p-space-4 bg-primary/5 radius-lg border border-primary/20 leading-relaxed text-muted-foreground">
                <span className="text-primary flex items-center gap-space-2 mb-space-1">
                  <CreditCard className="h-4 w-4" />
                  Reseller Billing Plan:
                </span>
                <p>
                  Your agency is active on the <strong className="text-foreground">Reseller Pro Plan</strong>. 
                  Next billing date is July 21, 2026.
                </p>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      <ConfirmDialog
        open={!!confirmDialogId}
        onOpenChange={(open) => !open && setConfirmDialogId(null)}
        title="Delete Custom Plan"
        description="Are you sure you want to delete this custom plan?"
        onConfirm={handleConfirmDeletePlan}
        confirmText="Delete"
      />
    </div>
  );
}