"use client";

import { useState, useTransition } from"react";
import Image from"next/image";
import {
 Palette, 
 Sparkles, 
 RefreshCw, 
 Check, 
 AlertCircle, 
 Globe, 
 Mail, 
 Layout, 
 Type,
 Eye
} from"lucide-react";
import { Button } from"@/components/shared/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from"@/components/shared/card";
import { Input } from"@/components/shared/input";
import { Label } from"@/components/shared/label";
import { saveAgencyBrandingAction } from"@/server/actions/agency";
import { NativeSelect } from "@/components/shared/native";

interface Branding {
 platformName: string;
 logoUrl: string | null;
 faviconUrl: string | null;
 primaryColor: string;
 secondaryColor: string;
 typography: string;
 emailSenderName: string | null;
 emailSenderDomain: string | null;
 customCss: string | null;
}

export function AgencyBrandingClient({ initialBranding }: { initialBranding: any }) {
 const [branding, setBranding] = useState<Branding>({
 platformName: initialBranding?.platformName ||"Apex AI Agent",
 logoUrl: initialBranding?.logoUrl ||"",
 faviconUrl: initialBranding?.faviconUrl ||"",
 primaryColor: initialBranding?.primaryColor ||"#3b82f6",
 secondaryColor: initialBranding?.secondaryColor ||"#1e293b",
 typography: initialBranding?.typography ||"Inter",
 emailSenderName: initialBranding?.emailSenderName ||"Support Desk",
 emailSenderDomain: initialBranding?.emailSenderDomain ||"agency.com",
 customCss: initialBranding?.customCss ||"",
 });

 const [isPending, startTransition] = useTransition();
 const [statusMessage, setStatusMessage] = useState<{ type:"success"|"error"; text: string } | null>(null);
 const [previewTab, setPreviewTab] = useState<"login"|"email">("login");

 const handleSaveBranding = () => {
 if (!branding.platformName.trim()) {
 setStatusMessage({ type:"error", text:"Platform Name is required."});
 return;
 }

 setStatusMessage(null);
 startTransition(async () => {
 const res = await saveAgencyBrandingAction(branding);
 if (res.success) {
 setStatusMessage({ type:"success", text:"Agency white-label settings updated successfully!"});
 } else {
 setStatusMessage({ type:"error", text: res.error ||"Save failed."});
 }
 });
 };

 return (
 <div className="grid gap-space-8 lg:grid-cols-12">
 {/* Configuration Column */}
 <div className="lg:col-span-6 space-y-space-6">
 <Card className="bg-card/40 backdrop-blur-md border border-border/50">
 <CardHeader>
 <CardTitle className="text-title-lg flex items-center gap-space-2">
 <Palette className="h-5 w-5 text-primary"/>
 Brand Assets & Parameters
 </CardTitle>
 <CardDescription>
 Configure platform metadata identity and custom HSL/HEX style overrides.
 </CardDescription>
 </CardHeader>
 <CardContent className="space-y-space-4">
 <div className="space-y-space-2">
 <Label className="text-body-sm">White-Label Platform Name</Label>
 <Input
 placeholder="e.g. Apex Receptionist"
 value={branding.platformName}
 onChange={(e) => setBranding({ ...branding, platformName: e.target.value })}
 />
 </div>

 <div className="grid grid-cols-2 gap-space-4">
 <div className="space-y-space-2">
 <Label className="text-body-sm">Logo URL</Label>
 <Input
 placeholder="https://assets.com/logo.png"
 value={branding.logoUrl ||""}
 onChange={(e) => setBranding({ ...branding, logoUrl: e.target.value })}
 />
 </div>

 <div className="space-y-space-2">
 <Label className="text-body-sm">Favicon URL</Label>
 <Input
 placeholder="https://assets.com/favicon.ico"
 value={branding.faviconUrl ||""}
 onChange={(e) => setBranding({ ...branding, faviconUrl: e.target.value })}
 />
 </div>
 </div>

 <div className="grid grid-cols-2 gap-space-4">
 <div className="space-y-space-2">
 <Label className="text-body-sm">Primary Brand Color</Label>
 <div className="flex gap-space-2">
 <Input
 type="color"
 value={branding.primaryColor}
 onChange={(e) => setBranding({ ...branding, primaryColor: e.target.value })}
 className="h-9 w-9 radius-md border border-input bg-transparent cursor-pointer"
 />
 <Input
 value={branding.primaryColor}
 onChange={(e) => setBranding({ ...branding, primaryColor: e.target.value })}
 placeholder="#3b82f6"
 className="font-mono text-caption"
 />
 </div>
 </div>

 <div className="space-y-space-2">
 <Label className="text-body-sm">Secondary Accent Color</Label>
 <div className="flex gap-space-2">
 <Input
 type="color"
 value={branding.secondaryColor}
 onChange={(e) => setBranding({ ...branding, secondaryColor: e.target.value })}
 className="h-9 w-9 radius-md border border-input bg-transparent cursor-pointer"
 />
 <Input
 value={branding.secondaryColor}
 onChange={(e) => setBranding({ ...branding, secondaryColor: e.target.value })}
 placeholder="#1e293b"
 className="font-mono text-caption"
 />
 </div>
 </div>
 </div>

 <div className="space-y-space-2">
 <Label className="text-body-sm">System Typography Font</Label>
 <NativeSelect
 value={branding.typography}
 onChange={(e) => setBranding({ ...branding, typography: e.target.value })}
 className="w-full h-9 radius-md border border-input bg-transparent px-space-3 text-body-sm focus-visible:outline-hidden focus-visible:ring-1 focus-visible:ring-ring text-foreground"
 >
 <option value="Inter">Inter (Sans-serif - Recommended)</option>
 <option value="Outfit">Outfit (Geometric Modern)</option>
 <option value="Roboto">Roboto (Neo-Grotesque)</option>
 <option value="Playfair Display">Playfair Display (Premium Serif)</option>
 </NativeSelect>
 </div>

 <div className="border-t border-border/10 pt-space-4 space-y-space-4">
 <h3 className="text-caption uppercase tracking-wider text-muted-foreground">White-Label E-Mail Server</h3>
 
 <div className="grid grid-cols-2 gap-space-4">
 <div className="space-y-space-2">
 <Label className="text-body-sm">Sender Display Name</Label>
 <Input
 placeholder="Support / Info Desk"
 value={branding.emailSenderName ||""}
 onChange={(e) => setBranding({ ...branding, emailSenderName: e.target.value })}
 />
 </div>

 <div className="space-y-space-2">
 <Label className="text-body-sm">Sender Domain Name</Label>
 <Input
 placeholder="ApexReceptionist.com"
 value={branding.emailSenderDomain ||""}
 onChange={(e) => setBranding({ ...branding, emailSenderDomain: e.target.value })}
 />
 </div>
 </div>
 </div>

 {statusMessage && (
 <div className={`p-space-3 radius-lg flex items-start gap-space-2 text-caption ${
 statusMessage.type ==="success"
 ?"bg-success-500/10 text-success border border-success-500/20"
 :"bg-destructive/10 text-destructive border border-error-500/20"
 }`}>
 {statusMessage.type ==="error"? <AlertCircle className="h-4 w-4 shrink-0 mt-space-1"/> : <Check className="h-4 w-4 shrink-0 mt-space-1"/>}
 <span>{statusMessage.text}</span>
 </div>
 )}
 </CardContent>
 <CardFooter className="border-t border-border/10 pt-space-4 flex justify-end">
 <Button onClick={handleSaveBranding} disabled={isPending} className="text-primary-foreground px-space-4 py-space-2">
 {isPending ? (
 <>
 <RefreshCw className="h-4 w-4 animate-spin mr-space-2"/>
 Saving presets...
 </>
 ) : (
 <>
 <Sparkles className="h-4 w-4 mr-space-2"/>
 Apply Branding Settings
 </>
 )}
 </Button>
 </CardFooter>
 </Card>
 </div>

 {/* Visual Live Preview Column */}
 <div className="lg:col-span-6 space-y-space-6">
 <Card className="bg-card/40 backdrop-blur-md border border-border/50 flex flex-col justify-between h-full">
 <CardHeader className="pb-space-3 border-b border-border/20 flex flex-row items-center justify-between">
 <div>
 <CardTitle className="text-body-md flex items-center gap-space-2">
 <Eye className="h-5 w-5 text-primary"/>
 Live Whitelabel Preview
 </CardTitle>
 <CardDescription className="text-caption">
 Real-time rendered mockup showing custom assets inside system screens.
 </CardDescription>
 </div>

 {/* Toggle Preview Mode */}
 <div className="flex gap-space-1 bg-muted/20 p-space-1 radius-lg border border-border/20">
 <Button size="sm" variant={previewTab ==="login"?"secondary":"ghost"} onClick={() => setPreviewTab("login")}
 className="text-caption h-7 cursor-pointer"
 >
 Login Form
 </Button>
 <Button size="sm" variant={previewTab ==="email"?"secondary":"ghost"} onClick={() => setPreviewTab("email")}
 className="text-caption h-7 cursor-pointer"
 >
 E-Mail Template
 </Button>
 </div>
 </CardHeader>

 <CardContent className="flex-1 flex items-center justify-center p-space-8 bg-background/25">
 {previewTab ==="login"? (
 /* Whitelabeled login card mockup */
 <div 
 className="w-full max-w-sm p-space-6 radius-lg bg-card border border-border/60 space-y-space-6 text-center animate-fade-in"
 style={{ fontFamily: branding.typography }}
 >
 <div className="flex flex-col items-center justify-center gap-space-2">
 <div 
 className="h-10 w-10 radius-lg flex items-center justify-center text-foreground"
 style={{ backgroundColor: branding.primaryColor }}
 >
 {branding.logoUrl ? (
 <Image src={branding.logoUrl} alt="Logo"width={24} height={24} className="h-6 w-6 object-contain"/>
 ) : (
 <Layout className="h-5 w-5"/>
 )}
 </div>
 <h3 className="text-title-lg text-foreground">{branding.platformName}</h3>
 <p className="text-caption text-muted-foreground">Sign in to manage your AI workspace</p>
 </div>

 <div className="space-y-space-3 text-left">
 <div className="space-y-space-1">
 <Label className="text-caption uppercase text-muted-foreground">Email Address</Label>
 <Input disabled placeholder="e.g. name@company.com"className="h-8 text-caption bg-background/40"/>
 </div>
 <div className="space-y-space-1">
 <Label className="text-caption uppercase text-muted-foreground">Password</Label>
 <Input disabled type="password"placeholder="••••••••"className="h-8 text-caption bg-background/40"/>
 </div>
 </div>

 <Button disabled width="full" className="text-foreground text-caption" style={{ backgroundColor: branding.primaryColor }}>
 Login Account
 </Button>
 </div>
 ) : (
 /* Whitelabeled email mockup */
 <div 
 className="w-full max-w-md bg-background text-neutral-800 radius-lg overflow-hidden animate-fade-in text-left border border-border"
 style={{ fontFamily: branding.typography }}
 >
 {/* Header banner */}
 <div 
 className="p-space-6 text-foreground flex items-center justify-between"
 style={{ backgroundColor: branding.primaryColor }}
 >
 <span className="text-body-sm tracking-tight">{branding.platformName}</span>
 <Mail className="h-4.5 w-4.5"/>
 </div>
 
 {/* Message body */}
 <div className="p-space-6 space-y-space-4 text-caption">
 <h4 className="text-body-sm text-foreground">Workspace Activation Invite</h4>
 <p className="leading-relaxed text-neutral-600">
 Hello, you have been invited to join the active workspace for your team on <strong className="text-foreground">{branding.platformName}</strong>. 
 Set up your login details by clicking the button below.
 </p>
 
 <div className="py-space-2 text-center">
 <Button disabled className="px-space-4 py-space-2 text-foreground text-caption" style={{ backgroundColor: branding.primaryColor }}>
 Configure Client Portal
 </Button>
 </div>

 <p className="text-caption text-muted-foreground leading-normal border-t border-border pt-space-3">
 Sender: {branding.emailSenderName ||"Support"} &lt;no-reply@{branding.emailSenderDomain ||"agency.com"}&gt;
 </p>
 </div>
 </div>
 )}
 </CardContent>

 <CardFooter className="bg-muted/10 border-t border-border/20 p-space-4 text-caption text-muted-foreground flex items-center justify-between">
 <span>Fonts loaded: {branding.typography}</span>
 <span>Color scheme: HSL mapping active</span>
 </CardFooter>
 </Card>
 </div>
 </div>
 );
}
