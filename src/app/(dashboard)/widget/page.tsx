"use client";

import { useState, useEffect } from"react";
import Image from"next/image";
import { getWidgetSettingsAction, saveWidgetSettingsAction, addDomainAction, deleteDomainAction, verifyDomainAction, resetThemeToBrandAction } from"@/server/actions/widget";
import { 
 Code, 
 Settings, 
 Globe, 
 Sparkles, 
 BarChart2, 
 Save, 
 Loader2, 
 Check, 
 Copy, 
 Plus, 
 Trash2, 
 RefreshCw, 
 AlertCircle, 
 ExternalLink,
 MessageSquare,
 Palette,
 Play,
 X,
 Send,
 Sun,
 Moon
} from"lucide-react";
import { Button } from "@/components/shared/button";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/shared/tabs";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from"@/components/shared/card";
import { Input } from"@/components/shared/input";
import { Label } from"@/components/shared/label";
import { PageTitle } from"@/components/shared/page-title";
import { useToast } from "@/components/shared/toast";
import { formatUserErrorMessage } from "@/lib/errors";
import { cn } from"@/components/shared/utils";
import { AreaChartCard } from"@/components/charts";
import { NativeSelect } from "@/components/shared/native";
import { ScrollArea } from "@/components/ui/scroll-area";

export default function WidgetSettingsPage() {
 const [loading, setLoading] = useState(true);
 const [isSaving, setIsSaving] = useState(false);
 const [saveSuccess, setSaveSuccess] = useState(false);
 const [errorMsg, setErrorMsg] = useState("");
 const toast = useToast();
 
 const [activeTab, setActiveTab] = useState<"install"|"branding"|"appearance"|"triggers"|"analytics">("install");
 
 // Settings States
 const [orgId, setOrgId] = useState("");
 const [enabled, setEnabled] = useState(true);
 
 // Theme State
 const [theme, setTheme] = useState({
 themeMode:"light",
 primaryColor:"#7a5af8",
 backgroundColor:"#ffffff",
 textColor:"#18181b",
 borderColor:"#e4e4e7",
 borderRadius:"0.75rem"
 });

 // Branding State
 const [branding, setBranding] = useState({
 companyName:"",
 tagline:"AI Assistant",
 welcomeMessage:"Hello! How can I help you today?",
 logoUrl:"",
 avatarUrl:""
 });

 // Launcher State
 const [launcher, setLauncher] = useState({
 position:"bottom_right",
 icon:"message-square",
 size:"medium",
 spacingX: 20,
 spacingY: 20
 });

 // Customization State
 const [customization, setCustomization] = useState({
 starterQuestions: [] as string[],
 suggestedActions: [] as any[],
 proactiveTriggers: {
 timeOnPage: 10,
 scrollDepth: 50,
 exitIntent: false,
 active: false
 },
 widgetWidth: 380,
 widgetHeight: 600,
 shadowStyle:"lg"
 });

 const [domains, setDomains] = useState<any[]>([]);
 const [installations, setInstallations] = useState<any[]>([]);
 const [analytics, setAnalytics] = useState<any>({
 widgetOpens: 0,
 conversationStarts: 0,
 bookingsCount: 0,
 leadCapturesCount: 0,
 engagementRate: 0,
 conversionRate: 0
 });

 // Action inputs
 const [newDomain, setNewDomain] = useState("");
 const [addingDomain, setAddingDomain] = useState(false);
 const [verifyingId, setVerifyingId] = useState<string | null>(null);
 
 // Question inputs
 const [newQuestion, setNewQuestion] = useState("");
 const [copied, setCopied] = useState(false);

 const loadData = async () => {
 setLoading(true);
 const res = await getWidgetSettingsAction();
 if (res.success && res.data) {
 const d = res.data;
 setOrgId(d.config.organizationId);
 setEnabled(d.config.enabled);
 setTheme(d.theme);
 setBranding({
 companyName: d.branding.companyName,
 tagline: d.branding.tagline ||"",
 welcomeMessage: d.branding.welcomeMessage ||"",
 logoUrl: d.branding.logoUrl ||"",
 avatarUrl: d.branding.avatarUrl ||""
 });
 setLauncher(d.launcher);
 setCustomization(d.customization as any);
 setDomains(d.domains);
 setInstallations(d.installations);
 setAnalytics(d.analytics);
 } else {
 setErrorMsg(res.error ||"Failed to load settings.");
 }
 setLoading(false);
 };

 useEffect(() => {
 loadData();
 }, []);

 const handleSave = async (e: React.FormEvent) => {
 e.preventDefault();
 setIsSaving(true);
 setSaveSuccess(false);
 setErrorMsg("");

 const res = await saveWidgetSettingsAction({
 enabled,
 theme,
 branding,
 launcher,
 customization
 });

 if (res.success) {
 setSaveSuccess(true);
 setTimeout(() => setSaveSuccess(false), 3000);
 loadData();
 } else {
 setErrorMsg(res.error ||"Failed to save configurations.");
 }
 setIsSaving(false);
 };

 const handleAddDomain = async (e: React.FormEvent) => {
 e.preventDefault();
 if (!newDomain.trim()) return;
 setAddingDomain(true);
 const res = await addDomainAction(newDomain);
 if (res.success) {
 setNewDomain("");
 loadData();
 } else {
 setErrorMsg(res.error ||"Failed to add domain.");
 }
 setAddingDomain(false);
 };

  const handleDeleteDomain = async (id: string) => {
    const confirm = window.confirm("Are you sure you want to delete this domain whitelist?");
    if (!confirm) return;
    const res = await deleteDomainAction(id);
    if (res.success) {
      toast.success("Domain Removed", "Domain whitelist entry deleted.");
      loadData();
    } else {
      const msg = formatUserErrorMessage(res.error, "Failed to remove domain.");
      setErrorMsg(msg);
      toast.error("Failed to remove domain", msg);
    }
  };

  const handleVerifyDomain = async (id: string) => {
    setVerifyingId(id);
    const res = await verifyDomainAction(id);
    if (res.success) {
      toast.success("Domain Verified", res.message || "Domain is active and verified.");
      loadData();
    } else {
      const msg = formatUserErrorMessage(res.error, "Verification check failed.");
      setErrorMsg(msg);
      toast.error("Verification Failed", msg);
    }
    setVerifyingId(null);
  };

 const copySnippet = () => {
 const snippet =`<script src="${window.location.origin}/widget.js"data-org-id="${orgId}"></script>`;
 navigator.clipboard.writeText(snippet);
 setCopied(true);
 setTimeout(() => setCopied(false), 2000);
 };

 const handleAddQuestion = () => {
 if (!newQuestion.trim()) return;
 setCustomization({
 ...customization,
 starterQuestions: [...customization.starterQuestions, newQuestion.trim()]
 });
 setNewQuestion("");
 };

 const handleRemoveQuestion = (idx: number) => {
 setCustomization({
 ...customization,
 starterQuestions: customization.starterQuestions.filter((_, i) => i !== idx)
 });
 };

 const handleToggleAction = (type: string, label: string) => {
 const exists = customization.suggestedActions.some((a) => a.type === type);
 let updatedActions = [];
 if (exists) {
 updatedActions = customization.suggestedActions.filter((a) => a.type !== type);
 } else {
 updatedActions = [...customization.suggestedActions, { type, label }];
 }
 setCustomization({ ...customization, suggestedActions: updatedActions });
 };

 const handleResetTheme = async () => {
 const confirm = window.confirm("Are you sure you want to reset your widget appearance to Operator brand defaults?");
 if (!confirm) return;
 setIsSaving(true);
 const res = await resetThemeToBrandAction();
 if (res.success && res.theme) {
 setTheme(res.theme);
 setSaveSuccess(true);
 setTimeout(() => setSaveSuccess(false), 3000);
 } else {
 setErrorMsg(res.error ||"Failed to reset theme.");
 }
 setIsSaving(false);
 };

 if (loading) {
 return (
 <div className="h-96 flex flex-col items-center justify-center text-caption text-muted-foreground gap-space-2">
 <Loader2 className="h-5 w-5 animate-spin text-primary"/>
 Configuring live branding panel...
 </div>
 );
 }

 return (
 <div className="space-y-space-6">
 {/* Header */}
 <PageTitle
 title="Website Widget"
 description="Customize messenger themes, whitelist domains, copy script snippets, and view engagement analytics."
 />

 {errorMsg && (
 <div className="flex items-center gap-space-2 radius-lg bg-error-500/10 border border-error-500/20 p-space-3 text-caption text-error-500">
 <AlertCircle className="h-4 w-4"/>
 <span>{errorMsg}</span>
 <Button className="ml-auto"onClick={() => setErrorMsg("")}>X</Button>
 </div>
 )}

 {saveSuccess && (
 <div className="flex items-center gap-space-2 p-space-3 radius-md bg-success-500/10 border border-success-500/20 text-caption text-success-500">
 <Check className="h-4 w-4"/> Widget configurations saved successfully.
 </div>
 )}

 {/* Main Split Layout: Customizers on Left, Sticky Preview on Right */}
 <div className="flex flex-col lg:flex-row gap-space-8 items-start w-full">
 
 {/* Sidebar Sub-Navigation */}
 <Tabs value={activeTab} onValueChange={(val: any) => { setActiveTab(val); setSaveSuccess(false); }} variant="default" orientation="vertical" className="w-full lg:w-56 shrink-0">
 <TabsList className="w-full flex flex-row lg:flex-col lg:overflow-x-visible pb-space-2 lg:pb-space-0 border-b lg:border-b-0 lg:border-r border-border/60 lg:pr-space-6 gap-space-1.5 whitespace-nowrap lg:whitespace-normal bg-transparent border-none"><ScrollArea className="h-full w-full" vertical={false}>
 {[
 { id:"install", label:"Installation", icon: Code },
 { id:"branding", label:"Branding", icon: Sparkles },
 { id:"appearance", label:"Appearance", icon: Palette },
 { id:"triggers", label:"Triggers & Actions", icon: Settings },
 { id:"analytics", label:"Analytics", icon: BarChart2 }
 ].map((tab) => {
 const Icon = tab.icon;
 const isSelected = activeTab === tab.id;
 return (
 <TabsTrigger
 key={tab.id}
 value={tab.id}
 className="flex items-center gap-space-2.5 px-space-3.5 py-space-2.5 text-caption font-medium transition-all duration-200 cursor-pointer w-auto lg:w-full text-left radius-lg relative select-none border-none"
 >
 {isSelected && (
 <span className="absolute left-space-0 top-space-2.5 bottom-space-2.5 w-0.75 bg-primary radius-full hidden lg:block"/>
 )}
 <Icon className="h-4 w-4 shrink-0 text-current"/>
 <span className="leading-none">{tab.label}</span>
 </TabsTrigger>
 );
 })}
 </ScrollArea></TabsList>
 </Tabs>

 {/* Center: Configuration Panels */}
 <div className="flex-1 min-w-0 space-y-space-6">
 <form onSubmit={handleSave} className="space-y-space-6">

 {/* TAB 1: INSTALLATION & DOMAINS */}
 {activeTab ==="install"&& (
 <div className="space-y-space-6 animate-fade-in">
 {/* 1. Install Script */}
 <Card className="border-border/60 bg-card/30 backdrop-blur-xs flex flex-col justify-between hover:border-primary/20 transition-all duration-300">
 <CardHeader className="pb-space-4 border-b border-border/10">
 <div className="flex items-center justify-between">
 <div className="h-9 w-9 radius-lg bg-primary-500/10 border border-primary-500/20 flex items-center justify-center text-primary-400">
 <Code className="h-5 w-5"/>
 </div>
 <span className="text-caption bg-primary-500/10 text-primary border border-primary-500/20 px-space-2 py-space-1 radius-full">HTML Integration</span>
 </div>
 <CardTitle className="text-body-sm font-semibold text-foreground mt-space-4">Install Script Code</CardTitle>
 <CardDescription className="text-caption text-muted-foreground mt-space-1">
 Copy and paste this snippet right before the closing &lt;/body&gt; tag on any WordPress, HTML, Webflow, Shopify, or React host page.
 </CardDescription>
 </CardHeader>
 <div className="p-space-6 pt-space-5 bg-transparent">
 <div className="p-space-4 bg-background/50 border border-border/40 radius-xl flex items-center justify-between gap-space-4 font-mono text-caption text-muted-foreground/80">
 <span className="truncate select-all pr-space-2">{`<script src="${window.location.origin}/widget.js"data-org-id="${orgId}"></script>`}</span>
 <Button 
 type="button"
 variant="outline"
 className="h-8 shrink-0 text-caption gap-space-1.5 border-border/40 bg-background/80 hover:bg-background text-muted-foreground hover:text-foreground cursor-pointer px-space-4"
 onClick={copySnippet}
 >
 {copied ? <Check className="h-3.5 w-3.5 text-emerald-500 shrink-0"/> : <Copy className="h-3.5 w-3.5 shrink-0"/>}
 <span className="leading-none">{copied ?"Copied":"Copy"}</span>
 </Button>
 </div>
 </div>
 </Card>

 {/* 2. Whitelist Domains */}
 <Card className="border-border/60 bg-card/30 backdrop-blur-xs flex flex-col justify-between hover:border-primary/20 transition-all duration-300">
 <CardHeader className="pb-space-4 border-b border-border/10">
 <div className="flex items-center justify-between">
 <div className="h-9 w-9 radius-lg bg-success-500/10 border border-success-500/20 flex items-center justify-center text-success-500">
 <Globe className="h-5 w-5"/>
 </div>
 <span className="text-caption bg-success-500/10 text-success-500 border border-success-500/20 px-space-2 py-space-1 radius-full">Origin Whitelist</span>
 </div>
 <CardTitle className="text-body-sm font-semibold text-foreground mt-space-4">Allowed Whitelist Domains</CardTitle>
 <CardDescription className="text-caption text-muted-foreground mt-space-1">
 Restrict which websites can embed Operator AI to prevent theft or unauthorized access.
 </CardDescription>
 </CardHeader>
 <div className="p-space-6 pt-space-5 space-y-space-4 bg-transparent">
 <div className="flex gap-space-2 max-w-md items-end">
 <div className="flex-1 space-y-space-1.5 min-w-0">
 <Label htmlFor="domain_input"className="text-caption uppercase tracking-wider font-semibold text-muted-foreground/75">Domain URL</Label>
 <div className="relative">
 <Globe className="absolute left-space-3 top-space-3 h-3.5 w-3.5 text-muted-foreground/50 z-10 pointer-events-none"/>
 <Input
 id="domain_input"
 value={newDomain}
 onChange={(e) => setNewDomain(e.target.value)}
 placeholder="e.g. mybusiness.com"
 className="pl-space-9 h-9.5 text-caption bg-background/50 border-border/40 focus-visible:ring-primary/20 focus:border-primary/30"
 />
 </div>
 </div>
 <Button 
 type="button"
 onClick={handleAddDomain} 
 disabled={addingDomain || !newDomain.trim()}
 className="h-9.5 text-caption font-semibold text-white cursor-pointer gap-space-1.5 px-space-5 shrink-0 flex items-center bg-primary hover:bg-primary/90 transition-all duration-200"
 >
 {addingDomain ? (
 <>
 <Loader2 className="h-3.5 w-3.5 animate-spin shrink-0"/>
 <span className="leading-none">Adding...</span>
 </>
 ) : (
 <>
 <Plus className="h-3.5 w-3.5 shrink-0"/>
 <span className="leading-none">Add Domain</span>
 </>
 )}
 </Button>
 </div>

 {domains.length === 0 ? (
 <p className="text-caption text-muted-foreground/60 italic pt-space-2">No domains whitelisted. The widget will embed on any origin during testing.</p>
 ) : (
 <div className="space-y-space-2 pt-space-2">
 {domains.map((d) => (
 <div 
 key={d.id} 
 className="flex items-center justify-between p-space-3 px-space-4 radius-xl border border-border/10 bg-background/20 text-caption hover:bg-background/40 transition-colors duration-150"
 >
 <div className="space-y-space-1">
 <div className="flex items-center gap-space-2.5">
 <span className="text-foreground font-semibold">{d.domain}</span>
 {d.isVerified ? (
 <span className="inline-flex items-center text-caption font-semibold bg-emerald-500/8 border border-emerald-500/15 text-emerald-500 px-space-2 py-space-0.5 radius-full uppercase tracking-wider">Verified</span>
 ) : (
 <span className="inline-flex items-center text-caption font-semibold bg-amber-500/8 border border-amber-500/15 text-amber-500 px-space-2 py-space-0.5 radius-full uppercase tracking-wider">Pending DNS Check</span>
 )}
 </div>
 {!d.isVerified && (
 <p className="text-caption text-muted-foreground/80 leading-relaxed font-mono">
 Add TXT DNS Token: <code className="text-primary bg-background/50 border border-border/10 px-space-1.5 py-space-0.5 rounded font-semibold font-mono select-all">{d.verificationToken}</code>
 </p>
 )}
 </div>

 <div className="flex items-center gap-space-1.5">
 {!d.isVerified && (
 <Button
 type="button"
 variant="outline"
 className="h-7 text-caption font-semibold border-border/40 bg-background text-muted-foreground hover:text-foreground cursor-pointer radius-md px-space-2.5 flex items-center gap-space-1"
 onClick={() => handleVerifyDomain(d.id)}
 disabled={verifyingId === d.id}
 >
 {verifyingId === d.id ? <Loader2 className="h-3 w-3 animate-spin shrink-0"/> : <RefreshCw className="h-3 w-3 shrink-0"/>}
 <span className="leading-none">Verify DNS</span>
 </Button>
 )}
 <Button
 type="button"
 variant="ghost"
 className="h-7 w-7 text-error-500 hover:bg-error-500/5 cursor-pointer radius-md flex items-center justify-center p-space-0"
 onClick={() => handleDeleteDomain(d.id)}
 >
 <Trash2 className="h-3.5 w-3.5"/>
 </Button>
 </div>
 </div>
 ))}
 </div>
 )}
 </div>
 </Card>

 {/* 3. Connected Sites Health */}
 <Card className="border-border/60 bg-card/30 backdrop-blur-xs flex flex-col justify-between hover:border-primary/20 transition-all duration-300">
 <CardHeader className="pb-space-4 border-b border-border/10">
 <div className="flex items-center justify-between">
 <div className="h-9 w-9 radius-lg bg-warning-500/10 border border-warning-500/20 flex items-center justify-center text-warning-500">
 <RefreshCw className="h-5 w-5 animate-pulse"/>
 </div>
 <span className="text-caption bg-warning-500/10 text-warning-500 border border-warning-500/20 px-space-2 py-space-1 radius-full">Embed Health</span>
 </div>
 <CardTitle className="text-body-sm font-semibold text-foreground mt-space-4">Connected Sites Health</CardTitle>
 <CardDescription className="text-caption text-muted-foreground mt-space-1">
 Tracks active embeds communicating with our synchronization API.
 </CardDescription>
 </CardHeader>
 <div className="p-space-6 pt-space-5 bg-transparent">
 {installations.length === 0 ? (
 <p className="text-caption text-muted-foreground/60 italic">No script integrations detected. Insert script snippet to ping health status.</p>
 ) : (
 <div className="space-y-space-2">
 {installations.map((inst) => (
 <div 
 key={inst.id} 
 className="flex items-center justify-between p-space-3 px-space-4 radius-xl border border-border/10 bg-background/20 text-caption"
 >
 <div className="flex items-center gap-space-3">
 <span className="h-2 w-2 radius-full bg-emerald-500 animate-pulse shrink-0"/>
 <div>
 <span className="text-foreground font-semibold block">{inst.domain}</span>
 <span className="text-caption text-muted-foreground/60 block mt-space-0.5">Last Detected: {new Date(inst.lastDetectedAt).toLocaleString()}</span>
 </div>
 </div>
 <span className="inline-flex items-center text-caption font-semibold bg-emerald-500/8 border border-emerald-500/15 text-emerald-500 px-space-2.5 py-space-0.5 radius-full uppercase tracking-wider leading-none">Operational</span>
 </div>
 ))}
 </div>
 )}
 </div>
 </Card>
 </div>
 )}

 {/* TAB 2: BRANDING */}
 {activeTab ==="branding"&& (
 <div className="space-y-space-6 animate-fade-in">
 <Card className="border-border/60 bg-card/30 backdrop-blur-xs flex flex-col justify-between hover:border-primary/20 transition-all duration-300">
 <CardHeader className="pb-space-4 border-b border-border/10">
 <div className="flex items-center justify-between">
 <div className="h-9 w-9 radius-lg bg-primary-500/10 border border-primary-500/20 flex items-center justify-center text-primary-400">
 <Sparkles className="h-5 w-5"/>
 </div>
 <span className="text-caption bg-primary-500/10 text-primary border border-primary-500/20 px-space-2 py-space-1 radius-full">Chat Identity</span>
 </div>
 <CardTitle className="text-body-sm font-semibold text-foreground mt-space-4">Widget Branding & Identity</CardTitle>
 <CardDescription className="text-caption text-muted-foreground mt-space-1">
 Adjust how the header identity and avatar appears to client visitors.
 </CardDescription>
 </CardHeader>
 <div className="p-space-6 pt-space-5 bg-transparent">
 <div className="grid gap-space-4 sm:grid-cols-2">
 <div className="space-y-space-1.5">
 <Label htmlFor="companyName"className="text-caption uppercase tracking-wider font-semibold text-muted-foreground/75">Company Name</Label>
 <Input
 id="companyName"
 value={branding.companyName}
 onChange={(e) => setBranding({ ...branding, companyName: e.target.value })}
 className="h-9.5 text-caption bg-background/50 border-border/40 focus-visible:ring-primary/20"
 required
 />
 </div>
 <div className="space-y-space-1.5">
 <Label htmlFor="tagline"className="text-caption uppercase tracking-wider font-semibold text-muted-foreground/75">Header Tagline</Label>
 <Input
 id="tagline"
 value={branding.tagline}
 onChange={(e) => setBranding({ ...branding, tagline: e.target.value })}
 className="h-9.5 text-caption bg-background/50 border-border/40 focus-visible:ring-primary/20"
 />
 </div>
 </div>

 <div className="grid gap-space-4 sm:grid-cols-2 mt-space-4">
 <div className="space-y-space-1.5">
 <Label htmlFor="logoUrl"className="text-caption uppercase tracking-wider font-semibold text-muted-foreground/75">Logo Image URL</Label>
 <Input
 id="logoUrl"
 value={branding.logoUrl}
 onChange={(e) => setBranding({ ...branding, logoUrl: e.target.value })}
 placeholder="https://..."
 className="h-9.5 text-caption bg-background/50 border-border/40 focus-visible:ring-primary/20"
 />
 </div>
 <div className="space-y-space-1.5">
 <Label htmlFor="welcomeMessage"className="text-caption uppercase tracking-wider font-semibold text-muted-foreground/75">Welcome Message</Label>
 <Input
 id="welcomeMessage"
 value={branding.welcomeMessage}
 onChange={(e) => setBranding({ ...branding, welcomeMessage: e.target.value })}
 className="h-9.5 text-caption bg-background/50 border-border/40 focus-visible:ring-primary/20"
 />
 </div>
 </div>
 </div>
 <div className="pt-space-3 px-space-6 py-space-4 border-t border-border/10 flex gap-space-2 justify-end bg-transparent">
 <Button type="submit"disabled={isSaving} className="h-9 text-caption font-semibold text-white cursor-pointer gap-space-1.5 px-space-5 flex items-center bg-primary hover:bg-primary/90 transition-all duration-200">
 {isSaving ? (
 <>
 <Loader2 className="h-3.5 w-3.5 animate-spin shrink-0"/>
 <span className="leading-none">Saving...</span>
 </>
 ) : (
 <>
 <Save className="h-3.5 w-3.5 shrink-0"/>
 <span className="leading-none">Save Branding</span>
 </>
 )}
 </Button>
 </div>
 </Card>
 </div>
 )}

 {/* TAB 3: APPEARANCE */}
 {activeTab ==="appearance"&& (
 <div className="space-y-space-6 animate-fade-in">
 <Card className="border-border/60 bg-card/30 backdrop-blur-xs flex flex-col justify-between hover:border-primary/20 transition-all duration-300">
 <CardHeader className="pb-space-4 border-b border-border/10">
 <div className="flex items-center justify-between">
 <div className="h-9 w-9 radius-lg bg-success-500/10 border border-success-500/20 flex items-center justify-center text-success-500">
 <Palette className="h-5 w-5"/>
 </div>
 <span className="text-caption bg-success-500/10 text-success-500 border border-success-500/20 px-space-2 py-space-1 radius-full">Color System & Geometry</span>
 </div>
 <CardTitle className="text-body-sm font-semibold text-foreground mt-space-4">Color System & Geometry</CardTitle>
 <CardDescription className="text-caption text-muted-foreground mt-space-1">
 Style colors, sizes, and viewport parameters. Previews immediately on the right panel.
 </CardDescription>
 </CardHeader>
 <div className="p-space-6 pt-space-5 space-y-space-5 bg-transparent">

 {/* Theme Mode Toggle */}
 <div className="space-y-space-1.5">
 <Label className="text-caption uppercase tracking-wider font-semibold text-muted-foreground/75">Widget Theme Mode</Label>
 <div className="flex gap-space-2">
 {[
 { value:"light", label:"Light", icon: Sun, bgColor:"#ffffff", textColor:"#18181b", borderColor:"#e4e4e7"},
 { value:"dark", label:"Dark", icon: Moon, bgColor:"#09090b", textColor:"#fafafa", borderColor:"#27272a"}
 ].map((mode) => {
 const ModeIcon = mode.icon;
 const isActive = theme.themeMode === mode.value;
 return (
 <Button
 key={mode.value}
 type="button"
 onClick={() => setTheme({
 ...theme,
 themeMode: mode.value,
 backgroundColor: mode.bgColor,
 textColor: mode.textColor,
 borderColor: mode.borderColor
 })}
 className={cn(
 "flex-1 flex items-center justify-center gap-space-2 h-10 radius-xl border text-caption font-semibold transition-all duration-200 cursor-pointer select-none",
 isActive
 ?"border-primary bg-primary/8 text-primary 0_0_0_1px_hsl(var(--primary)/0.3)]"
 :"border-border/40 text-muted-foreground hover:border-primary/30 hover:text-foreground"
 )}
 >
 <ModeIcon className="h-3.5 w-3.5"/>
 {mode.label}
 </Button>
 );
 })}
 </div>
 </div>

 {/* Primary Color Selector */}
 <div className="grid gap-space-4 sm:grid-cols-3">
 <div className="space-y-space-1.5">
 <Label htmlFor="primaryColor"className="text-caption uppercase tracking-wider font-semibold text-muted-foreground/75">Primary Color</Label>
 <div className="flex items-center gap-space-2 p-space-2 radius-xl border border-border/40 bg-background/20">
 <div className="relative h-7 w-10 radius-lg overflow-hidden border border-border/10 shrink-0 flex items-center justify-center">
 <Input
 id="primaryColor"
 type="color"
 value={theme.primaryColor}
 onChange={(e) => setTheme({ ...theme, primaryColor: e.target.value })}
 className="absolute inset-space-0 h-full w-full opacity-0 cursor-pointer"
 />
 <div className="h-full w-full"style={{ backgroundColor: theme.primaryColor }} />
 </div>
 <Input
 type="text"
 value={theme.primaryColor}
 onChange={(e) => setTheme({ ...theme, primaryColor: e.target.value })}
 className="h-7 bg-transparent text-caption text-center font-mono flex-1 border-none focus-visible:ring-0 p-space-0"
 />
 </div>
 </div>

 <div className="space-y-space-1.5">
 <Label htmlFor="backgroundColor"className="text-caption uppercase tracking-wider font-semibold text-muted-foreground/75">Background CSS</Label>
 <div className="flex items-center gap-space-2 p-space-2 radius-xl border border-border/40 bg-background/20">
 <div className="relative h-7 w-10 radius-lg overflow-hidden border border-border/10 shrink-0 flex items-center justify-center">
 <Input
 id="backgroundColor"
 type="color"
 value={theme.backgroundColor}
 onChange={(e) => setTheme({ ...theme, backgroundColor: e.target.value })}
 className="absolute inset-space-0 h-full w-full opacity-0 cursor-pointer"
 />
 <div className="h-full w-full"style={{ backgroundColor: theme.backgroundColor }} />
 </div>
 <Input
 type="text"
 value={theme.backgroundColor}
 onChange={(e) => setTheme({ ...theme, backgroundColor: e.target.value })}
 className="h-7 bg-transparent text-caption text-center font-mono flex-1 border-none focus-visible:ring-0 p-space-0"
 />
 </div>
 </div>

 <div className="space-y-space-1.5">
 <Label htmlFor="textColor"className="text-caption uppercase tracking-wider font-semibold text-muted-foreground/75">Dialogue Text</Label>
 <div className="flex items-center gap-space-2 p-space-2 radius-xl border border-border/40 bg-background/20">
 <div className="relative h-7 w-10 radius-lg overflow-hidden border border-border/10 shrink-0 flex items-center justify-center">
 <Input
 id="textColor"
 type="color"
 value={theme.textColor}
 onChange={(e) => setTheme({ ...theme, textColor: e.target.value })}
 className="absolute inset-space-0 h-full w-full opacity-0 cursor-pointer"
 />
 <div className="h-full w-full"style={{ backgroundColor: theme.textColor }} />
 </div>
 <Input
 type="text"
 value={theme.textColor}
 onChange={(e) => setTheme({ ...theme, textColor: e.target.value })}
 className="h-7 bg-transparent text-caption text-center font-mono flex-1 border-none focus-visible:ring-0 p-space-0"
 />
 </div>
 </div>
 </div>

 <div className="grid gap-space-4 sm:grid-cols-2 border-t border-border/10 pt-space-4">
 <div className="space-y-space-1.5">
 <Label htmlFor="borderRadius"className="text-caption uppercase tracking-wider font-semibold text-muted-foreground/75">Border Radius</Label>
 <NativeSelect
 id="borderRadius"
 value={theme.borderRadius}
 onChange={(e) => setTheme({ ...theme, borderRadius: e.target.value })}
 className="flex h-9.5 w-full radius-xl border border-border/40 bg-background/50 px-space-3 py-space-1 text-caption text-foreground bg-popover focus:border-primary/20 cursor-pointer outline-none"
 >
 <option value="0rem">Sharp (0px)</option>
 <option value="0.25rem">Subtle (4px)</option>
 <option value="0.5rem">Medium (8px)</option>
 <option value="0.75rem">Large (12px)</option>
 <option value="1rem">X-Large (16px)</option>
 </NativeSelect>
 </div>

 <div className="space-y-space-1.5">
 <Label htmlFor="launcherPosition"className="text-caption uppercase tracking-wider font-semibold text-muted-foreground/75">Launcher Position</Label>
 <NativeSelect
 id="launcherPosition"
 value={launcher.position}
 onChange={(e) => setLauncher({ ...launcher, position: e.target.value })}
 className="flex h-9.5 w-full radius-xl border border-border/40 bg-background/50 px-space-3 py-space-1 text-caption text-foreground bg-popover focus:border-primary/20 cursor-pointer outline-none"
 >
 <option value="bottom_right">Bottom Right</option>
 <option value="bottom_left">Bottom Left</option>
 </NativeSelect>
 </div>
 </div>

 <div className="grid gap-space-4 sm:grid-cols-2 border-t border-border/10 pt-space-4">
 <div className="space-y-space-1.5">
 <Label htmlFor="widgetWidth"className="text-caption uppercase tracking-wider font-semibold text-muted-foreground/75">Widget Frame Width (px)</Label>
 <Input
 id="widgetWidth"
 type="number"
 min={320}
 max={500}
 value={customization.widgetWidth}
 onChange={(e) => setCustomization({ ...customization, widgetWidth: parseInt(e.target.value) || 380 })}
 className="h-9.5 text-caption bg-background/50 border-border/40 focus-visible:ring-primary/20"
 />
 </div>

 <div className="space-y-space-1.5">
 <Label htmlFor="widgetHeight"className="text-caption uppercase tracking-wider font-semibold text-muted-foreground/75">Widget Frame Height (px)</Label>
 <Input
 id="widgetHeight"
 type="number"
 min={450}
 max={800}
 value={customization.widgetHeight}
 onChange={(e) => setCustomization({ ...customization, widgetHeight: parseInt(e.target.value) || 600 })}
 className="h-9.5 text-caption bg-background/50 border-border/40 focus-visible:ring-primary/20"
 />
 </div>
 </div>
 </div>
 <div className="pt-space-3 px-space-6 py-space-4 border-t border-border/10 flex justify-between items-center bg-transparent">
 <Button 
 type="button"
 variant="outline"
 onClick={handleResetTheme} 
 className="h-9 text-caption font-semibold border-border/40 hover:bg-error-500/5 hover:text-error-500 transition-all px-space-4"
 >
 Reset to Brand Defaults
 </Button>
 <Button type="submit"disabled={isSaving} className="h-9 text-caption font-semibold text-white cursor-pointer gap-space-1.5 px-space-5 flex items-center bg-primary hover:bg-primary/90 transition-all duration-200">
 {isSaving ? (
 <>
 <Loader2 className="h-3.5 w-3.5 animate-spin shrink-0"/>
 <span className="leading-none">Saving...</span>
 </>
 ) : (
 <>
 <Save className="h-3.5 w-3.5 shrink-0"/>
 <span className="leading-none">Save Appearance</span>
 </>
 )}
 </Button>
 </div>
 </Card>
 </div>
 )}

 {/* TAB 4: TRIGGERS & ACTIONS */}
 {activeTab ==="triggers"&& (
 <div className="space-y-space-6 animate-fade-in">
 
 {/* Suggested actions grid */}
 <Card className="border-border/60 bg-card/30 backdrop-blur-xs flex flex-col justify-between hover:border-primary/20 transition-all duration-300">
 <CardHeader className="pb-space-4 border-b border-border/10">
 <div className="flex items-center justify-between">
 <div className="h-9 w-9 radius-lg bg-warning-500/10 border border-warning-500/20 flex items-center justify-center text-warning-500">
 <MessageSquare className="h-5 w-5"/>
 </div>
 <span className="text-caption bg-warning-500/10 text-warning-500 border border-warning-500/20 px-space-2 py-space-1 radius-full">Quick Replies</span>
 </div>
 <CardTitle className="text-body-sm font-semibold text-foreground mt-space-4">Suggested Quick Replies</CardTitle>
 <CardDescription className="text-caption text-muted-foreground mt-space-1">
 Choose which buttons appear instantly on the conversation footer to enable"no-typing"bookings.
 </CardDescription>
 </CardHeader>
 <div className="p-space-6 pt-space-5 bg-transparent">
 <div className="grid gap-space-3 sm:grid-cols-2">
 {[
 { type:"book", label:"Book Appointment"},
 { type:"services", label:"View Services"},
 { type:"pricing", label:"View Pricing"},
 { type:"hours", label:"Business Hours"},
 { type:"location", label:"Location"},
 { type:"human", label:"Speak to Human"}
 ].map((act) => {
 const isSelected = customization.suggestedActions.some((a) => a.type === act.type);
 return (
 <Button
 key={act.type}
 type="button"
 onClick={() => handleToggleAction(act.type, act.label)}
 className={cn(
 "flex items-center justify-between p-space-3.5 px-space-4 radius-xl border text-left transition-all duration-200 select-none cursor-pointer",
 isSelected
 ?"text-foreground"
 :"border-border/40 bg-background/25 text-muted-foreground hover:bg-[hsl(var(--foreground)/0.015)] hover:border-[hsl(var(--foreground)/0.1)]"
 )}
 style={isSelected ? { borderColor: theme.primaryColor, backgroundColor:`${theme.primaryColor}06`} : undefined}
 >
 <span className="text-caption font-semibold text-foreground">{act.label}</span>
 <div 
 className="h-4 w-4 radius-md border flex items-center justify-center transition-all duration-200 shrink-0 ml-space-2"
 style={{
 borderColor: isSelected ? theme.primaryColor :"rgba(122, 90, 248, 0.15)",
 backgroundColor: isSelected ? theme.primaryColor :"transparent",
 color: isSelected ?"#ffffff":"transparent"
 }}
 >
 {isSelected && <Check className="h-2.5 w-2.5 stroke-[3] text-white"/>}
 </div>
 </Button>
 );
 })}
 </div>
 </div>
 </Card>

 {/* Starter Questions */}
 <Card className="border-border/60 bg-card/30 backdrop-blur-xs flex flex-col justify-between hover:border-primary/20 transition-all duration-300">
 <CardHeader className="pb-space-4 border-b border-border/10">
 <div className="flex items-center justify-between">
 <div className="h-9 w-9 radius-lg bg-primary-500/10 border border-primary-500/20 flex items-center justify-center text-primary-400">
 <Plus className="h-5 w-5"/>
 </div>
 <span className="text-caption bg-primary-500/10 text-primary border border-primary-500/20 px-space-2 py-space-1 radius-full">Conversation Starters</span>
 </div>
 <CardTitle className="text-body-sm font-semibold text-foreground mt-space-4">Conversation Starter Questions</CardTitle>
 <CardDescription className="text-caption text-muted-foreground mt-space-1">
 These questions are introduced during initial empty conversation session loads.
 </CardDescription>
 </CardHeader>
 <div className="p-space-6 pt-space-5 space-y-space-4 bg-transparent">
 <div className="flex gap-space-2 max-w-lg items-end">
 <div className="flex-1 space-y-space-1.5 min-w-0">
 <Label htmlFor="starter_question"className="text-caption uppercase tracking-wider font-semibold text-muted-foreground/75">Starter Question</Label>
 <Input
 id="starter_question"
 value={newQuestion}
 onChange={(e) => setNewQuestion(e.target.value)}
 placeholder="Add a starter question..."
 className="h-9.5 text-caption bg-background/50 border-border/40 focus-visible:ring-primary/20"
 />
 </div>
 <Button 
 type="button"
 onClick={handleAddQuestion} 
 disabled={!newQuestion.trim()}
 className="h-9.5 text-caption font-semibold text-white cursor-pointer gap-space-1.5 px-space-5 shrink-0 flex items-center hover:brightness-110 active:brightness-95 transition-all duration-200 bg-primary hover:bg-primary/95"
 >
 <Plus className="h-3.5 w-3.5 shrink-0"/>
 <span className="leading-none">Add Question</span>
 </Button>
 </div>

 <div className="space-y-space-2">
 {customization.starterQuestions.map((q, idx) => (
 <div 
 key={idx} 
 className="flex items-center justify-between p-space-3 px-space-4 radius-xl border border-border/10 bg-background/20 text-caption hover:bg-background/40 transition-colors duration-150"
 >
 <span className="text-foreground font-semibold">{q}</span>
 <Button 
 type="button"
 variant="ghost"
 className="h-7 w-7 text-error-500 hover:bg-error-500/5 cursor-pointer radius-md flex items-center justify-center p-space-0"
 onClick={() => handleRemoveQuestion(idx)}
 >
 <X className="h-3.5 w-3.5"/>
 </Button>
 </div>
 ))}
 </div>
 </div>
 </Card>

 {/* Proactive Triggers */}
 <Card className="border-border/60 bg-card/30 backdrop-blur-xs flex flex-col justify-between hover:border-primary/20 transition-all duration-300">
 <CardHeader className="pb-space-4 border-b border-border/10">
 <div className="flex items-center justify-between">
 <div className="h-9 w-9 radius-lg bg-success-500/10 border border-success-500/20 flex items-center justify-center text-success-500">
 <Settings className="h-5 w-5"/>
 </div>
 <span className="text-caption bg-success-500/10 text-success-500 border border-success-500/20 px-space-2 py-space-1 radius-full">Popup Trigger</span>
 </div>
 <CardTitle className="text-body-sm font-semibold text-foreground mt-space-4">Proactive Message Popups</CardTitle>
 <CardDescription className="text-caption text-muted-foreground mt-space-1">
 Configure when the widget launcher automatically expands to catch user attention.
 </CardDescription>
 </CardHeader>
 <div className="p-space-6 pt-space-5 space-y-space-4 bg-transparent">
 <Button
 type="button"
 onClick={() => setCustomization({
 ...customization,
 proactiveTriggers: {
 ...customization.proactiveTriggers,
 active: !customization.proactiveTriggers.active
 }
 })}
 className={cn(
 "flex items-start justify-between w-full p-space-4 radius-xl border text-left transition-all duration-200 select-none cursor-pointer",
 customization.proactiveTriggers.active
 ?""
 :"border-border/40 bg-background/25 hover:bg-[hsl(var(--foreground)/0.015)]"
 )}
 style={customization.proactiveTriggers.active ? { borderColor: theme.primaryColor, backgroundColor:`${theme.primaryColor}06`} : undefined}
 >
 <div>
 <span className="text-caption font-semibold text-foreground block">Enable Proactive Expansion</span>
 <span className="text-caption text-muted-foreground/60 block mt-space-1">Launches the widget frame dynamically on page triggers.</span>
 </div>
 <div 
 className="h-4.5 w-4.5 radius-md border flex items-center justify-center transition-all duration-200 shrink-0 ml-space-2 mt-space-0.5"
 style={{
 borderColor: customization.proactiveTriggers.active ? theme.primaryColor :"rgba(122, 90, 248, 0.15)",
 backgroundColor: customization.proactiveTriggers.active ? theme.primaryColor :"transparent",
 color: customization.proactiveTriggers.active ?"#ffffff":"transparent"
 }}
 >
 {customization.proactiveTriggers.active && <Check className="h-3 w-3 stroke-[3] text-white"/>}
 </div>
 </Button>

 {customization.proactiveTriggers.active && (
 <div className="space-y-space-1.5 max-w-xs pt-space-2 animate-fade-in">
 <Label htmlFor="triggerSeconds"className="text-caption uppercase tracking-wider font-semibold text-muted-foreground/75">Delay Trigger (seconds on page)</Label>
 <Input
 id="triggerSeconds"
 type="number"
 min={1}
 value={customization.proactiveTriggers.timeOnPage}
 onChange={(e) => setCustomization({
 ...customization,
 proactiveTriggers: {
 ...customization.proactiveTriggers,
 timeOnPage: parseInt(e.target.value) || 5
 }
 })}
 className="h-9.5 text-caption bg-background/50 border-border/40 focus-visible:ring-primary/20"
 />
 </div>
 )}
 </div>
 <div className="pt-space-3 px-space-6 py-space-4 border-t border-border/10 flex justify-end bg-transparent">
 <Button 
 type="submit"
 disabled={isSaving} 
 className="h-9 text-caption font-semibold text-white cursor-pointer gap-space-1.5 px-space-5 flex items-center hover:brightness-110 active:brightness-95 transition-all duration-200 bg-primary hover:bg-primary/90"
 >
 {isSaving ? (
 <>
 <Loader2 className="h-3.5 w-3.5 animate-spin shrink-0"/>
 <span className="leading-none">Saving...</span>
 </>
 ) : (
 <>
 <Save className="h-3.5 w-3.5 shrink-0"/>
 <span className="leading-none">Save Triggers</span>
 </>
 )}
 </Button>
 </div>
 </Card>
 </div>
 )}

 {/* TAB 5: ANALYTICS */}
 {activeTab ==="analytics"&& (
 <div className="space-y-space-6 animate-fade-in">
 <div className="grid grid-cols-2 sm:grid-cols-4 gap-space-4">
 {[
 { label:"Widget Opens", value: analytics.widgetOpens },
 { label:"Chat Starts", value: analytics.conversationStarts },
 { label:"Bookings Completed", value: analytics.bookingsCount },
 { label:"Leads Qualified", value: analytics.leadCapturesCount }
 ].map((stat, i) => (
 <Card key={i} className="border-border/60 bg-card/30 backdrop-blur-xs hover:border-primary/10 transition-all duration-300">
 <div className="p-space-5 flex flex-col justify-between min-h-24">
 <span className="text-caption uppercase font-semibold tracking-wider text-muted-foreground/75 leading-none block">{stat.label}</span>
 <span className="text-title-lg font-semibold text-foreground mt-space-3 leading-none">{stat.value}</span>
 </div>
 </Card>
 ))}
 </div>

 <div className="grid grid-cols-1 gap-space-4">
 <div className="bg-card border border-border-default radius-xl overflow-hidden flex flex-col">
 <div className="p-space-5 pb-space-2 shrink-0">
 <h3 className="text-body-sm font-semibold">Engagement Trend</h3>
 <p className="text-caption text-muted-foreground">Widget opens vs active chats over time</p>
 </div>
 <div className="flex-1 p-space-5 pt-space-0">
 <AreaChartCard 
 data={[
 { date:"Mon", opens: 120, chats: 45 },
 { date:"Tue", opens: 145, chats: 52 },
 { date:"Wed", opens: 132, chats: 48 },
 { date:"Thu", opens: 180, chats: 75 },
 { date:"Fri", opens: 165, chats: 62 },
 { date:"Sat", opens: 90, chats: 25 },
 { date:"Sun", opens: 85, chats: 30 },
 ]}
 index="date"
 categories={["opens","chats"]}
 colors={["#a1a1aa","#7a5af8"]}
 height={260}
 />
 </div>
 </div>

 <Card className="border-border/60 bg-card/30 backdrop-blur-xs flex flex-col justify-between hover:border-primary/20 transition-all duration-300">
 <CardHeader className="pb-space-4 border-b border-border/10">
 <div className="flex items-center justify-between">
 <div className="h-9 w-9 radius-lg bg-success-500/10 border border-success-500/20 flex items-center justify-center text-success-500">
 <BarChart2 className="h-5 w-5"/>
 </div>
 <span className="text-caption bg-success-500/10 text-success-500 border border-success-500/20 px-space-2 py-space-1 radius-full">Performance Metrics</span>
 </div>
 <CardTitle className="text-body-sm font-semibold text-foreground mt-space-4">Conversion Rates</CardTitle>
 </CardHeader>
 <div className="p-space-6 pt-space-5 space-y-space-6 bg-transparent">
 <div className="space-y-space-2">
 <div className="flex justify-between text-caption font-semibold text-foreground">
 <span>Widget Engagement (Opens ➜ Chats)</span>
 <span className="text-primary">{analytics.engagementRate}%</span>
 </div>
 <div className="h-2 w-full bg-border/40 radius-full overflow-hidden">
 <div className="h-full bg-primary"style={{ width:`${analytics.engagementRate}%`}} />
 </div>
 </div>
 
 <div className="space-y-space-2 border-t border-border/10 pt-space-5">
 <div className="flex justify-between text-caption font-semibold text-foreground">
 <span>Booking Conversion (Chats ➜ Appointments)</span>
 <span className="text-emerald-500">{analytics.conversionRate}%</span>
 </div>
 <div className="h-2 w-full bg-border/40 radius-full overflow-hidden">
 <div className="h-full bg-emerald-500"style={{ width:`${analytics.conversionRate}%`}} />
 </div>
 </div>
 </div>
 </Card>
 </div>
 </div>
 )}

 </form>
 </div>

 {/* Right Side: Live Sticky Preview Panel */}
 <div className="w-full lg:w-96 xl:w-[var(--w-420,420px)] lg:sticky lg:top-space-6 shrink-0 space-y-space-4">
 <div className="flex items-center justify-between select-none">
 <span className="text-caption uppercase font-semibold tracking-wider text-muted-foreground/75 leading-none flex items-center gap-space-1.5">
 <Palette className="h-3.5 w-3.5 text-primary"/> Live customizer visualizer
 </span>
 <span className="text-caption font-semibold text-emerald-500 bg-emerald-500/10 border border-emerald-500/20 px-space-2 py-space-0.5 radius-full flex items-center gap-space-1">
 <span className="h-1.5 w-1.5 radius-full bg-emerald-500 animate-pulse"/> Real-time active preview
 </span>
 </div>

 {/* High-Fidelity Mock Browser Shell */}
 <div 
 className="radius-2xl border backdrop-blur-md overflow-hidden flex flex-col transition-all duration-300"
 style={{
 borderColor: theme.themeMode ==="dark"?"rgba(255,255,255,0.08)":"rgba(0,0,0,0.10)",
 backgroundColor: theme.themeMode ==="dark"?"rgba(9,9,11,0.6)":"rgba(255,255,255,0.85)"
 }}
 >
 
 {/* Browser Control Header */}
 <div 
 className="flex items-center gap-space-1.5 px-space-4 py-space-3 border-b select-none transition-all duration-300"
 style={{
 backgroundColor: theme.themeMode ==="dark"?"#09090b":"#f4f4f5",
 borderColor: theme.themeMode ==="dark"?"rgba(255,255,255,0.05)":"rgba(0,0,0,0.06)"
 }}
 >
 <div className="flex gap-space-1.5">
 <span className="h-2.5 w-2.5 radius-full bg-rose-500/80 shrink-0"/>
 <span className="h-2.5 w-2.5 radius-full bg-amber-500/80 shrink-0"/>
 <span className="h-2.5 w-2.5 radius-full bg-emerald-500/80 shrink-0"/>
 </div>
 <div 
 className="flex-1 max-w-xs mx-auto border radius-lg py-space-1 px-space-3 text-caption font-mono text-center truncate transition-all duration-300"
 style={{
 backgroundColor: theme.themeMode ==="dark"?"rgba(255,255,255,0.05)":"rgba(255,255,255,0.8)",
 borderColor: theme.themeMode ==="dark"?"rgba(255,255,255,0.06)":"rgba(0,0,0,0.08)",
 color: theme.themeMode ==="dark"?"rgba(255,255,255,0.35)":"rgba(0,0,0,0.4)"
 }}
 >
 https://{branding.companyName ? branding.companyName.toLowerCase().replace(/\s+/g,"") :"business"}.com/chat
 </div>
 </div>

 {/* Widget Frame Viewport */}
 <div 
 className="relative flex flex-col justify-between overflow-hidden transition-all duration-300 w-full"
 style={{
 height:`${customization.widgetHeight - 50}px`,
 backgroundColor: theme.backgroundColor,
 borderColor: theme.borderColor,
 borderRadius: theme.borderRadius
 }}
 >
 {/* Preview Header */}
 <div className="flex items-center justify-between p-space-4 border-b bg-background/10 backdrop-blur-lg"style={{ borderColor: theme.borderColor }}>
 <div className="flex items-center gap-space-3">
 <div className="relative">
 {branding.logoUrl ? (
 <Image 
 src={branding.logoUrl} 
 width={34}
 height={34}
 className="h-8.5 w-8.5 radius-full object-cover border"
 style={{ borderColor:`${theme.primaryColor}30`}}
 alt="Logo"
 />
 ) : (
 <div 
 className="h-8.5 w-8.5 radius-full border flex items-center justify-center transition-all duration-300"
 style={{ backgroundColor:`${theme.primaryColor}15`, borderColor:`${theme.primaryColor}30`}}
 >
 <Sparkles className="h-4.5 w-4.5"style={{ color: theme.primaryColor }} />
 </div>
 )}
 <span className="absolute bottom-space-0 right-space-0 h-2 w-2 radius-full bg-emerald-500 animate-pulse"style={{ boxShadow:`0 0 0 2px ${theme.backgroundColor}`}} />
 </div>
 <div>
 <h4 className="text-caption font-semibold tracking-tight leading-none"style={{ color: theme.textColor }}>
 {branding.companyName ||"Your Company Name"}
 </h4>
 <p className="text-caption text-muted-foreground/70 font-semibold mt-space-1 truncate max-w-xs leading-none">
 {branding.tagline ||"Active Operator AI"}
 </p>
 </div>
 </div>
 <div className="flex items-center gap-space-2">
 <span className="h-1.5 w-1.5 radius-full bg-emerald-500"/>
 <X className="h-4 w-4 text-muted-foreground/60 hover:text-muted-foreground cursor-pointer"/>
 </div>
 </div>

 {/* Preview Chat list content */}
 <ScrollArea className="flex-1 p-space-5 space-y-space-5 bg-background/2 flex flex-col" horizontal={false}>
 
 {/* AI Welcome Message */}
 <div className="flex items-start gap-space-2.5 max-w-5/6 self-start animate-fade-in">
 <div 
 className="h-7 w-7 radius-full border flex items-center justify-center shrink-0 mt-space-0.5"
 style={{ backgroundColor:`${theme.primaryColor}15`, borderColor:`${theme.primaryColor}20`}}
 >
 <Sparkles className="h-3.5 w-3.5"style={{ color: theme.primaryColor }} />
 </div>
 <div 
 className="p-space-3.5 text-caption leading-relaxed border"
 style={{ 
 backgroundColor: theme.themeMode ==="dark"?"rgba(255,255,255,0.03)":"rgba(0,0,0,0.03)", 
 borderColor: theme.borderColor,
 color: theme.textColor,
 borderRadius:`0px ${theme.borderRadius} ${theme.borderRadius} ${theme.borderRadius}`
 }}
 >
 {branding.welcomeMessage ||"Hello! How can I help you book or view services today?"}
 </div>
 </div>

 {/* User Mock Message */}
 <div className="flex items-start justify-end gap-space-2.5 max-w-5/6 self-end animate-fade-in [animation-delay:200ms]">
 <div 
 className="p-space-3.5 text-caption leading-relaxed text-white bg-gradient-to-br font-semibold bg-[linear-gradient(135deg,_rgba(255,255,255,0.1)_0%,_rgba(0,0,0,0.05)_100%)]"
 style={{ 
 backgroundColor: theme.primaryColor,
 borderRadius:`${theme.borderRadius} 0px ${theme.borderRadius} ${theme.borderRadius}`
 }}
 >
 Can I book an appointment for tomorrow?
 </div>
 </div>

 {/* AI Mock Response */}
 <div className="flex items-start gap-space-2.5 max-w-5/6 self-start animate-fade-in [animation-delay:400ms]">
 <div 
 className="h-7 w-7 radius-full border flex items-center justify-center shrink-0 mt-space-0.5"
 style={{ backgroundColor:`${theme.primaryColor}15`, borderColor:`${theme.primaryColor}20`}}
 >
 <Sparkles className="h-3.5 w-3.5"style={{ color: theme.primaryColor }} />
 </div>
 <div 
 className="p-space-3.5 text-caption leading-relaxed border space-y-space-3.5"
 style={{ 
 backgroundColor: theme.themeMode ==="dark"?"rgba(255,255,255,0.03)":"rgba(0,0,0,0.03)", 
 borderColor: theme.borderColor,
 color: theme.textColor,
 borderRadius:`0px ${theme.borderRadius} ${theme.borderRadius} ${theme.borderRadius}`
 }}
 >
 <p>Sure! I can help you book an appointment. Select a quick action below to schedule instantly.</p>
 
 {/* Calendar Mock Card in Chat */}
 <div className="p-space-3.5 radius-xl border flex items-center justify-between gap-space-3"style={{ borderColor: theme.borderColor, backgroundColor: theme.themeMode ==="dark"?"rgba(255,255,255,0.04)":"rgba(0,0,0,0.02)"}}>
 <div className="flex items-center gap-space-2.5">
 <div 
 className="h-8.5 w-8.5 radius-lg flex items-center justify-center shrink-0"
 style={{ color: theme.primaryColor, backgroundColor:`${theme.primaryColor}15`}}
 >
 <Sparkles className="h-4 w-4"style={{ color: theme.primaryColor }} />
 </div>
 <div className="text-left">
 <span className="text-caption font-semibold block leading-none"style={{ color: theme.textColor }}>Schedule Appointment</span>
 <span className="text-caption block mt-space-1"style={{ color: theme.themeMode ==="dark"?"rgba(255,255,255,0.4)":"rgba(0,0,0,0.45)"}}>Takes less than 1 minute</span>
 </div>
 </div>
 <Button 
 type="button"
 className="h-7.5 px-space-3 text-caption font-semibold text-white shrink-0 hover:brightness-105 active:brightness-95 transition-all"
 style={{ backgroundColor: theme.primaryColor }}
 >
 Book Now
 </Button>
 </div>
 </div>
 </div>

 {/* Starter questions stubs */}
 {customization.starterQuestions.length > 0 && (
 <div className="space-y-space-2 pt-space-3 mt-auto">
 <span className="text-caption font-semibold text-muted-foreground/75 uppercase tracking-wider block">Suggested Questions</span>
 <div className="grid gap-space-2 grid-cols-2">
 {customization.starterQuestions.slice(0, 4).map((q, i) => (
 <div 
 key={i} 
 className="p-space-2.5 px-space-3 border text-caption font-medium text-muted-foreground/80 hover:text-foreground hover:bg-[hsl(var(--foreground)/0.02)] transition-all duration-200 truncate text-center cursor-pointer select-none"
 style={{ borderColor: theme.borderColor, borderRadius: theme.borderRadius }}
 >
 {q}
 </div>
 ))}
 </div>
 </div>
 )}
 </ScrollArea>

 {/* Suggestions Footer */}
 {customization.suggestedActions.length > 0 && (
 <ScrollArea className="flex gap-space-2 p-space-3 bg-background/15 border-t shrink-0"style={{ borderColor: theme.borderColor }} vertical={false}>
 {customization.suggestedActions.map((act: any, idx: number) => (
 <div
 key={idx}
 className="text-caption font-semibold border px-space-3.5 py-space-1.5 bg-background/55 text-foreground/90 shrink-0 select-none cursor-pointer hover:bg-background/80 transition-colors radius-full"
 style={{ borderColor: theme.borderColor }}
 >
 {act.label}
 </div>
 ))}
 </ScrollArea>
 )}

 {/* Input preview */}
 <div className="p-space-3.5 border-t bg-background/30 flex items-center gap-space-2.5 shrink-0"style={{ borderColor: theme.borderColor }}>
 <div className="flex-1 h-9 radius-xl border bg-transparent text-caption flex items-center px-space-3.5 text-muted-foreground/40"style={{ borderColor: theme.borderColor }}>
 Ask a question...
 </div>
 <div 
 className="h-9 w-9 radius-xl flex items-center justify-center text-primary-foreground shrink-0 cursor-pointer hover:brightness-105 transition-all"
 style={{ backgroundColor: theme.primaryColor, borderRadius: theme.borderRadius }}
 >
 <Send className="h-4 w-4 text-white"/>
 </div>
 </div>
 </div>

 {/* Simulated Live Webpage Context with Launcher widget */}
 <div 
 className="border-t p-space-5 space-y-space-4 transition-all duration-300"
 style={{
 borderColor: theme.themeMode ==="dark"?"rgba(255,255,255,0.08)":"rgba(0,0,0,0.08)",
 backgroundColor: theme.themeMode ==="dark"?"rgba(24,24,27,0.4)":"rgba(244,244,245,0.5)"
 }}
 >
 <div className="flex items-center justify-between select-none">
 <span className="text-caption uppercase font-semibold tracking-wider leading-none"style={{ color: theme.themeMode ==="dark"?"rgba(255,255,255,0.45)":"rgba(0,0,0,0.45)"}}>Floating widget preview launcher</span>
 <span className="text-caption font-mono leading-none"style={{ color: theme.themeMode ==="dark"?"rgba(255,255,255,0.35)":"rgba(0,0,0,0.4)"}}>Position: {launcher.position ==="bottom_left"?"Left Align":"Right Align"}</span>
 </div>

 {/* Mock site canvas */}
 <div 
 className="relative border radius-2xl overflow-hidden h-44 flex flex-col justify-between p-space-4.5 transition-all duration-300"
 style={{
 borderColor: theme.themeMode ==="dark"?"rgba(255,255,255,0.05)":"rgba(0,0,0,0.06)",
 backgroundColor: theme.themeMode ==="dark"?"#09090b":"#fafafb"
 }}
 >
 {/* Mock site top navigation */}
 <div className="flex items-center justify-between pb-space-2.5 text-caption select-none"style={{ borderBottom:`1px solid ${theme.themeMode ==="dark"?"rgba(255,255,255,0.05)":"rgba(0,0,0,0.06)"}`, color: theme.themeMode ==="dark"?"rgba(255,255,255,0.3)":"rgba(0,0,0,0.35)"}}>
 <div className="flex items-center gap-space-1.5">
 <div className="h-1.5 w-1.5 radius-full"style={{ backgroundColor: theme.themeMode ==="dark"?"rgba(255,255,255,0.2)":"rgba(0,0,0,0.2)"}} />
 <span className="font-semibold tracking-wide"style={{ color: theme.themeMode ==="dark"?"rgba(255,255,255,0.5)":"rgba(0,0,0,0.5)"}}>https://{branding.companyName ? branding.companyName.toLowerCase().replace(/\s+/g,"") :"business"}.com</span>
 </div>
 <div className="flex gap-space-3 font-semibold">
 <span>Services</span>
 <span>Pricing</span>
 <span>Contact</span>
 </div>
 </div>

 {/* Mock site hero text */}
 <div className="space-y-space-2 py-space-3 select-none">
 <div className="h-3.5 w-2/3 radius-md"style={{ backgroundColor: theme.themeMode ==="dark"?"rgba(255,255,255,0.05)":"rgba(0,0,0,0.06)"}} />
 <div className="h-2 w-5/6 radius-md"style={{ backgroundColor: theme.themeMode ==="dark"?"rgba(255,255,255,0.05)":"rgba(0,0,0,0.06)"}} />
 <div className="h-2 w-1/2 radius-md"style={{ backgroundColor: theme.themeMode ==="dark"?"rgba(255,255,255,0.05)":"rgba(0,0,0,0.06)"}} />
 <div className="pt-space-1.5 flex gap-space-2">
 <div className="h-6 w-20 radius-lg"style={{ backgroundColor:`${theme.primaryColor}20`}} />
 <div className="h-6 w-16 radius-lg"style={{ backgroundColor: theme.themeMode ==="dark"?"rgba(255,255,255,0.05)":"rgba(0,0,0,0.06)"}} />
 </div>
 </div>

 {/* Floating launcher toggler representation */}
 <div className={cn(
 "absolute bottom-space-4.5 flex items-center gap-space-2.5 transition-all duration-300",
 launcher.position ==="bottom_left"?"left-space-4.5":"right-space-4.5"
 )}>
 {/* Floating tooltip */}
 <div 
 className="border text-caption font-semibold px-space-3 py-space-1.5 radius-xl select-none flex items-center gap-space-1 transition-all duration-300"
 style={{ backgroundColor: theme.themeMode ==="dark"?"#18181b":"#ffffff", borderColor: theme.themeMode ==="dark"?"rgba(255,255,255,0.1)":"rgba(0,0,0,0.08)", color: theme.themeMode ==="dark"?"#fff":"#18181b", borderRadius: theme.borderRadius }}
 >
 <span className="h-1.5 w-1.5 radius-full bg-emerald-500"/>
 Chat Online
 </div>
 <div 
 className="h-10.5 w-10.5 radius-full flex items-center justify-center text-white cursor-pointer transition-transform hover:scale-105 active:scale-95 duration-200 radius-full"
 style={{ 
 backgroundColor: theme.primaryColor, 
 boxShadow:`0 4px 20px ${theme.primaryColor}45`
 }}
 >
 <MessageSquare className="h-5 w-5"/>
 </div>
 </div>
 </div>
 </div>

 </div>

 </div>

 </div>
 </div>
 );
}
