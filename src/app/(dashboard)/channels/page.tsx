"use client";

import { useState, useEffect } from"react";
import {
 getChannelsAction,
 connectChannelAction,
 saveChannelSettingsAction
} from"@/server/actions/omnichannel";
import {
 MessageSquare,
 Plus,
 Check,
 Loader2,
 AlertCircle,
 Settings,
 Mail,
 Phone,
 Shield,
 HelpCircle,
 ExternalLink,
 Info,
 Copy
} from"lucide-react";
import { Button } from"@/components/shared/button";
import { Input } from"@/components/shared/input";
import { Label } from"@/components/shared/label";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from"@/components/shared/card";
import { PageTitle } from"@/components/shared/page-title";
import { cn } from"@/components/shared/utils";

const TONES = [
 { value:"Professional", label:"Professional", description:"Clinic style", icon: Shield },
 { value:"Friendly", label:"Friendly", description:"Spa / Salon style", icon: HelpCircle },
 { value:"Empathetic", label:"Empathetic", description:"Support style", icon: Info },
 { value:"Casual", label:"Casual", description:"Gym / Lounge style", icon: MessageSquare },
];

export default function ChannelsPage() {
 const [loading, setLoading] = useState(true);
 const [channels, setChannels] = useState<any[]>([]);
 const [activeSetupChannel, setActiveSetupChannel] = useState<string | null>(null);
 const [activeSettingsChannel, setActiveSettingsChannel] = useState<any | null>(null);
 const [errorMsg, setErrorMsg] = useState("");
 const [copied, setCopied] = useState(false);

 // Setup state fields
 const [channelName, setChannelName] = useState("");
 // SMS/MSG91 inputs
 const [msg91AuthKey, setMsg91AuthKey] = useState("");
 const [msg91FlowId, setMsg91FlowId] = useState("");
 const [msg91SenderId, setMsg91SenderId] = useState("");
 // WhatsApp/Meta inputs
 const [metaPhoneId, setMetaPhoneId] = useState("");
 const [metaWabaId, setMetaWabaId] = useState("");
 const [metaAccessToken, setMetaAccessToken] = useState("");
 // SMTP Email inputs
 const [emailUser, setEmailUser] = useState("");
 const [emailPass, setEmailPass] = useState("");
 const [emailHost, setEmailHost] = useState("");
 const [emailPort, setEmailPort] = useState(587);

 const [connecting, setConnecting] = useState(false);

 // Settings State fields
 const [settingsAiEnabled, setSettingsAiEnabled] = useState(true);
 const [settingsAiTone, setSettingsAiTone] = useState("Professional");
 const [settingsDelay, setSettingsDelay] = useState(0);
 const [settingsHoursOnly, setSettingsHoursOnly] = useState(false);
 const [savingSettings, setSavingSettings] = useState(false);

 const loadChannels = async () => {
 setLoading(true);
 const res = await getChannelsAction();
 if (res.success && res.channels) {
 setChannels(res.channels);
 } else {
 setErrorMsg(res.error ||"Failed to load channel configurations.");
 }
 setLoading(false);
 };

 useEffect(() => {
 loadChannels();
 }, []);

 const openSetup = (type: string) => {
 setActiveSetupChannel(type);
 setActiveSettingsChannel(null); // Close settings panel if open
 setChannelName(`${type.toUpperCase()} Integration`);
 setMsg91AuthKey("");
 setMsg91FlowId("");
 setMsg91SenderId("");
 setMetaPhoneId("");
 setMetaWabaId("");
 setMetaAccessToken("");
 setEmailUser("");
 setEmailPass("");
 setEmailHost("");
 setEmailPort(587);
 };

 const handleConnect = async (e: React.FormEvent) => {
 e.preventDefault();
 if (!activeSetupChannel) return;

 setConnecting(true);
 setErrorMsg("");

 let credentials: Record<string, any> = {};
 let metadata: Record<string, any> = {};

 if (activeSetupChannel ==="sms") {
 credentials = {
 authKey: msg91AuthKey,
 flowId: msg91FlowId,
 senderId: msg91SenderId
 };
 } else if (activeSetupChannel ==="whatsapp") {
 credentials = {
 phoneId: metaPhoneId,
 wabaId: metaWabaId,
 accessToken: metaAccessToken
 };
 } else if (activeSetupChannel ==="email") {
 credentials = {
 user: emailUser,
 pass: emailPass,
 host: emailHost,
 port: emailPort
 };
 } else if (activeSetupChannel ==="instagram"|| activeSetupChannel ==="facebook") {
 credentials = {
 instagramId: metaPhoneId,
 pageId: metaWabaId,
 pageAccessToken: metaAccessToken
 };
 }

 const res = await connectChannelAction({
 type: activeSetupChannel as any,
 name: channelName,
 credentials,
 metadata
 });

 if (res.success) {
 setActiveSetupChannel(null);
 loadChannels();
 } else {
 setErrorMsg(res.error ||"Failed to establish channel connection.");
 }
 setConnecting(false);
 };

 const openSettings = (channel: any) => {
 setActiveSettingsChannel(channel);
 setActiveSetupChannel(null); // Close setup panel if open
 const s = channel.settings?.[0] || {
 aiEnabled: true,
 aiTone:"Professional",
 responseDelaySeconds: 0,
 businessHoursOnly: false
 };
 setSettingsAiEnabled(s.aiEnabled);
 setSettingsAiTone(s.aiTone);
 setSettingsDelay(s.responseDelaySeconds);
 setSettingsHoursOnly(s.businessHoursOnly);
 };

 const handleSaveSettings = async (e: React.FormEvent) => {
 e.preventDefault();
 if (!activeSettingsChannel) return;

 setSavingSettings(true);
 const res = await saveChannelSettingsAction({
 channelId: activeSettingsChannel.id,
 aiEnabled: settingsAiEnabled,
 aiTone: settingsAiTone,
 responseDelaySeconds: settingsDelay,
 businessHoursOnly: settingsHoursOnly
 });

 if (res.success) {
 setActiveSettingsChannel(null);
 loadChannels();
 } else {
 setErrorMsg(res.error ||"Failed to update channel settings.");
 }
 setSavingSettings(false);
 };

 const handleCopyWebhook = (url: string) => {
 navigator.clipboard.writeText(url);
 setCopied(true);
 setTimeout(() => setCopied(false), 2000);
 };

 const isConnected = (type: string) => {
 return channels.some((c) => c.type === type && c.status ==="active");
 };

 const getChannelInstance = (type: string) => {
 return channels.find((c) => c.type === type);
 };

 return (
 <div className="relative space-y-space-6 pb-space-8">
 {/* Premium background mesh decoration */}
 <div className="absolute right-0 top-0 h-96 w-96 bg-radial-gradient(circle, hsl(var(--primary)/0.06) 0%, transparent 70%) pointer-events-none filter blur-3xl z-0"/>

 {/* Header section */}
 <div className="relative z-10">
 <PageTitle
 title="Channels"
 description="Where Operator AI talks to customers. Connect WhatsApp, SMS, email, or your website."
 className="mb-0"
 />
 </div>

 {errorMsg && (
 <div className="flex items-center gap-space-3 radius-xl bg-state-error-bg/15 border border-state-error-text/20 p-space-4 text-caption text-state-error-text animate-fade-in relative z-10">
 <AlertCircle className="h-4.5 w-4.5 shrink-0"/>
 <span className="flex-1 font-medium">{errorMsg}</span>
 <Button 
 className="h-6 w-6 radius-full flex items-center justify-center hover:bg-state-error-text/10 text-state-error-text transition-colors cursor-pointer"
 onClick={() => setErrorMsg("")}
 >
 ✕
 </Button>
 </div>
 )}

 {loading ? (
 <div className="h-96 flex flex-col items-center justify-center text-caption text-muted-foreground/80 gap-space-3 border border-border-muted bg-card/15 backdrop-blur-xs radius-2xl relative z-10">
 <Loader2 className="h-6 w-6 animate-spin text-primary"/>
 <span className="font-medium">Syncing live channel directory...</span>
 </div>
 ) : (
 <div className="grid grid-cols-1 lg:grid-cols-12 gap-space-8 items-start relative z-10">

 {/* Channel Cards Directory */}
 <div className="lg:col-span-8 grid grid-cols-1 md:grid-cols-2 gap-space-6">

 {/* 1. Meta WhatsApp */}
 <Card className="border border-border-muted hover:border-emerald-500/40 hover:-translate-y-1 transition-all duration-300 bg-card/25 backdrop-blur-md flex flex-col justify-between group overflow-hidden relative">
 <div className="absolute top-0 right-0 h-24 w-24 bg-emerald-500/5 radial-gradient(circle, var(--color-success-500) 0%, transparent 70%) pointer-events-none filter blur-xl opacity-0 group-hover:opacity-100 transition-opacity duration-300"/>
 <CardHeader className="pb-space-3">
 <div className="flex items-center justify-between">
 <div className="h-10 w-10 radius-lg bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-500 transition-transform duration-300 group-hover:scale-105">
 <Phone className="h-5 w-5"/>
 </div>
 {isConnected("whatsapp") ? (
 <span className="text-caption font-semibold flex items-center gap-space-1.5 bg-emerald-500/10 text-emerald-500 border border-emerald-500/20 px-space-3 py-space-1 radius-full">
 <span className="h-1.5 w-1.5 radius-full bg-emerald-500 animate-pulse"/>
 Connected
 </span>
 ) : (
 <span className="text-caption font-medium bg-neutral-500/10 text-muted-foreground border border-neutral-500/20 px-space-3 py-space-1 radius-full">
 Disconnected
 </span>
 )}
 </div>
 <CardTitle className="text-body-sm font-semibold text-foreground mt-space-4">Meta WhatsApp Business</CardTitle>
 <CardDescription className="text-caption text-muted-foreground/80 mt-space-1.5 leading-relaxed">
 Deliver templates, confirmations, and qualify leads on the world's most popular messaging network.
 </CardDescription>
 </CardHeader>
 <CardFooter className="pt-space-3 border-t border-border-muted flex gap-space-2 justify-end bg-card/5">
 {isConnected("whatsapp") ? (
 <Button size="sm"variant="outline"className="h-8 text-caption border-border-muted hover:border-emerald-500/30 hover:bg-emerald-500/5 hover:text-emerald-500 transition-colors"onClick={() => openSettings(getChannelInstance("whatsapp"))}>
 <Settings className="h-3.5 w-3.5 mr-space-1"/> Settings
 </Button>
 ) : (
 <Button size="sm"className="h-8 text-caption bg-emerald-600 hover:bg-emerald-500 text-white border-none transition-all"onClick={() => openSetup("whatsapp")}>
 Connect API
 </Button>
 )}
 </CardFooter>
 </Card>

  {/* 2. Vonage / Sinch SMS */}
  <Card className="border border-border-muted hover:border-orange-500/40 hover:-translate-y-1 transition-all duration-300 bg-card/25 backdrop-blur-md flex flex-col justify-between group overflow-hidden relative">
  <div className="absolute top-0 right-0 h-24 w-24 bg-orange-500/5 radial-gradient(circle, var(--color-warning-500) 0%, transparent 70%) pointer-events-none filter blur-xl opacity-0 group-hover:opacity-100 transition-opacity duration-300"/>
  <CardHeader className="pb-space-3">
  <div className="flex items-center justify-between">
  <div className="h-10 w-10 radius-lg bg-orange-500/10 border border-orange-500/20 flex items-center justify-center text-orange-500 transition-transform duration-300 group-hover:scale-105">
  <MessageSquare className="h-5 w-5"/>
  </div>
  {isConnected("sms") ? (
  <span className="text-caption font-semibold flex items-center gap-space-1.5 bg-emerald-500/10 text-emerald-500 border border-emerald-500/20 px-space-3 py-space-1 radius-full">
  <span className="h-1.5 w-1.5 radius-full bg-emerald-500 animate-pulse"/>
  Connected
  </span>
  ) : (
  <span className="text-caption font-medium bg-neutral-500/10 text-muted-foreground border border-neutral-500/20 px-space-3 py-space-1 radius-full">
  Disconnected
  </span>
  )}
  </div>
  <CardTitle className="text-body-sm font-semibold text-foreground mt-space-4">Vonage / Sinch SMS</CardTitle>
  <CardDescription className="text-caption text-muted-foreground/80 mt-space-1.5 leading-relaxed">
  Enable customer communication over US and European SMS networks via Vonage (Primary) or Sinch. Supports automated appointment reminders and two-way conversations.
  </CardDescription>
  </CardHeader>
  <CardFooter className="pt-space-3 border-t border-border-muted flex gap-space-2 justify-end bg-card/5">
  {isConnected("sms") ? (
  <Button size="sm"variant="outline"className="h-8 text-caption border-border-muted hover:border-orange-500/30 hover:bg-orange-500/5 hover:text-orange-500 transition-colors"onClick={() => openSettings(getChannelInstance("sms"))}>
  <Settings className="h-3.5 w-3.5 mr-space-1"/> Settings
  </Button>
  ) : (
  <Button size="sm"className="h-8 text-caption bg-orange-600 hover:bg-orange-500 text-white border-none transition-all"onClick={() => openSetup("sms")}>
  Connect SMS
  </Button>
  )}
  </CardFooter>
  </Card>

 {/* 3. SMTP Email */}
 <Card className="border border-border-muted hover:border-amber-500/40 hover:-translate-y-1 transition-all duration-300 bg-card/25 backdrop-blur-md flex flex-col justify-between group overflow-hidden relative">
 <div className="absolute top-0 right-0 h-24 w-24 bg-amber-500/5 radial-gradient(circle, var(--color-warning-500) 0%, transparent 70%) pointer-events-none filter blur-xl opacity-0 group-hover:opacity-100 transition-opacity duration-300"/>
 <CardHeader className="pb-space-3">
 <div className="flex items-center justify-between">
 <div className="h-10 w-10 radius-lg bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-500 transition-transform duration-300 group-hover:scale-105">
 <Mail className="h-5 w-5"/>
 </div>
 {isConnected("email") ? (
 <span className="text-caption font-semibold flex items-center gap-space-1.5 bg-emerald-500/10 text-emerald-500 border border-emerald-500/20 px-space-3 py-space-1 radius-full">
 <span className="h-1.5 w-1.5 radius-full bg-emerald-500 animate-pulse"/>
 Connected
 </span>
 ) : (
 <span className="text-caption font-medium bg-neutral-500/10 text-muted-foreground border border-neutral-500/20 px-space-3 py-space-1 radius-full">
 Disconnected
 </span>
 )}
 </div>
 <CardTitle className="text-body-sm font-semibold text-foreground mt-space-4">SMTP / Gmail / M365 Email</CardTitle>
 <CardDescription className="text-caption text-muted-foreground/80 mt-space-1.5 leading-relaxed">
 Connect business email accounts to automatically thread, process and reply to incoming support requests.
 </CardDescription>
 </CardHeader>
 <CardFooter className="pt-space-3 border-t border-border-muted flex gap-space-2 justify-end bg-card/5">
 {isConnected("email") ? (
 <Button size="sm" variant="outline" className="h-8 text-caption transition-colors" onClick={() => openSettings(getChannelInstance("email"))}>
 <Settings className="h-3.5 w-3.5 mr-space-1"/> Settings
 </Button>
 ) : (
 <Button size="sm" variant="warning" className="h-8 text-caption border-none transition-all" onClick={() => openSetup("email")}>
 Connect Host
 </Button>
 )}
 </CardFooter>
 </Card>

 {/* 4. Instagram Direct */}
 <Card className="border border-border-muted hover:border-rose-500/40 hover:-translate-y-1 transition-all duration-300 bg-card/25 backdrop-blur-md flex flex-col justify-between group overflow-hidden relative">
 <div className="absolute top-0 right-0 h-24 w-24 bg-rose-500/5 radial-gradient(circle, var(--color-error-500) 0%, transparent 70%) pointer-events-none filter blur-xl opacity-0 group-hover:opacity-100 transition-opacity duration-300"/>
 <CardHeader className="pb-space-3">
 <div className="flex items-center justify-between">
 <div className="h-10 w-10 radius-lg bg-rose-500/10 border border-rose-500/20 flex items-center justify-center text-rose-500 transition-transform duration-300 group-hover:scale-105">
 <ExternalLink className="h-5 w-5"/>
 </div>
 {isConnected("instagram") ? (
 <span className="text-caption font-semibold flex items-center gap-space-1.5 bg-emerald-500/10 text-emerald-500 border border-emerald-500/20 px-space-3 py-space-1 radius-full">
 <span className="h-1.5 w-1.5 radius-full bg-emerald-500 animate-pulse"/>
 Connected
 </span>
 ) : (
 <span className="text-caption font-medium bg-neutral-500/10 text-muted-foreground border border-neutral-500/20 px-space-3 py-space-1 radius-full">
 Disconnected
 </span>
 )}
 </div>
 <CardTitle className="text-body-sm font-semibold text-foreground mt-space-4">Instagram DM Channel</CardTitle>
 <CardDescription className="text-caption text-muted-foreground/80 mt-space-1.5 leading-relaxed">
 Answer brand DMs, handle product availability inquiries, and guide users to booking pages.
 </CardDescription>
 </CardHeader>
 <CardFooter className="pt-space-3 border-t border-border-muted flex gap-space-2 justify-end bg-card/5">
 {isConnected("instagram") ? (
 <Button size="sm"variant="outline"className="h-8 text-caption border-border-muted hover:border-rose-500/30 hover:bg-rose-500/5 hover:text-rose-500 transition-colors"onClick={() => openSettings(getChannelInstance("instagram"))}>
 <Settings className="h-3.5 w-3.5 mr-space-1"/> Settings
 </Button>
 ) : (
 <Button size="sm"className="h-8 text-caption bg-rose-600 hover:bg-rose-500 text-white border-none transition-all"onClick={() => openSetup("instagram")}>
 Connect Page
 </Button>
 )}
 </CardFooter>
 </Card>

 </div>

 {/* Setup / Settings Sidebar (Right pane) */}
 <div className="lg:col-span-4 sticky top-space-6">

 {/* WIZARD 1: CONNECTION WIZARD */}
 {activeSetupChannel && (
 <form onSubmit={handleConnect} className="animate-fade-in">
 <Card className="border border-border-muted bg-card/30 backdrop-blur-md radius-2xl overflow-hidden">
 <CardHeader className="border-b border-border-muted bg-card/5">
 <CardTitle className="capitalize text-body-md font-semibold text-foreground flex items-center gap-space-2">
 <Plus className="h-4.5 w-4.5 text-primary"/>
 Connect {activeSetupChannel}
 </CardTitle>
 <CardDescription className="text-caption text-muted-foreground mt-space-0.5">Enter provider API tokens to establish connection pipelines.</CardDescription>
 </CardHeader>
 <CardContent className="space-y-space-4 text-caption p-space-6">
 <div className="space-y-space-1">
 <Label htmlFor="channelName"className="font-semibold text-foreground/80">Integration Label</Label>
 <Input
 id="channelName"
 value={channelName}
 onChange={(e) => setChannelName(e.target.value)}
 className="h-9 bg-background/50 text-caption border-border-muted hover:border-border focus:border-primary transition-colors focus-visible:ring-0 focus-visible:outline-hidden"
 required
 />
 </div>

  {/* Vonage / Sinch SMS Input fields */}
  {activeSetupChannel === "sms" && (
    <div className="space-y-space-3 pt-space-2 border-t border-border-muted/50">
      <div className="space-y-space-1">
        <Label htmlFor="vonageApiKey" className="font-semibold text-foreground/80">Vonage API Key (or Sinch Plan ID)</Label>
        <Input
          id="vonageApiKey"
          value={msg91AuthKey}
          onChange={(e) => setMsg91AuthKey(e.target.value)}
          placeholder="e.g. vonage_api_key_xxx"
          className="h-9 bg-background/50 text-caption border-border-muted hover:border-border focus:border-primary transition-colors focus-visible:ring-0 focus-visible:outline-hidden"
          required
        />
      </div>
      <div className="space-y-space-1">
        <Label htmlFor="vonageApiSecret" className="font-semibold text-foreground/80">Vonage API Secret (or Sinch API Token)</Label>
        <Input
          id="vonageApiSecret"
          type="password"
          value={msg91FlowId}
          onChange={(e) => setMsg91FlowId(e.target.value)}
          placeholder="••••••••"
          className="h-9 bg-background/50 text-caption border-border-muted hover:border-border focus:border-primary transition-colors focus-visible:ring-0 focus-visible:outline-hidden"
          required
        />
      </div>
      <div className="space-y-space-1">
        <Label htmlFor="vonageSenderId" className="font-semibold text-foreground/80">Sender ID / Brand Name</Label>
        <Input
          id="vonageSenderId"
          value={msg91SenderId}
          onChange={(e) => setMsg91SenderId(e.target.value)}
          placeholder="e.g. Operator or 15551234567"
          className="h-9 bg-background/50 text-caption border-border-muted hover:border-border focus:border-primary transition-colors focus-visible:ring-0 focus-visible:outline-hidden"
          required
        />
      </div>
    </div>
  )}

 {/* Meta WhatsApp fields */}
 {activeSetupChannel ==="whatsapp"&& (
 <div className="space-y-space-3 pt-space-2 border-t border-border-muted/50">
 <div className="space-y-space-1">
 <Label htmlFor="metaPhoneId"className="font-semibold text-foreground/80">Phone Number ID</Label>
 <Input
 id="metaPhoneId"
 value={metaPhoneId}
 onChange={(e) => setMetaPhoneId(e.target.value)}
 className="h-9 bg-background/50 text-caption border-border-muted hover:border-border focus:border-primary transition-colors focus-visible:ring-0 focus-visible:outline-hidden"
 required
 />
 </div>
 <div className="space-y-space-1">
 <Label htmlFor="metaWabaId"className="font-semibold text-foreground/80">WhatsApp Business Account ID</Label>
 <Input
 id="metaWabaId"
 value={metaWabaId}
 onChange={(e) => setMetaWabaId(e.target.value)}
 className="h-9 bg-background/50 text-caption border-border-muted hover:border-border focus:border-primary transition-colors focus-visible:ring-0 focus-visible:outline-hidden"
 required
 />
 </div>
 <div className="space-y-space-1">
 <Label htmlFor="metaAccessToken"className="font-semibold text-foreground/80">Meta System User Access Token</Label>
 <Input
 id="metaAccessToken"
 type="password"
 value={metaAccessToken}
 onChange={(e) => setMetaAccessToken(e.target.value)}
 className="h-9 bg-background/50 text-caption border-border-muted hover:border-border focus:border-primary transition-colors focus-visible:ring-0 focus-visible:outline-hidden"
 required
 />
 </div>
 </div>
 )}

 {/* SMTP fields */}
 {activeSetupChannel ==="email"&& (
 <div className="space-y-space-3 pt-space-2 border-t border-border-muted/50">
 <div className="grid grid-cols-2 gap-space-3">
 <div className="space-y-space-1">
 <Label htmlFor="emailHost"className="font-semibold text-foreground/80">SMTP Host Server</Label>
 <Input
 id="emailHost"
 value={emailHost}
 onChange={(e) => setEmailHost(e.target.value)}
 placeholder="smtp.mail.com"
 className="h-9 bg-background/50 text-caption border-border-muted hover:border-border focus:border-primary transition-colors focus-visible:ring-0 focus-visible:outline-hidden"
 required
 />
 </div>
 <div className="space-y-space-1">
 <Label htmlFor="emailPort"className="font-semibold text-foreground/80">SMTP Port</Label>
 <Input
 id="emailPort"
 type="number"
 value={emailPort}
 onChange={(e) => setEmailPort(parseInt(e.target.value) || 587)}
 className="h-9 bg-background/50 text-caption border-border-muted hover:border-border focus:border-primary transition-colors focus-visible:ring-0 focus-visible:outline-hidden"
 required
 />
 </div>
 </div>
 <div className="space-y-space-1">
 <Label htmlFor="emailUser"className="font-semibold text-foreground/80">Username / Account Email</Label>
 <Input
 id="emailUser"
 value={emailUser}
 onChange={(e) => setEmailUser(e.target.value)}
 placeholder="hello@business.com"
 className="h-9 bg-background/50 text-caption border-border-muted hover:border-border focus:border-primary transition-colors focus-visible:ring-0 focus-visible:outline-hidden"
 required
 />
 </div>
 <div className="space-y-space-1">
 <Label htmlFor="emailPass"className="font-semibold text-foreground/80">Password / Application Secret</Label>
 <Input
 id="emailPass"
 type="password"
 value={emailPass}
 onChange={(e) => setEmailPass(e.target.value)}
 placeholder="••••••••"
 className="h-9 bg-background/50 text-caption border-border-muted hover:border-border focus:border-primary transition-colors focus-visible:ring-0 focus-visible:outline-hidden"
 required
 />
 </div>
 </div>
 )}

 {/* Meta IG / FB Page fields */}
 {(activeSetupChannel ==="instagram"|| activeSetupChannel ==="facebook") && (
 <div className="space-y-space-3 pt-space-2 border-t border-border-muted/50">
 <div className="space-y-space-1">
 <Label htmlFor="metaWabaId"className="font-semibold text-foreground/80">Facebook Page ID</Label>
 <Input
 id="metaWabaId"
 value={metaWabaId}
 onChange={(e) => setMetaWabaId(e.target.value)}
 className="h-9 bg-background/50 text-caption border-border-muted hover:border-border focus:border-primary transition-colors focus-visible:ring-0 focus-visible:outline-hidden"
 required
 />
 </div>
 {activeSetupChannel ==="instagram"&& (
 <div className="space-y-space-1">
 <Label htmlFor="metaPhoneId"className="font-semibold text-foreground/80">Instagram Business Account ID</Label>
 <Input
 id="metaPhoneId"
 value={metaPhoneId}
 onChange={(e) => setMetaPhoneId(e.target.value)}
 className="h-9 bg-background/50 text-caption border-border-muted hover:border-border focus:border-primary transition-colors focus-visible:ring-0 focus-visible:outline-hidden"
 required
 />
 </div>
 )}
 <div className="space-y-space-1">
 <Label htmlFor="metaAccessToken"className="font-semibold text-foreground/80">Facebook Page Access Token</Label>
 <Input
 id="metaAccessToken"
 type="password"
 value={metaAccessToken}
 onChange={(e) => setMetaAccessToken(e.target.value)}
 className="h-9 bg-background/50 text-caption border-border-muted hover:border-border focus:border-primary transition-colors focus-visible:ring-0 focus-visible:outline-hidden"
 required
 />
 </div>
 </div>
 )}
 </CardContent>
 <CardFooter className="flex gap-space-2 justify-end border-t border-border-muted pt-space-4 pb-space-5 px-space-6 bg-card/5">
 <Button
 type="button"
 variant="outline"
 size="sm"
 onClick={() => setActiveSetupChannel(null)}
 className="border-border-muted text-muted-foreground hover:text-foreground"
 >
 Cancel
 </Button>
 <Button type="submit"size="sm"disabled={connecting} className="bg-primary text-white hover:brightness-105 border-none">
 {connecting ?"Connecting...":"Save Pipeline"}
 </Button>
 </CardFooter>
 </Card>
 </form>
 )}

 {/* WIZARD 2: TONE & AI SETTINGS WIDGET */}
 {activeSettingsChannel && (
 <form onSubmit={handleSaveSettings} className="animate-fade-in">
 <Card className="border border-border-muted bg-card/30 backdrop-blur-md radius-2xl overflow-hidden">
 <CardHeader className="border-b border-border-muted bg-card/5">
 <CardTitle className="capitalize text-body-md font-semibold text-foreground flex items-center gap-space-2">
 <Settings className="h-4.5 w-4.5 text-primary"/>
 {activeSettingsChannel.type} Response Settings
 </CardTitle>
 <CardDescription className="text-caption text-muted-foreground mt-space-0.5">Tweak AI behavior, delays, response tones, and business hours rules.</CardDescription>
 </CardHeader>
 <CardContent className="space-y-space-4 text-caption p-space-6">

 {/* Premium switch control card */}
 <div 
 onClick={() => setSettingsAiEnabled(!settingsAiEnabled)}
 className={cn(
 "flex items-start gap-space-3 p-space-4 radius-xl border cursor-pointer transition-all duration-200 select-none",
 settingsAiEnabled 
 ?"bg-primary/5 border-primary/20"
 :"bg-background/25 border-border-muted"
 )} tabIndex={0} onKeyDown={() => {}}
 >
 <div className={cn(
 "w-8 h-5 radius-full p-[2px] transition-colors duration-200 shrink-0",
 settingsAiEnabled ?"bg-primary":"bg-neutral-300 "
 )}>
 <div className={cn(
 "w-4 h-4 radius-full bg-white transition-transform duration-200",
 settingsAiEnabled ?"translate-x-3":"translate-x-0"
 )} />
 </div>
 <div className="space-y-space-0.5">
 <span className="text-caption font-medium block text-foreground">Enable AI Autopilot Responses</span>
 <span className="text-caption text-muted-foreground block leading-normal">Allows the bot to process and reply immediately.</span>
 </div>
 </div>

 <div className="space-y-space-2 border-t border-border-muted/50 pt-space-3">
 <Label htmlFor="aiTone"className="font-semibold text-foreground/80 block">Conversation Tone</Label>
 
 {/* Premium Visual Tone Selector Tiles */}
 <div className="grid grid-cols-2 gap-space-2 mt-space-1">
 {TONES.map((t) => {
 const Icon = t.icon;
 const isSelected = settingsAiTone === t.value;
 return (
 <div
 key={t.value}
 onClick={() => setSettingsAiTone(t.value)}
 className={cn(
 "p-space-3 radius-lg border cursor-pointer transition-all duration-200 flex flex-col justify-between h-20 hover:bg-bg-layer-1 select-none",
 isSelected
 ?"border-primary bg-primary/5 text-primary ring-1 ring-primary/20"
 :"border-border-muted bg-background/10 text-foreground/80 hover:border-border-muted/80"
 )} tabIndex={0} onKeyDown={() => {}}
 >
 <div className="flex items-center justify-between">
 <Icon className={cn("h-4 w-4", isSelected ?"text-primary":"text-muted-foreground")} />
 {isSelected && (
 <div className="h-1.5 w-1.5 radius-full bg-primary animate-pulse"/>
 )}
 </div>
 <div>
 <span className="text-caption font-semibold block text-foreground leading-none mb-space-0.5">{t.label}</span>
 <span className="text-caption text-muted-foreground block leading-tight">{t.description}</span>
 </div>
 </div>
 );
 })}
 </div>
 </div>

 <div className="grid grid-cols-2 gap-space-3 border-t border-border-muted/50 pt-space-3">
 <div className="space-y-space-1">
 <Label htmlFor="settingsDelay"className="font-semibold text-foreground/80">Response Delay (sec)</Label>
 <Input
 id="settingsDelay"
 type="number"
 value={settingsDelay}
 onChange={(e) => setSettingsDelay(parseInt(e.target.value) || 0)}
 className="h-8 bg-background/50 text-caption border-border-muted focus:border-primary transition-colors focus-visible:ring-0 focus-visible:outline-hidden"
 />
 </div>

 <div className="space-y-space-2 flex flex-col justify-end">
 <label 
 onClick={() => setSettingsHoursOnly(!settingsHoursOnly)}
 className={cn(
 "flex items-center gap-space-2 cursor-pointer p-space-2 border border-border-muted radius-lg transition-colors select-none",
 settingsHoursOnly ?"bg-primary/5 border-primary/20 text-primary":"bg-background/25 hover:bg-bg-layer-1 text-muted-foreground"
 )}
 >
 <div className={cn(
 "w-4 h-4 radius-md border border-border-muted flex items-center justify-center transition-colors shrink-0",
 settingsHoursOnly ?"bg-primary border-primary text-white":"bg-transparent"
 )}>
 {settingsHoursOnly && <Check className="h-3 w-3 stroke-[3]"/>}
 </div>
 <span className="text-caption font-medium select-none">Only Business Hours</span>
 </label>
 </div>
 </div>

 {/* Webhook URLs (Meta/Vonage) */}
 <div className="space-y-space-2 border-t border-border-muted pt-space-4">
 <Label className="text-caption text-muted-foreground uppercase font-semibold tracking-wider">Incoming Webhook URL</Label>
 <div className="relative flex items-center justify-between p-space-3 bg-bg-layer-2 border border-border-muted radius-lg font-mono text-caption text-foreground/80 break-all select-all group overflow-hidden">
 <span className="pr-space-12 text-caption sm:text-caption truncate">
 {activeSettingsChannel.type ==="sms"
 ?`${typeof window !=="undefined"? window.location.origin :""}/api/webhooks/vonage`
 :`${typeof window !=="undefined"? window.location.origin :""}/api/webhooks/meta`
 }
 </span>
 <Button
 type="button"
 size="sm"
 variant="outline"
 className={cn(
 "absolute right-space-2 h-7 px-space-2 text-caption bg-card hover:bg-bg-layer-1 border border-border-muted shrink-0 transition-all cursor-pointer",
 copied &&"border-success-500/40 text-success-500 bg-success-500/5 hover:bg-success-500/10"
 )}
 onClick={() => {
 const url = activeSettingsChannel.type ==="sms"
 ?`${window.location.origin}/api/webhooks/vonage`
 :`${window.location.origin}/api/webhooks/meta`;
 handleCopyWebhook(url);
 }}
 >
 {copied ? (
 <>
 <Check className="h-3 w-3 mr-space-1 text-success-500"/>
 Copied
 </>
 ) : (
 <>
 <Copy className="h-3 w-3 mr-space-1"/>
 Copy
 </>
 )}
 </Button>
 </div>
 <p className="text-caption text-muted-foreground/85 flex items-start gap-space-1.5 leading-normal mt-space-1">
 <Info className="h-3.5 w-3.5 shrink-0 text-primary mt-[1px]"/>
 <span>Configure this endpoint in your Vonage/Meta App Webhook Settings.</span>
 </p>
 </div>

 </CardContent>
 <CardFooter className="flex gap-space-2 justify-end border-t border-border-muted pt-space-4 pb-space-5 px-space-6 bg-card/5">
 <Button
 type="button"
 variant="outline"
 size="sm"
 onClick={() => setActiveSettingsChannel(null)}
 className="border-border-muted text-muted-foreground hover:text-foreground"
 >
 Close
 </Button>
 <Button type="submit"size="sm"disabled={savingSettings} className="bg-primary text-white hover:brightness-105 border-none">
 {savingSettings ?"Saving...":"Save Settings"}
 </Button>
 </CardFooter>
 </Card>
 </form>
 )}

 {!activeSetupChannel && !activeSettingsChannel && (
 <div className="border border-dashed border-border-muted radius-2xl p-space-8 text-center text-caption text-muted-foreground/80 flex flex-col items-center justify-center gap-space-4 min-h-full bg-card/25 backdrop-blur-xs relative overflow-hidden">
 <div className="absolute inset-0 bg-radial-gradient(circle at center, hsl(var(--primary)/0.03) 0%, transparent 70%) pointer-events-none"/>
 <div className="h-12 w-12 radius-full bg-primary/10 flex items-center justify-center text-primary border border-primary/20 mb-space-2 animate-pulse">
 <Settings className="h-5 w-5"/>
 </div>
 <div className="max-w-xs space-y-space-1.5">
 <span className="font-semibold text-foreground block">Sidebar Dashboard</span>
 <p className="text-caption text-muted-foreground/85 leading-normal block">
 Select a channel's settings button or click connect to configure provider pipelines and Autopilot options.
 </p>
 </div>
 </div>
 )}
 </div>

 </div>
 )}
 </div>
 );
}
