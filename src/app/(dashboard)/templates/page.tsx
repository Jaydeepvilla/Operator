"use client";;
import { useState, useEffect } from "react";
import {
 getTemplatesAction,
 saveTemplateAction,
 deleteTemplateAction
} from "@/server/actions/omnichannel";
import {
 FileText,
 Plus,
 Check,
 Loader2,
 AlertCircle,
 Trash2,
 Edit2,
 Sparkles,
 Info
} from "lucide-react";
import { Button } from "@/components/shared/button";
import { PageTitle } from "@/components/shared/page-title";
import { Input } from "@/components/shared/input";
import { Label } from "@/components/shared/label";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/shared/card";
import { cn } from "@/components/shared/utils";

import { getButtonClasses } from '@/design-system/button-tokens';

const DEFAULT_VARIABLES = ["customer_name", "appointment_time", "service_name", "staff_name", "business_name", "cancel_link"];

export default function TemplatesPage() {
 const [loading, setLoading] = useState(true);
 const [templates, setTemplates] = useState<any[]>([]);
 const [editingTemplate, setEditingTemplate] = useState<any | null>(null);
 const [errorMsg, setErrorMsg] = useState("");

 // Template Form Inputs
 const [name, setName] = useState("");
 const [category, setCategory] = useState("welcome");
 const [channelType, setChannelType] = useState("all");
 const [body, setBody] = useState("");
 const [subject, setSubject] = useState("");
 const [variables, setVariables] = useState<string[]>([]);
 const [saving, setSaving] = useState(false);

 const loadTemplates = async () => {
 setLoading(true);
 const res = await getTemplatesAction();
 if (res.success && res.templates) {
 setTemplates(res.templates);
 } else {
 setErrorMsg(res.error || "Failed to load message templates.");
 }
 setLoading(false);
 };

 useEffect(() => {
 loadTemplates();
 }, []);

 const openCreate = () => {
 setEditingTemplate({ isNew: true });
 setName("");
 setCategory("welcome");
 setChannelType("all");
 setBody("");
 setSubject("");
 setVariables([...DEFAULT_VARIABLES]);
 };

 const openEdit = (tpl: any) => {
 setEditingTemplate(tpl);
 setName(tpl.name || "");
 setCategory(tpl.category || "welcome");
 setChannelType(tpl.channelType || "all");
 setBody(tpl.body || "");
 setSubject(tpl.subject || "");
 setVariables(tpl.variables || [...DEFAULT_VARIABLES]);
 };

 const handleSave = async (e: React.FormEvent) => {
 e.preventDefault();
 setSaving(true);
 setErrorMsg("");

 const res = await saveTemplateAction({
 id: editingTemplate?.isNew ? undefined : editingTemplate?.id,
 name,
 category,
 channelType,
 body,
 subject: channelType === "email" || channelType === "all" ? subject : undefined,
 variables
 });

 if (res.success) {
 setEditingTemplate(null);
 loadTemplates();
 } else {
 setErrorMsg(res.error || "Failed to save template.");
 }
 setSaving(false);
 };

 const handleDelete = async (id: string) => {
 const confirm = window.confirm("Are you sure you want to delete this template?");
 if (!confirm) return;

 const res = await deleteTemplateAction(id);
 if (res.success) {
 loadTemplates();
 if (editingTemplate?.id === id) {
 setEditingTemplate(null);
 }
 } else {
 setErrorMsg(res.error || "Failed to remove template.");
 }
 };

 const insertVariable = (variable: string) => {
 setBody(prev => prev + `{{${variable}}}`);
 };

 return (
 <div className="space-y-space-6">
 {/* Header */}
 <PageTitle
 title="Templates"
 description="Ready-made messages for confirmations, reminders, and follow-ups."
 actions={
 <Button size="sm" onClick={openCreate} className="h-9">
 <Plus className="h-4 w-4 mr-space-2"/> Create Template
 </Button>
 }
 />
 {errorMsg && (
 <div className="flex items-center gap-space-2 radius-lg bg-error-500/10 border-error-500/20 p-space-3 text-caption text-error-500">
 <AlertCircle className="h-4 w-4"/>
 <span>{errorMsg}</span>
 <button className={getButtonClasses(
 'primary',
 'filled',
 'small',
 'ml-auto flex items-center justify-center h-6 w-6 transition-colors'
 )} onClick={() => setErrorMsg("")}>
 <span className="sr-only">Dismiss</span>
 &times;
 </button>
 </div>
 )}
 {loading ? (
 <div className="h-96 flex flex-col items-center justify-center text-caption text-muted-foreground gap-space-2">
 <Loader2 className="h-5 w-5 animate-spin text-primary"/>
 Loading templates directory...
 </div>
 ) : (
 <div className="grid grid-cols-1 lg:grid-cols-12 gap-space-8 items-start">

 {/* Templates Grid List */}
 <div className="lg:col-span-7 grid grid-cols-1 md:grid-cols-2 gap-space-6">
 {templates.length === 0 ? (
 <div className="col-span-full border-border/40 radius-xl p-space-12 text-center text-caption text-muted-foreground italic">
 No templates created yet. Connect your email or SMS channel to launch automated templates.
 </div>
 ) : (
 templates.map((tpl) => (
 <Card key={tpl.id} className="border-border/60 bg-card/30 backdrop-blur-xs flex flex-col justify-between">
 <CardHeader className="pb-space-2">
 <div className="flex items-center justify-between">
 <span className="text-caption uppercase text-primary bg-primary/10 px-space-2 py-space-1 rounded border-primary/25">{tpl.category}</span>
 <span className="text-caption uppercase text-muted-foreground bg-background/5 px-space-2 py-space-1 rounded">{tpl.channelType}</span>
 </div>
 <CardTitle className="text-body-sm text-foreground mt-space-3 truncate">{tpl.name}</CardTitle>
 </CardHeader>
 <CardContent className="pb-space-3 text-caption text-muted-foreground/80 line-clamp-3 leading-relaxed">
 {tpl.body}
 </CardContent>
 <CardFooter className="pt-space-3 border-t border-border/10 flex gap-space-2 justify-end">
 <Button size="sm" variant="outline" className="h-8 text-caption border-border/40" onClick={() => openEdit(tpl)}>
 <Edit2 className="h-3.5 w-3.5 mr-space-1"/> Edit
 </Button>
 <Button size="sm" variant="ghost" className="h-8 text-caption text-error-500 hover:text-error-500 hover:bg-error-500/10 p-space-2" onClick={() => handleDelete(tpl.id)}>
 <Trash2 className="h-3.5 w-3.5"/>
 </Button>
 </CardFooter>
 </Card>
 ))
 )}
 </div>

 {/* Setup Form (Right pane) */}
 <div className="lg:col-span-5 sticky top-space-6">
 {editingTemplate ? (
 <form onSubmit={handleSave}>
 <Card className="border-border/60 bg-card/30 backdrop-blur-xs">
 <CardHeader>
 <CardTitle>{editingTemplate.isNew ? "Create Message Template" : "Edit Template"}</CardTitle>
 <CardDescription>Compose body content, subjects, and insert replacement parameters.</CardDescription>
 </CardHeader>
 <CardContent className="space-y-space-4 text-caption">

 <div className="space-y-space-1">
 <Label htmlFor="tplName">Template Name</Label>
 <Input
 id="tplName"
 value={name}
 onChange={(e) => setName(e.target.value)}
 placeholder="e.g. Booking Confirmation SMS"
 className="h-9 bg-transparent text-caption"
 required
 />
 </div>

 <div className="grid grid-cols-2 gap-space-3">
 <div className="space-y-space-1">
 <Label htmlFor="tplCategory">Category Trigger</Label>
 <select
 id="tplCategory"
 value={category}
 onChange={(e) => setCategory(e.target.value)}
 className="flex h-9 w-full radius-md border-input bg-transparent px-space-3 py-space-1 text-caption text-foreground bg-popover"
 >
 <option value="welcome">Welcome Message</option>
 <option value="appointment_confirmation">Appointment Confirmation</option>
 <option value="appointment_reminder">Appointment Reminder</option>
 <option value="follow_up">Drip Follow-up</option>
 <option value="lead_nurture">Lead Nurture</option>
 <option value="re_engagement">Re-engagement</option>
 <option value="review_request">Review Request</option>
 <option value="custom">Custom</option>
 </select>
 </div>

 <div className="space-y-space-1">
 <Label htmlFor="tplChannel">Channel Scope</Label>
 <select
 id="tplChannel"
 value={channelType}
 onChange={(e) => setChannelType(e.target.value)}
 className="flex h-9 w-full radius-md border-input bg-transparent px-space-3 py-space-1 text-caption text-foreground bg-popover"
 >
 <option value="all">All Channels</option>
 <option value="whatsapp">WhatsApp Business</option>
 <option value="sms">SMS / Vonage</option>
 <option value="email">Email Client</option>
 </select>
 </div>
 </div>

 {(channelType === "email" || channelType === "all") && (
 <div className="space-y-space-1 border-t border-border/10 pt-space-3">
 <Label htmlFor="tplSubject">Email Subject Line</Label>
 <Input
 id="tplSubject"
 value={subject}
 onChange={(e) => setSubject(e.target.value)}
 placeholder="Your appointment details inside..."
 className="h-9 bg-transparent text-caption"
 required={channelType === "email"}
 />
 </div>
 )}

 <div className="space-y-space-1 border-t border-border/10 pt-space-3">
 <Label htmlFor="tplBody">Message Body</Label>
 <textarea
 id="tplBody"
 rows={6}
 value={body}
 onChange={(e) => setBody(e.target.value)}
 placeholder="Type message contents..."
 className="flex min-h-24 w-full radius-md border-input bg-transparent px-space-3 py-space-2 text-caption placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring text-foreground"
 required
 />
 </div>

 {/* Dynamic Variable Chips */}
 <div className="space-y-space-2 border-t border-border/10 pt-space-3">
 <Label className="text-caption text-muted-foreground uppercase flex items-center gap-space-1">
 <Sparkles className="h-3.5 w-3.5 text-primary"/> Click to Insert Variables
 </Label>
 <div className="flex flex-wrap gap-space-2">
 {variables.map((v) => (
 <button
 key={v}
 type="button"
 onClick={() => insertVariable(v)}
 className={getButtonClasses(
 'primary',
 'filled',
 'small',
 'text-[11px] bg-[hsl(var(--foreground)/0.03)] border-[hsl(var(--foreground)/0.08)] text-muted-foreground hover: hover: transition-all select-none cursor-pointer'
 )}
 >
 {v}
 </button>
 ))}
 </div>
 </div>

 </CardContent>
 <CardFooter className="flex gap-space-2 justify-end border-t border-border/10 pt-space-4">
 <Button
 type="button"
 variant="outline"
 size="sm"
 onClick={() => setEditingTemplate(null)}
 className="border-border/40"
 >
 Cancel
 </Button>
 <Button type="submit" size="sm" disabled={saving}>
 {saving ? "Saving..." : "Save Template"}
 </Button>
 </CardFooter>
 </Card>
 </form>
 ) : (
 <div className="border-border/45 radius-xl p-space-8 text-center text-caption text-muted-foreground italic flex flex-col items-center justify-center gap-space-3">
 <FileText className="h-8 w-8 text-muted-foreground/35"/>
                <span>Create a new template or select an existing one to edit properties here.</span>
              </div>
            )}
          </div>

        </div>
      )}
    </div>
  );
}
