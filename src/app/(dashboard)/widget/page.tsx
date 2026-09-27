"use client";

import { useState, useEffect, useMemo } from "react";
import Image from "next/image";
import {
  getWidgetSettingsAction,
  saveWidgetSettingsAction,
  addDomainAction,
  deleteDomainAction,
  verifyDomainAction,
  resetThemeToBrandAction,
} from "@/server/actions/widget";
import {
  Code,
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
  Send,
  Mail,
  FileText,
  Smartphone,
  Monitor,
  HelpCircle,
  ShieldCheck,
  CheckCircle2,
} from "lucide-react";
import { Button } from "@/components/shared/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/shared/card";
import { Input } from "@/components/shared/input";
import { Label } from "@/components/shared/label";
import { PageTitle } from "@/components/shared/page-title";
import { useToast } from "@/components/shared/toast";
import { formatUserErrorMessage } from "@/lib/errors";
import { cn } from "@/components/shared/utils";

const PRESET_COLORS = [
  { name: "Modern Purple", hex: "#7a5af8" },
  { name: "Emerald Health", hex: "#10b981" },
  { name: "Ocean Blue", hex: "#0ea5e9" },
  { name: "Sunset Rose", hex: "#f43f5e" },
  { name: "Luxury Amber", hex: "#f59e0b" },
  { name: "Midnight Slate", hex: "#475569" },
];

const PLATFORM_GUIDES = [
  {
    id: "html",
    name: "Custom HTML / Web",
    tagline: "React, Next.js, Vue, or static HTML",
    steps: [
      "Open your website's main template or layout file (e.g. index.html, layout.tsx, or footer template).",
      "Paste the script snippet directly above the closing </body> tag.",
      "Save and deploy your site. The Operator chat bubble will automatically appear in your configured corner.",
    ],
  },
  {
    id: "wordpress",
    name: "WordPress",
    tagline: "Works with any WordPress theme or builder",
    steps: [
      "Log in to your WordPress Admin dashboard (wp-admin).",
      "Go to Plugins > Add New and search for 'WPCode' (or 'Insert Headers and Footers'). Click Install and Activate.",
      "In your WordPress admin menu, click Code Snippets > Header & Footer.",
      "Paste your Operator script snippet into the 'Footer' box and click Save Changes.",
    ],
  },
  {
    id: "shopify",
    name: "Shopify",
    tagline: "Install in 1 minute on any Shopify theme",
    steps: [
      "In your Shopify Admin, navigate to Online Store > Themes.",
      "Click the three dots (···) next to your live theme and choose 'Edit Code'.",
      "Under Layout in the file tree on the left, click on 'theme.liquid'.",
      "Scroll to the bottom, paste the script snippet directly above the </body> tag, and click Save.",
    ],
  },
  {
    id: "wix",
    name: "Wix",
    tagline: "Add via Wix Custom Code settings",
    steps: [
      "Go to your Wix Dashboard and open Settings > Custom Code (under Advanced).",
      "Click '+ Add Custom Code' in the top right.",
      "Paste the Operator script snippet into the code box and set name to 'Operator Receptionist'.",
      "Select 'Body - end' under Place Code In, select 'All Pages', and click Apply.",
    ],
  },
  {
    id: "squarespace",
    name: "Squarespace",
    tagline: "Inject into site-wide footer",
    steps: [
      "In your Squarespace dashboard, go to Website > Pages > Website Tools > Code Injection.",
      "Scroll down to the 'Footer' injection area.",
      "Paste the Operator script snippet into the box and click Save at the top left.",
    ],
  },
  {
    id: "webflow",
    name: "Webflow",
    tagline: "Project Custom Code settings",
    steps: [
      "Open your project in the Webflow Designer and click Project Settings.",
      "Navigate to the 'Custom Code' tab in the top navigation bar.",
      "Scroll down to the 'Footer Code' field.",
      "Paste the Operator snippet, click Save Changes, and Publish your website.",
    ],
  },
];

export default function WidgetSettingsPage() {
  const [loading, setLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");
  const toast = useToast();

  const [activeTab, setActiveTab] = useState<"install" | "branding" | "triggers" | "domains" | "analytics">("install");
  const [previewMode, setPreviewMode] = useState<"chat" | "bubble">("chat");

  // Settings States
  const [orgId, setOrgId] = useState("");
  const [enabled, setEnabled] = useState(true);

  // Theme State
  const [theme, setTheme] = useState({
    themeMode: "light",
    primaryColor: "#7a5af8",
    backgroundColor: "#ffffff",
    textColor: "#18181b",
    borderColor: "#e4e4e7",
    borderRadius: "0.75rem",
  });

  // Branding State
  const [branding, setBranding] = useState({
    companyName: "",
    tagline: "AI Assistant",
    welcomeMessage: "Hello! How can I help you today?",
    logoUrl: "",
    avatarUrl: "",
  });

  // Launcher State
  const [launcher, setLauncher] = useState({
    position: "bottom_right",
    icon: "message-square",
    size: "medium",
    spacingX: 20,
    spacingY: 20,
  });

  // Customization State
  const [customization, setCustomization] = useState({
    starterQuestions: ["What are your business hours?", "How do I book an appointment?", "What services do you offer?"] as string[],
    suggestedActions: [
      { type: "booking", label: "Book Appointment" },
      { type: "services", label: "View Services" },
      { type: "pricing", label: "View Pricing" },
    ] as any[],
    proactiveTriggers: {
      timeOnPage: 10,
      scrollDepth: 50,
      exitIntent: false,
      active: false,
    },
    widgetWidth: 380,
    widgetHeight: 600,
    shadowStyle: "lg",
  });

  const [domains, setDomains] = useState<any[]>([]);
  const [installations, setInstallations] = useState<any[]>([]);
  const [analytics, setAnalytics] = useState<any>({
    widgetOpens: 0,
    conversationStarts: 0,
    bookingsCount: 0,
    leadCapturesCount: 0,
    engagementRate: 0,
    conversionRate: 0,
  });

  // Action inputs
  const [newDomain, setNewDomain] = useState("");
  const [addingDomain, setAddingDomain] = useState(false);
  const [verifyingId, setVerifyingId] = useState<string | null>(null);

  // Question & Sharing inputs
  const [newQuestion, setNewQuestion] = useState("");
  const [copied, setCopied] = useState(false);
  const [copiedEmail, setCopiedEmail] = useState(false);
  const [selectedPlatform, setSelectedPlatform] = useState<string>("html");

  const loadData = async () => {
    setLoading(true);
    const res = await getWidgetSettingsAction();
    if (res.success && res.data) {
      const d = res.data;
      setOrgId(d.config.organizationId);
      setEnabled(d.config.enabled);
      if (d.theme) {
        setTheme({
          themeMode: d.theme.themeMode || "light",
          primaryColor: d.theme.primaryColor || "#7a5af8",
          backgroundColor: d.theme.backgroundColor || "#ffffff",
          textColor: d.theme.textColor || "#18181b",
          borderColor: d.theme.borderColor || "#e4e4e7",
          borderRadius: d.theme.borderRadius || "0.75rem",
        });
      }
      if (d.branding) {
        setBranding({
          companyName: d.branding.companyName || "",
          tagline: d.branding.tagline || "",
          welcomeMessage: d.branding.welcomeMessage || "",
          logoUrl: d.branding.logoUrl || "",
          avatarUrl: d.branding.avatarUrl || "",
        });
      }
      if (d.launcher) {
        setLauncher({
          position: d.launcher.position || "bottom_right",
          icon: d.launcher.icon || "message-square",
          size: d.launcher.size || "medium",
          spacingX: d.launcher.spacingX ?? 20,
          spacingY: d.launcher.spacingY ?? 20,
        });
      }
      if (d.customization) {
        setCustomization({
          starterQuestions: Array.isArray(d.customization.starterQuestions)
            ? (d.customization.starterQuestions as string[])
            : ["What are your business hours?", "How do I book an appointment?", "What services do you offer?"],
          suggestedActions: Array.isArray(d.customization.suggestedActions)
            ? (d.customization.suggestedActions as any[])
            : [
                { type: "booking", label: "Book Appointment" },
                { type: "services", label: "View Services" },
                { type: "pricing", label: "View Pricing" },
              ],
          proactiveTriggers: (d.customization.proactiveTriggers as any) || {
            timeOnPage: 10,
            scrollDepth: 50,
            exitIntent: false,
            active: false,
          },
          widgetWidth: d.customization.widgetWidth || 380,
          widgetHeight: d.customization.widgetHeight || 600,
          shadowStyle: d.customization.shadowStyle || "0 20px 25px -5px rgb(0 0 0 / 0.1)",
        });
      }
      setDomains(d.domains || []);
      setInstallations(d.installations || []);
      setAnalytics(d.analytics || {});
    } else {
      setErrorMsg(res.error || "Failed to load settings.");
    }
    setLoading(false);
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleSave = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    setIsSaving(true);
    setSaveSuccess(false);
    setErrorMsg("");

    const res = await saveWidgetSettingsAction({
      enabled,
      theme,
      branding,
      launcher,
      customization,
    });

    if (res.success) {
      setSaveSuccess(true);
      toast.success("Settings Saved", "Your website widget configurations are updated.");
      setTimeout(() => setSaveSuccess(false), 3000);
      loadData();
    } else {
      setErrorMsg(res.error || "Failed to save configurations.");
      toast.error("Save Failed", res.error || "Failed to save configurations.");
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
      toast.success("Domain Added", "Domain added to whitelist.");
      loadData();
    } else {
      setErrorMsg(res.error || "Failed to add domain.");
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
    const origin = typeof window !== "undefined" ? window.location.origin : "";
    const snippet = `<script src="${origin}/widget.js" data-org-id="${orgId}"></script>`;
    navigator.clipboard.writeText(snippet);
    setCopied(true);
    toast.success("Code Copied", "Widget embed script copied to clipboard.");
    setTimeout(() => setCopied(false), 2000);
  };

  const emailInstructionsToDeveloper = () => {
    const origin = typeof window !== "undefined" ? window.location.origin : "";
    const snippet = `<script src="${origin}/widget.js" data-org-id="${orgId}"></script>`;
    const company = branding.companyName || "our business";
    const subject = encodeURIComponent(`Operator AI Widget Installation for ${company}`);
    const body = encodeURIComponent(
`Hi,

Please add our new Operator AI Receptionist chat and appointment booking widget to our website.

Here is our 1-line script tag to paste directly before the closing </body> tag:

${snippet}

Platform guides:
- WordPress: Install 'WPCode', paste snippet into Code Snippets > Header & Footer > Footer, and click Save.
- Shopify: In Online Store > Themes > Edit Code > layout/theme.liquid, paste right above </body>.
- Wix: In Settings > Custom Code > Add Code, select 'Body - end', and click Apply.
- Squarespace: In Settings > Developer Tools > Code Injection > Footer, paste and save.
- Webflow: In Project Settings > Custom Code > Footer Code, paste and publish.

Let me know once it is published so we can verify the live reception!

Thank you!`
    );
    window.open(`mailto:?subject=${subject}&body=${body}`, "_blank");
  };

  const copyDeveloperInstructions = () => {
    const origin = typeof window !== "undefined" ? window.location.origin : "";
    const snippet = `<script src="${origin}/widget.js" data-org-id="${orgId}"></script>`;
    const company = branding.companyName || "our business";
    const instructions = 
`Operator AI Receptionist Widget Installation for ${company}

Add this 1-line script tag right before the closing </body> tag on your site:

${snippet}

Platform-specific guides:
- WordPress: Install 'WPCode' or 'Insert Headers and Footers', paste into Footer Scripts, and save.
- Shopify: In Online Store > Themes > Edit Code > layout/theme.liquid, paste right above </body>.
- Wix: In Settings > Custom Code > Add Code, select 'Body - end', and click Apply.
- Squarespace: In Settings > Developer Tools > Code Injection > Footer, paste and save.
- Webflow: In Project Settings > Custom Code > Footer Code, paste and publish.`;

    navigator.clipboard.writeText(instructions);
    setCopiedEmail(true);
    toast.success("Instructions Copied", "Developer instructions copied to clipboard.");
    setTimeout(() => setCopiedEmail(false), 2000);
  };

  const handleAddQuestion = () => {
    if (!newQuestion.trim()) return;
    setCustomization({
      ...customization,
      starterQuestions: [...customization.starterQuestions, newQuestion.trim()],
    });
    setNewQuestion("");
  };

  const handleRemoveQuestion = (idx: number) => {
    setCustomization({
      ...customization,
      starterQuestions: customization.starterQuestions.filter((_, i) => i !== idx),
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

  if (loading) {
    return (
      <div className="h-96 flex flex-col items-center justify-center text-caption text-muted-foreground gap-space-3">
        <Loader2 className="h-6 w-6 animate-spin text-primary" />
        <span>Loading Website Widget Studio...</span>
      </div>
    );
  }

  return (
    <div className="space-y-space-6 max-w-7xl mx-auto pb-space-12">
      {/* Top Header Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-space-4 border-b border-border/40 pb-space-5">
        <div>
          <PageTitle
            title="Website Widget Studio"
            description="Customize your live receptionist bubble, copy your 1-line script, or share installation guides."
          />
        </div>

        <div className="flex items-center gap-space-3 shrink-0">
          <Button
            type="button"
            variant="outline"
            className="h-9 text-caption gap-space-2 cursor-pointer border-border/50"
            onClick={copySnippet}
          >
            {copied ? <Check className="h-4 w-4 text-emerald-500" /> : <Copy className="h-4 w-4" />}
            <span>{copied ? "Copied" : "Copy Embed Script"}</span>
          </Button>

          <Button
            type="button"
            className="h-9 text-caption font-semibold gap-space-2 cursor-pointer bg-primary hover:bg-primary/90 text-white shadow-xs"
            onClick={() => handleSave()}
            disabled={isSaving}
          >
            {isSaving ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : saveSuccess ? (
              <Check className="h-4 w-4 text-white" />
            ) : (
              <Save className="h-4 w-4" />
            )}
            <span>{isSaving ? "Saving..." : saveSuccess ? "Saved!" : "Save Changes"}</span>
          </Button>
        </div>
      </div>

      {errorMsg && (
        <div className="flex items-center justify-between gap-space-2 radius-lg bg-error-500/10 border border-error-500/20 p-space-3.5 text-caption text-error-500">
          <div className="flex items-center gap-space-2">
            <AlertCircle className="h-4 w-4 shrink-0" />
            <span>{errorMsg}</span>
          </div>
          <button onClick={() => setErrorMsg("")} className="text-xs hover:underline cursor-pointer">
            Dismiss
          </button>
        </div>
      )}

      {/* Horizontal Segmented Tabs (Clean, zero scrollbars!) */}
      <div className="flex items-center gap-space-1.5 p-space-1 radius-xl bg-background/60 border border-border/50 overflow-x-auto no-scrollbar">
        {[
          { id: "install", label: "Integration & Script", icon: Code },
          { id: "branding", label: "Appearance & Styling", icon: Palette },
          { id: "triggers", label: "Greetings & Actions", icon: MessageSquare },
          { id: "domains", label: "Allowed Domains", icon: Globe },
          { id: "analytics", label: "Analytics", icon: BarChart2 },
        ].map((tab) => {
          const Icon = tab.icon;
          const isSelected = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              type="button"
              onClick={() => setActiveTab(tab.id as any)}
              className={cn(
                "flex items-center gap-space-2 px-space-4 py-space-2 text-caption font-medium radius-lg transition-all cursor-pointer whitespace-nowrap select-none",
                isSelected
                  ? "bg-primary text-white shadow-xs font-semibold"
                  : "text-muted-foreground hover:text-foreground hover:bg-background/80"
              )}
            >
              <Icon className="h-4 w-4 shrink-0" />
              <span>{tab.label}</span>
            </button>
          );
        })}
      </div>

      {/* Main 2-Column Split: Controls on Left, Sticky Real-Time Preview on Right */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-space-8 items-start w-full">
        {/* Left Column: Active Configuration Panel (7 cols) */}
        <div className="lg:col-span-7 space-y-space-6 min-w-0">
          {/* TAB 1: INTEGRATION & SCRIPT */}
          {activeTab === "install" && (
            <div className="space-y-space-6 animate-fade-in">
              <Card className="border-border/60 bg-card/40 backdrop-blur-xs">
                <CardHeader className="pb-space-4 border-b border-border/10">
                  <div className="flex items-center justify-between">
                    <div className="h-9 w-9 radius-lg bg-primary-500/10 border border-primary-500/20 flex items-center justify-center text-primary">
                      <Code className="h-5 w-5" />
                    </div>
                    <span className="text-caption font-semibold bg-emerald-500/10 text-emerald-500 border border-emerald-500/20 px-space-2.5 py-space-0.5 radius-full flex items-center gap-space-1">
                      <span className="h-1.5 w-1.5 radius-full bg-emerald-500 animate-pulse" />
                      Live Ready
                    </span>
                  </div>
                  <CardTitle className="text-body-sm font-semibold text-foreground mt-space-3">
                    1-Line Website Script
                  </CardTitle>
                  <CardDescription className="text-caption text-muted-foreground">
                    Paste this snippet right before the closing &lt;/body&gt; tag on your website to launch Operator AI instantly.
                  </CardDescription>
                </CardHeader>

                <CardContent className="p-space-6 space-y-space-5">
                  {/* Code snippet display */}
                  <div className="p-space-4 bg-background/70 border border-border/50 radius-xl flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-space-3 font-mono text-caption text-foreground/90">
                    <span className="truncate select-all pr-space-2 overflow-x-auto text-[13px]">
                      {`<script src="${typeof window !== "undefined" ? window.location.origin : ""}/widget.js" data-org-id="${orgId}"></script>`}
                    </span>
                    <Button
                      type="button"
                      variant="outline"
                      className="h-8 shrink-0 text-caption gap-space-1.5 border-border/50 bg-background hover:bg-background text-foreground cursor-pointer px-space-3"
                      onClick={copySnippet}
                    >
                      {copied ? <Check className="h-3.5 w-3.5 text-emerald-500" /> : <Copy className="h-3.5 w-3.5" />}
                      <span>{copied ? "Copied" : "Copy Code"}</span>
                    </Button>
                  </div>

                  {/* Non-technical actions: Email to Webmaster */}
                  <div className="flex flex-wrap items-center gap-space-2.5 pt-space-1">
                    <Button
                      type="button"
                      variant="outline"
                      className="h-8.5 text-caption gap-space-2 border-primary/30 bg-primary/10 hover:bg-primary/20 text-primary cursor-pointer px-space-3.5 radius-lg"
                      onClick={emailInstructionsToDeveloper}
                    >
                      <Mail className="h-3.5 w-3.5" />
                      <span>Email to My Webmaster / Developer</span>
                    </Button>

                    <Button
                      type="button"
                      variant="outline"
                      className="h-8.5 text-caption gap-space-2 border-border/50 bg-background/80 hover:bg-background text-muted-foreground hover:text-foreground cursor-pointer px-space-3.5 radius-lg"
                      onClick={copyDeveloperInstructions}
                    >
                      {copiedEmail ? <Check className="h-3.5 w-3.5 text-emerald-500" /> : <FileText className="h-3.5 w-3.5" />}
                      <span>{copiedEmail ? "Copied!" : "Copy Developer Guide"}</span>
                    </Button>
                  </div>

                  {/* CMS Platform Step Guides */}
                  <div className="space-y-space-3 pt-space-4 border-t border-border/20">
                    <div className="flex items-center justify-between">
                      <Label className="text-caption uppercase tracking-wider font-semibold text-muted-foreground/80">
                        Platform-Specific Installation Steps
                      </Label>
                      <span className="text-[11px] text-muted-foreground">Select your CMS</span>
                    </div>

                    {/* Platform Selector Buttons */}
                    <div className="flex flex-wrap gap-space-1.5">
                      {PLATFORM_GUIDES.map((platform) => {
                        const isSelected = selectedPlatform === platform.id;
                        return (
                          <button
                            key={platform.id}
                            type="button"
                            onClick={() => setSelectedPlatform(platform.id)}
                            className={cn(
                              "px-space-3 py-space-1.5 text-caption font-medium radius-md transition-all cursor-pointer border",
                              isSelected
                                ? "bg-primary text-white border-primary shadow-xs font-semibold"
                                : "bg-background/40 hover:bg-background text-muted-foreground hover:text-foreground border-border/40"
                            )}
                          >
                            {platform.name}
                          </button>
                        );
                      })}
                    </div>

                    {/* Active Guide Steps */}
                    {(() => {
                      const activeGuide = PLATFORM_GUIDES.find((p) => p.id === selectedPlatform) || PLATFORM_GUIDES[0];
                      return (
                        <div className="p-space-4 radius-xl border border-border/40 bg-background/30 space-y-space-3 mt-space-2">
                          <div className="flex items-center justify-between border-b border-border/20 pb-space-2">
                            <span className="text-body-sm font-semibold text-foreground flex items-center gap-space-2">
                              <Globe className="h-4 w-4 text-primary" />
                              {activeGuide.name}
                            </span>
                            <span className="text-caption text-muted-foreground">{activeGuide.tagline}</span>
                          </div>
                          <ol className="space-y-space-2.5 text-caption text-muted-foreground">
                            {activeGuide.steps.map((step, idx) => (
                              <li key={idx} className="flex items-start gap-space-2.5 leading-relaxed">
                                <span className="h-5 w-5 shrink-0 rounded-full bg-primary/10 text-primary border border-primary/20 text-[11px] font-bold flex items-center justify-center mt-0.5">
                                  {idx + 1}
                                </span>
                                <span className="text-foreground/90">{step}</span>
                              </li>
                            ))}
                          </ol>
                        </div>
                      );
                    })()}
                  </div>
                </CardContent>
              </Card>
            </div>
          )}

          {/* TAB 2: APPEARANCE & STYLING */}
          {activeTab === "branding" && (
            <div className="space-y-space-6 animate-fade-in">
              <Card className="border-border/60 bg-card/40 backdrop-blur-xs">
                <CardHeader className="pb-space-4 border-b border-border/10">
                  <CardTitle className="text-body-sm font-semibold text-foreground">
                    Brand Identity & Colors
                  </CardTitle>
                  <CardDescription className="text-caption text-muted-foreground">
                    Customize your company title, greeting, and brand palette to match your website.
                  </CardDescription>
                </CardHeader>
                <CardContent className="p-space-6 space-y-space-5">
                  <div className="space-y-space-1.5">
                    <Label htmlFor="companyName" className="text-caption font-medium">Business / Assistant Name</Label>
                    <Input
                      id="companyName"
                      value={branding.companyName}
                      onChange={(e) => setBranding({ ...branding, companyName: e.target.value })}
                      placeholder="e.g. Acme Dental & Spa"
                      className="bg-background/50 border-border/50"
                    />
                  </div>

                  <div className="space-y-space-1.5">
                    <Label htmlFor="tagline" className="text-caption font-medium">Tagline / Role</Label>
                    <Input
                      id="tagline"
                      value={branding.tagline}
                      onChange={(e) => setBranding({ ...branding, tagline: e.target.value })}
                      placeholder="e.g. AI Front Desk Receptionist"
                      className="bg-background/50 border-border/50"
                    />
                  </div>

                  {/* Primary Color Palette Presets */}
                  <div className="space-y-space-2.5 pt-space-2">
                    <Label className="text-caption font-medium">Brand Accent Color</Label>
                    <div className="flex flex-wrap items-center gap-space-2.5">
                      {PRESET_COLORS.map((preset) => (
                        <button
                          key={preset.hex}
                          type="button"
                          onClick={() => setTheme({ ...theme, primaryColor: preset.hex })}
                          className={cn(
                            "h-7 w-7 rounded-full transition-transform cursor-pointer relative flex items-center justify-center border-2",
                            theme.primaryColor.toLowerCase() === preset.hex.toLowerCase()
                              ? "scale-110 border-white ring-2 ring-primary shadow-sm"
                              : "border-transparent hover:scale-105"
                          )}
                          style={{ backgroundColor: preset.hex }}
                          title={preset.name}
                        >
                          {theme.primaryColor.toLowerCase() === preset.hex.toLowerCase() && (
                            <Check className="h-3.5 w-3.5 text-white" />
                          )}
                        </button>
                      ))}
                      <div className="flex items-center gap-space-2 ml-space-2">
                        <input
                          type="color"
                          value={theme.primaryColor}
                          onChange={(e) => setTheme({ ...theme, primaryColor: e.target.value })}
                          className="h-7 w-7 rounded cursor-pointer border border-border/50 bg-transparent p-0"
                          title="Custom Color"
                        />
                        <span className="text-caption font-mono text-muted-foreground">{theme.primaryColor}</span>
                      </div>
                    </div>
                  </div>

                  {/* Theme Mode & Corner Position */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-space-4 pt-space-2">
                    <div className="space-y-space-1.5">
                      <Label className="text-caption font-medium">Theme Mode</Label>
                      <div className="grid grid-cols-2 gap-space-2">
                        <button
                          type="button"
                          onClick={() => setTheme({ ...theme, themeMode: "light", backgroundColor: "#ffffff", textColor: "#18181b" })}
                          className={cn(
                            "py-space-2 px-space-3 text-caption font-medium radius-md border transition-all text-center cursor-pointer",
                            theme.themeMode === "light"
                              ? "bg-primary/10 border-primary text-primary font-semibold"
                              : "bg-background/40 border-border/40 text-muted-foreground hover:text-foreground"
                          )}
                        >
                          ☀️ Light
                        </button>
                        <button
                          type="button"
                          onClick={() => setTheme({ ...theme, themeMode: "dark", backgroundColor: "#09090b", textColor: "#fafafa" })}
                          className={cn(
                            "py-space-2 px-space-3 text-caption font-medium radius-md border transition-all text-center cursor-pointer",
                            theme.themeMode === "dark"
                              ? "bg-primary/10 border-primary text-primary font-semibold"
                              : "bg-background/40 border-border/40 text-muted-foreground hover:text-foreground"
                          )}
                        >
                          🌙 Dark
                        </button>
                      </div>
                    </div>

                    <div className="space-y-space-1.5">
                      <Label className="text-caption font-medium">Launcher Position</Label>
                      <div className="grid grid-cols-2 gap-space-2">
                        <button
                          type="button"
                          onClick={() => setLauncher({ ...launcher, position: "bottom_right" })}
                          className={cn(
                            "py-space-2 px-space-3 text-caption font-medium radius-md border transition-all text-center cursor-pointer",
                            launcher.position === "bottom_right"
                              ? "bg-primary/10 border-primary text-primary font-semibold"
                              : "bg-background/40 border-border/40 text-muted-foreground hover:text-foreground"
                          )}
                        >
                          Bottom Right
                        </button>
                        <button
                          type="button"
                          onClick={() => setLauncher({ ...launcher, position: "bottom_left" })}
                          className={cn(
                            "py-space-2 px-space-3 text-caption font-medium radius-md border transition-all text-center cursor-pointer",
                            launcher.position === "bottom_left"
                              ? "bg-primary/10 border-primary text-primary font-semibold"
                              : "bg-background/40 border-border/40 text-muted-foreground hover:text-foreground"
                          )}
                        >
                          Bottom Left
                        </button>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          )}

          {/* TAB 3: GREETINGS & ACTIONS */}
          {activeTab === "triggers" && (
            <div className="space-y-space-6 animate-fade-in">
              <Card className="border-border/60 bg-card/40 backdrop-blur-xs">
                <CardHeader className="pb-space-4 border-b border-border/10">
                  <CardTitle className="text-body-sm font-semibold text-foreground">
                    AI Greeting & Quick Actions
                  </CardTitle>
                  <CardDescription className="text-caption text-muted-foreground">
                    Customize the opening conversation prompt and interactive action chips.
                  </CardDescription>
                </CardHeader>
                <CardContent className="p-space-6 space-y-space-5">
                  <div className="space-y-space-1.5">
                    <Label htmlFor="welcomeMsg" className="text-caption font-medium">Welcome Greeting</Label>
                    <textarea
                      id="welcomeMsg"
                      rows={3}
                      value={branding.welcomeMessage}
                      onChange={(e) => setBranding({ ...branding, welcomeMessage: e.target.value })}
                      placeholder="Hello! How can I help you book or view services today?"
                      className="w-full p-space-3 text-caption radius-lg bg-background/50 border border-border/50 text-foreground resize-none focus:outline-hidden focus:border-primary"
                    />
                  </div>

                  {/* Quick Action Chips */}
                  <div className="space-y-space-2 pt-space-2">
                    <Label className="text-caption font-medium">Quick Action Chips (Click to toggle)</Label>
                    <div className="flex flex-wrap gap-space-2">
                      {[
                        { type: "booking", label: "Book Appointment" },
                        { type: "services", label: "View Services" },
                        { type: "pricing", label: "View Pricing" },
                        { type: "hours", label: "Check Hours" },
                        { type: "human", label: "Talk to Human" },
                      ].map((item) => {
                        const isActive = customization.suggestedActions.some((a) => a.type === item.type);
                        return (
                          <button
                            key={item.type}
                            type="button"
                            onClick={() => handleToggleAction(item.type, item.label)}
                            className={cn(
                              "px-space-3 py-space-1.5 text-caption font-medium radius-full border transition-all cursor-pointer flex items-center gap-space-1.5",
                              isActive
                                ? "bg-primary text-white border-primary shadow-xs font-semibold"
                                : "bg-background/40 border-border/40 text-muted-foreground hover:text-foreground"
                            )}
                          >
                            {isActive ? <Check className="h-3 w-3" /> : <Plus className="h-3 w-3" />}
                            <span>{item.label}</span>
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  {/* Starter Questions */}
                  <div className="space-y-space-2.5 pt-space-2">
                    <Label className="text-caption font-medium">Starter Suggested Questions</Label>
                    <div className="flex gap-space-2">
                      <Input
                        value={newQuestion}
                        onChange={(e) => setNewQuestion(e.target.value)}
                        placeholder="e.g. What insurance do you accept?"
                        className="bg-background/50 border-border/50 text-caption"
                        onKeyDown={(e) => {
                          if (e.key === "Enter") {
                            e.preventDefault();
                            handleAddQuestion();
                          }
                        }}
                      />
                      <Button
                        type="button"
                        variant="outline"
                        onClick={handleAddQuestion}
                        disabled={!newQuestion.trim()}
                        className="shrink-0 text-caption border-border/50"
                      >
                        Add
                      </Button>
                    </div>

                    <div className="space-y-space-1.5 pt-space-1">
                      {customization.starterQuestions.map((q, idx) => (
                        <div
                          key={idx}
                          className="flex items-center justify-between p-space-2.5 px-space-3 radius-lg border border-border/30 bg-background/30 text-caption text-foreground/90"
                        >
                          <span className="truncate pr-space-2">{q}</span>
                          <button
                            type="button"
                            onClick={() => handleRemoveQuestion(idx)}
                            className="text-muted-foreground hover:text-error-500 cursor-pointer p-0.5"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          )}

          {/* TAB 4: ALLOWED DOMAINS */}
          {activeTab === "domains" && (
            <div className="space-y-space-6 animate-fade-in">
              <Card className="border-border/60 bg-card/40 backdrop-blur-xs">
                <CardHeader className="pb-space-4 border-b border-border/10">
                  <div className="flex items-center justify-between">
                    <div className="h-9 w-9 radius-lg bg-success-500/10 border border-success-500/20 flex items-center justify-center text-success-500">
                      <Globe className="h-5 w-5" />
                    </div>
                    <span className="text-caption bg-success-500/10 text-success-500 border border-success-500/20 px-space-2.5 py-space-0.5 radius-full font-semibold">
                      Origin Security
                    </span>
                  </div>
                  <CardTitle className="text-body-sm font-semibold text-foreground mt-space-3">
                    Allowed Whitelist Domains
                  </CardTitle>
                  <CardDescription className="text-caption text-muted-foreground">
                    Restrict which websites are authorized to embed your Operator AI widget.
                  </CardDescription>
                </CardHeader>
                <CardContent className="p-space-6 space-y-space-4">
                  <form onSubmit={handleAddDomain} className="flex gap-space-2 max-w-md">
                    <Input
                      value={newDomain}
                      onChange={(e) => setNewDomain(e.target.value)}
                      placeholder="e.g. mybusiness.com"
                      className="bg-background/50 border-border/50 text-caption"
                    />
                    <Button
                      type="submit"
                      disabled={addingDomain || !newDomain.trim()}
                      className="shrink-0 text-caption bg-primary hover:bg-primary/90 text-white"
                    >
                      {addingDomain ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Plus className="h-3.5 w-3.5" />}
                      <span>Add Domain</span>
                    </Button>
                  </form>

                  {domains.length === 0 ? (
                    <div className="p-space-3.5 radius-lg border border-border/20 bg-background/20 text-caption text-muted-foreground flex items-center gap-space-2">
                      <ShieldCheck className="h-4 w-4 text-emerald-500 shrink-0" />
                      <span>No domain restrictions set. The widget will run on all origins (recommended for testing).</span>
                    </div>
                  ) : (
                    <div className="space-y-space-2">
                      {domains.map((d) => (
                        <div
                          key={d.id}
                          className="flex items-center justify-between p-space-3 px-space-4 radius-lg border border-border/30 bg-background/30 text-caption"
                        >
                          <span className="font-semibold text-foreground">{d.domain}</span>
                          <Button
                            type="button"
                            variant="ghost"
                            className="h-7 w-7 text-error-500 hover:bg-error-500/10 p-0 cursor-pointer"
                            onClick={() => handleDeleteDomain(d.id)}
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </Button>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          )}

          {/* TAB 5: ANALYTICS */}
          {activeTab === "analytics" && (
            <div className="space-y-space-6 animate-fade-in">
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-space-4">
                <Card className="border-border/60 bg-card/40 p-space-4 space-y-space-1">
                  <span className="text-[11px] uppercase tracking-wider text-muted-foreground font-semibold">Widget Opens</span>
                  <p className="text-h3 font-bold text-foreground">{analytics.widgetOpens || 0}</p>
                </Card>
                <Card className="border-border/60 bg-card/40 p-space-4 space-y-space-1">
                  <span className="text-[11px] uppercase tracking-wider text-muted-foreground font-semibold">Conversations</span>
                  <p className="text-h3 font-bold text-primary">{analytics.conversationStarts || 0}</p>
                </Card>
                <Card className="border-border/60 bg-card/40 p-space-4 space-y-space-1">
                  <span className="text-[11px] uppercase tracking-wider text-muted-foreground font-semibold">Bookings Created</span>
                  <p className="text-h3 font-bold text-emerald-500">{analytics.bookingsCount || 0}</p>
                </Card>
                <Card className="border-border/60 bg-card/40 p-space-4 space-y-space-1">
                  <span className="text-[11px] uppercase tracking-wider text-muted-foreground font-semibold">Conversion Rate</span>
                  <p className="text-h3 font-bold text-foreground">{analytics.conversionRate || 0}%</p>
                </Card>
              </div>
            </div>
          )}
        </div>

        {/* Right Column: Live Sticky Preview Studio (5 cols) */}
        <div className="lg:col-span-5 lg:sticky lg:top-space-6 space-y-space-4">
          <div className="flex items-center justify-between select-none">
            <span className="text-caption uppercase font-semibold tracking-wider text-muted-foreground/80 flex items-center gap-space-1.5">
              <Palette className="h-3.5 w-3.5 text-primary" /> Live Preview
            </span>

            {/* View Mode Switcher: Chat View vs Bubble View */}
            <div className="flex items-center gap-space-1 p-space-0.5 radius-lg bg-background/50 border border-border/40 text-[11px]">
              <button
                type="button"
                onClick={() => setPreviewMode("chat")}
                className={cn(
                  "px-space-2.5 py-space-1 radius-md transition-colors cursor-pointer",
                  previewMode === "chat" ? "bg-primary text-white font-semibold shadow-xs" : "text-muted-foreground hover:text-foreground"
                )}
              >
                Chat View
              </button>
              <button
                type="button"
                onClick={() => setPreviewMode("bubble")}
                className={cn(
                  "px-space-2.5 py-space-1 radius-md transition-colors cursor-pointer",
                  previewMode === "bubble" ? "bg-primary text-white font-semibold shadow-xs" : "text-muted-foreground hover:text-foreground"
                )}
              >
                Floating Bubble
              </button>
            </div>
          </div>

          {/* Interactive Device Shell */}
          <div
            className="radius-2xl border backdrop-blur-md overflow-hidden flex flex-col shadow-lg transition-all duration-300"
            style={{
              borderColor: theme.themeMode === "dark" ? "rgba(255,255,255,0.12)" : "rgba(0,0,0,0.12)",
              backgroundColor: theme.themeMode === "dark" ? "#09090b" : "#ffffff",
            }}
          >
            {/* Browser Control Header */}
            <div
              className="flex items-center gap-space-2 px-space-4 py-space-3 border-b select-none"
              style={{
                backgroundColor: theme.themeMode === "dark" ? "#121215" : "#f4f4f5",
                borderColor: theme.themeMode === "dark" ? "rgba(255,255,255,0.08)" : "rgba(0,0,0,0.08)",
              }}
            >
              <div className="flex gap-space-1.5">
                <span className="h-2.5 w-2.5 radius-full bg-rose-500/80" />
                <span className="h-2.5 w-2.5 radius-full bg-amber-500/80" />
                <span className="h-2.5 w-2.5 radius-full bg-emerald-500/80" />
              </div>
              <div
                className="flex-1 max-w-xs mx-auto border radius-lg py-space-0.5 px-space-3 text-caption font-mono text-center truncate text-[11px]"
                style={{
                  backgroundColor: theme.themeMode === "dark" ? "rgba(255,255,255,0.05)" : "rgba(255,255,255,0.85)",
                  borderColor: theme.themeMode === "dark" ? "rgba(255,255,255,0.08)" : "rgba(0,0,0,0.08)",
                  color: theme.themeMode === "dark" ? "rgba(255,255,255,0.5)" : "rgba(0,0,0,0.5)",
                }}
              >
                https://{branding.companyName ? branding.companyName.toLowerCase().replace(/\s+/g, "") : "mybusiness"}.com
              </div>
            </div>

            {/* PREVIEW MODE 1: EXPANDED CHAT */}
            {previewMode === "chat" ? (
              <div
                className="flex flex-col justify-between h-[460px] w-full transition-colors"
                style={{
                  backgroundColor: theme.backgroundColor,
                  color: theme.textColor,
                }}
              >
                {/* Chat Top Banner */}
                <div
                  className="flex items-center justify-between p-space-3.5 px-space-4 border-b shrink-0"
                  style={{ borderColor: theme.borderColor }}
                >
                  <div className="flex items-center gap-space-2.5">
                    <div
                      className="h-8 w-8 radius-full flex items-center justify-center text-white font-bold text-xs"
                      style={{ backgroundColor: theme.primaryColor }}
                    >
                      {branding.companyName ? branding.companyName[0].toUpperCase() : "O"}
                    </div>
                    <div>
                      <h4 className="text-caption font-semibold leading-tight" style={{ color: theme.textColor }}>
                        {branding.companyName || "Operator AI Receptionist"}
                      </h4>
                      <p className="text-[11px] text-muted-foreground flex items-center gap-space-1 leading-tight">
                        <span className="h-1.5 w-1.5 radius-full bg-emerald-500 inline-block" />
                        {branding.tagline || "Online • 24/7 Front Desk"}
                      </p>
                    </div>
                  </div>
                </div>

                {/* Chat Messages Body */}
                <div className="flex-1 p-space-4 space-y-space-3 overflow-y-auto no-scrollbar">
                  {/* AI Greeting Message */}
                  <div className="flex items-start gap-space-2 max-w-[85%]">
                    <div
                      className="p-space-3 text-caption leading-relaxed border shadow-xs"
                      style={{
                        backgroundColor: theme.themeMode === "dark" ? "rgba(255,255,255,0.06)" : "rgba(0,0,0,0.03)",
                        borderColor: theme.borderColor,
                        color: theme.textColor,
                        borderRadius: "4px 16px 16px 16px",
                      }}
                    >
                      {branding.welcomeMessage || "Hello! How can I help you book or view services today?"}
                    </div>
                  </div>

                  {/* User Query Simulation */}
                  <div className="flex justify-end">
                    <div
                      className="p-space-3 text-caption leading-relaxed text-white font-medium max-w-[80%] shadow-xs"
                      style={{
                        backgroundColor: theme.primaryColor,
                        borderRadius: "16px 4px 16px 16px",
                      }}
                    >
                      Can I book an appointment for tomorrow?
                    </div>
                  </div>

                  {/* AI Assistant Confirmation */}
                  <div className="flex items-start gap-space-2 max-w-[85%]">
                    <div
                      className="p-space-3 text-caption leading-relaxed border shadow-xs"
                      style={{
                        backgroundColor: theme.themeMode === "dark" ? "rgba(255,255,255,0.06)" : "rgba(0,0,0,0.03)",
                        borderColor: theme.borderColor,
                        color: theme.textColor,
                        borderRadius: "4px 16px 16px 16px",
                      }}
                    >
                      Certainly! I can book that for you right now. Please choose from our available services below.
                    </div>
                  </div>
                </div>

                {/* Quick Action Chips (Rendered as sleek pill buttons, NOT giant arches!) */}
                {customization.suggestedActions.length > 0 && (
                  <div
                    className="flex items-center gap-space-1.5 p-space-2.5 px-space-3 border-t overflow-x-auto no-scrollbar shrink-0"
                    style={{ borderColor: theme.borderColor }}
                  >
                    {customization.suggestedActions.map((act: any, idx: number) => (
                      <button
                        key={idx}
                        type="button"
                        className="inline-flex items-center text-[11px] font-semibold px-space-3 py-space-1 radius-full shrink-0 transition-colors border shadow-xs"
                        style={{
                          backgroundColor: `${theme.primaryColor}15`,
                          borderColor: `${theme.primaryColor}30`,
                          color: theme.primaryColor,
                        }}
                      >
                        {act.label}
                      </button>
                    ))}
                  </div>
                )}

                {/* Chat Input Bar */}
                <div
                  className="p-space-3 border-t flex items-center gap-space-2 shrink-0"
                  style={{ borderColor: theme.borderColor }}
                >
                  <div
                    className="flex-1 h-9 radius-lg border bg-transparent text-caption flex items-center px-space-3 text-muted-foreground/60 text-xs"
                    style={{ borderColor: theme.borderColor }}
                  >
                    Type your message...
                  </div>
                  <div
                    className="h-9 w-9 radius-lg flex items-center justify-center text-white shrink-0 shadow-xs cursor-pointer hover:opacity-90"
                    style={{ backgroundColor: theme.primaryColor }}
                  >
                    <Send className="h-4 w-4" />
                  </div>
                </div>
              </div>
            ) : (
              /* PREVIEW MODE 2: FLOATING BUBBLE ON SITE */
              <div
                className="relative h-[460px] w-full p-space-6 flex flex-col justify-between"
                style={{
                  backgroundColor: theme.themeMode === "dark" ? "#09090b" : "#f8fafc",
                }}
              >
                {/* Mock Website Page Content */}
                <div className="space-y-space-3 select-none opacity-40">
                  <div className="h-4 w-1/3 bg-foreground/20 radius-md" />
                  <div className="h-2.5 w-full bg-foreground/15 radius-md" />
                  <div className="h-2.5 w-5/6 bg-foreground/15 radius-md" />
                  <div className="h-2.5 w-2/3 bg-foreground/15 radius-md" />
                  <div className="pt-space-4 flex gap-space-2">
                    <div className="h-7 w-24 bg-primary/20 radius-md" />
                    <div className="h-7 w-20 bg-foreground/15 radius-md" />
                  </div>
                </div>

                {/* Floating Bubble in Configured Corner */}
                <div
                  className={cn(
                    "absolute bottom-space-6 flex items-center gap-space-2.5 transition-all duration-300",
                    launcher.position === "bottom_left" ? "left-space-6 flex-row-reverse" : "right-space-6 flex-row"
                  )}
                >
                  {/* Greeting Tooltip Callout */}
                  <div
                    className="border text-caption font-semibold px-space-3 py-space-1.5 radius-xl select-none flex items-center gap-space-1.5 shadow-md text-xs animate-fade-in"
                    style={{
                      backgroundColor: theme.themeMode === "dark" ? "#18181b" : "#ffffff",
                      borderColor: theme.themeMode === "dark" ? "rgba(255,255,255,0.15)" : "rgba(0,0,0,0.1)",
                      color: theme.textColor,
                    }}
                  >
                    <span className="h-1.5 w-1.5 radius-full bg-emerald-500" />
                    Chat with {branding.companyName || "us"}
                  </div>

                  {/* Circular Launcher Icon */}
                  <div
                    className="h-12 w-12 radius-full flex items-center justify-center text-white shadow-lg cursor-pointer hover:scale-105 transition-transform"
                    style={{
                      backgroundColor: theme.primaryColor,
                      boxShadow: `0 4px 20px ${theme.primaryColor}50`,
                    }}
                  >
                    <MessageSquare className="h-6 w-6" />
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
