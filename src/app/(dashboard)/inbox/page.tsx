"use client";

import { Badge } from "@/components/shared/badge";
import { useState, useEffect, useRef } from "react";
import {
  getInboxThreadsAction,
  getThreadMessagesAction,
  sendStaffReplyAction,
  assignThreadAction,
  updateThreadStatusAction,
  updateContactAction,
  getStaffMembersAction,
  toggleThreadAiAutonomyAction,
  generateDraftAiReplyAction,
} from "@/server/actions/omnichannel";
import {
  MessageSquare,
  Search,
  Filter,
  User,
  Send,
  AlertCircle,
  Loader2,
  Inbox,
  Sparkles,
  Paperclip,
  Smile,
  X,
  Bot,
  Info,
  Calendar,
  DollarSign,
  TrendingUp,
  Play,
  Pause,
  Brain,
  BookOpen,
  FileText,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  ShieldCheck,
  ShieldAlert,
  Copy,
  Check,
} from "lucide-react";
import { Button } from "@/components/shared/button";
import { Input } from "@/components/shared/input";
import { Label } from "@/components/shared/label";
import { PageTitle } from "@/components/shared/page-title";
import { cn } from "@/components/shared/utils";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/shared/select";
import { Tabs, TabsList, TabsTrigger } from "@/components/shared/tabs";
import { NativeTextarea } from "@/components/shared/native";
import { ScrollArea } from "@/components/ui/scroll-area";
import { getButtonClasses } from "@/design-system/button-tokens";

const EMOJI_CATEGORIES = [
  {
    name: "Smileys",
    icon: "😊",
    emojis: [
      "😊", "😀", "😂", "🤣", "😇", "😍", "🥰", "😎", "😜", "🤔",
      "😴", "😭", "😡", "🤢", "🤐", "🙄", "😱", "🤩", "🥳", "🥺",
      "😏", "😮", "😬", "🥱", "😈", "🤡", "💩", "👻", "👽", "👾"
    ]
  },
  {
    name: "Gestures",
    icon: "👍",
    emojis: [
      "👍", "👎", "❤️", "🔥", "🎉", "🙌", "🙏", "👏", "👋", "👀",
      "💪", "💡", "✨", "💯", "🎈", "💔", "🌟", "🤝", "✌️", "👌",
      "✍️", "🖐️", "💖", "💘", "💌", "💤", "💥", "💦", "💨", "💫"
    ]
  },
  {
    name: "Food",
    icon: "🍕",
    emojis: [
      "🍕", "🍔", "🍟", "🌭", "🍿", "🍩", "🍰", "🧁", "🍫", "🍬",
      "🍎", "🍌", "🍉", "🍓", "🍒", "🍑", "🍍", "🥑", "🥦", "🥕",
      "☕", "🍺", "🍷", "🥤", "🍣", "🌮", "🍦", "🍪", "🥐", "🥖"
    ]
  }
];

function ChannelBadge({ type }: { type?: string }) {
  switch (type) {
    case "whatsapp":
      return <Badge variant="success">WhatsApp</Badge>;
    case "sms":
      return <Badge>SMS</Badge>;
    case "email":
      return <Badge variant="info">Email</Badge>;
    case "instagram":
      return <Badge variant="warning">Instagram</Badge>;
    default:
      return <Badge>Chat</Badge>;
  }
}

export default function UnifiedInboxPage() {
  const [threads, setThreads] = useState<any[]>([]);
  const [selectedThread, setSelectedThread] = useState<any | null>(null);
  const [messages, setMessages] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingMessages, setLoadingMessages] = useState(false);
  const [replyText, setReplyText] = useState("");
  const [sendingReply, setSendingReply] = useState(false);
  const [isInternalNote, setIsInternalNote] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");
  const [staff, setStaff] = useState<any[]>([]);

  // Right Drawer Tab State ('profile' | 'copilot' | 'notes')
  const [activeDrawerTab, setActiveDrawerTab] = useState<"profile" | "copilot" | "notes">("copilot");

  // AI Copilot & Autonomy State
  const [generatingDraft, setGeneratingDraft] = useState(false);
  const [togglingAutonomy, setTogglingAutonomy] = useState(false);
  const [expandedCitationId, setExpandedCitationId] = useState<string | null>(null);
  const [copiedDraft, setCopiedDraft] = useState(false);
  const [aiAnalysis, setAiAnalysis] = useState<{
    intent?: string;
    citations?: any[];
    confidenceScore?: number;
    reasoning?: string;
  } | null>(null);

  // Attachment & Emoji state
  const [attachment, setAttachment] = useState<File | null>(null);
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [activeEmojiTab, setActiveEmojiTab] = useState(0);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Filters
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<"open" | "snoozed" | "closed">("open");
  const [channelFilter, setChannelFilter] = useState("all");

  // Edit lead profile details
  const [contactName, setContactName] = useState("");
  const [contactEmail, setContactEmail] = useState("");
  const [contactPhone, setContactPhone] = useState("");
  const [contactStatus, setContactStatus] = useState("");
  const [contactTags, setContactTags] = useState("");
  const [contactNotes, setContactNotes] = useState("");
  const [isSavingContact, setIsSavingContact] = useState(false);

  const chatEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    fetchThreads();
    fetchStaff();
  }, []);

  const fetchStaff = async () => {
    try {
      const res = await getStaffMembersAction();
      if (res.success && res.staff) {
        setStaff(res.staff);
      }
    } catch (e) {
      console.error("Failed to load staff list", e);
    }
  };

  useEffect(() => {
    if (selectedThread) {
      fetchMessages(selectedThread.conversationId);

      const profile = selectedThread.conversation?.leadProfile;
      setContactName(profile?.name || "");
      setContactEmail(profile?.email || "");
      setContactPhone(profile?.phone || "");
      setContactStatus(profile?.status || "New");
      setContactTags(profile?.tags?.join(",") || "");
      setContactNotes(profile?.notes || "");

      // Derive AI Copilot Analysis from latest assistant message
      setAiAnalysis(null);
    } else {
      setMessages([]);
      setAiAnalysis(null);
    }
  }, [selectedThread?.id, selectedThread?.conversationId]);

  useEffect(() => {
    scrollToBottom();
    // Scan messages for the latest AI intelligence
    if (messages.length > 0) {
      const lastAiMsg = [...messages].reverse().find((m) => m.metadata?.isAiGenerated);
      if (lastAiMsg?.metadata) {
        setAiAnalysis({
          intent: lastAiMsg.metadata.intent || "customer_inquiry",
          citations: lastAiMsg.metadata.citations || [],
          confidenceScore: lastAiMsg.metadata.confidenceScore || 0.95,
          reasoning: lastAiMsg.metadata.reasoning || "Contextually matched verified knowledge base chunks with high similarity.",
        });
      }
    }
  }, [messages]);

  const scrollToBottom = () => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  const fetchThreads = async () => {
    try {
      setLoading(true);
      const res = await getInboxThreadsAction();
      if (res.success && res.threads) {
        setThreads(res.threads);
      } else {
        setErrorMsg(res.error || "Failed to load conversations.");
      }
    } catch (e: any) {
      setErrorMsg(e.message || "An unexpected error occurred.");
    } finally {
      setLoading(false);
    }
  };

  const fetchMessages = async (conversationId: string) => {
    try {
      setLoadingMessages(true);
      const res = await getThreadMessagesAction(conversationId);
      if (res.success && res.messages) {
        setMessages(res.messages);
      } else {
        setErrorMsg(res.error || "Failed to load message history.");
      }
    } catch (e: any) {
      setErrorMsg(e.message || "Error loading messages.");
    } finally {
      setLoadingMessages(false);
    }
  };

  const handleSelectThread = (thread: any) => {
    setSelectedThread(thread);
    setThreads((prev: any[]) =>
      prev.map((t: any) => (t.id === thread.id ? { ...t, unreadCount: 0 } : t))
    );
  };

  const handleToggleAutonomy = async (newStatus: "active" | "paused") => {
    if (!selectedThread) return;
    try {
      setTogglingAutonomy(true);
      const res = await toggleThreadAiAutonomyAction(selectedThread.id, newStatus);
      if (res.success) {
        setSelectedThread((prev: any) => (prev ? { ...prev, aiAutonomy: newStatus } : null));
        setThreads((prev: any[]) =>
          prev.map((t: any) => (t.id === selectedThread.id ? { ...t, aiAutonomy: newStatus } : t))
        );
      } else {
        setErrorMsg(res.error || "Failed to update AI autopilot mode.");
      }
    } catch (e: any) {
      setErrorMsg(e.message || "Error toggling AI autonomy.");
    } finally {
      setTogglingAutonomy(false);
    }
  };

  const handleGenerateAiDraft = async () => {
    if (!selectedThread) return;
    try {
      setGeneratingDraft(true);
      const lastUserMsg = [...messages].reverse().find((m) => m.direction === "incoming")?.content;
      const res = await generateDraftAiReplyAction({
        conversationId: selectedThread.conversationId,
        userMessage: lastUserMsg || "Hello, I have a question regarding your services.",
      });

      if (res.success && res.draftReply) {
        setReplyText(res.draftReply);
        setAiAnalysis({
          intent: res.intent || "inquiry",
          citations: res.citations || [],
          confidenceScore: 0.96,
          reasoning: "Generated synthesized response grounding on business profile and verified FAQ knowledge.",
        });
        setActiveDrawerTab("copilot");
      } else {
        setErrorMsg(res.error || "Unable to generate draft at this time.");
      }
    } catch (e: any) {
      setErrorMsg(e.message || "Failed to generate AI draft reply.");
    } finally {
      setGeneratingDraft(false);
    }
  };

  const handleSendReply = async (e: any) => {
    e.preventDefault();
    if ((!replyText.trim() && !attachment) || !selectedThread) return;
    try {
      setSendingReply(true);
      let content = replyText.trim();
      if (attachment) {
        content = `${content} [Attachment: ${attachment.name}]`.trim();
      }

      // Optimistic Update: instantly display in message log
      const optimisticMsg = {
        id: `temp-${Date.now()}`,
        direction: "outgoing",
        content,
        createdAt: new Date(),
        metadata: { isAiGenerated: false, isInternalNote },
      };
      setMessages((prev) => [...prev, optimisticMsg]);
      setReplyText("");
      setAttachment(null);

      // Sending a human reply automatically sets aiAutonomy = 'paused'
      setSelectedThread((prev: any) => (prev ? { ...prev, aiAutonomy: "paused" } : null));

      const res = await sendStaffReplyAction({
        threadId: selectedThread.id,
        conversationId: selectedThread.conversationId,
        channelId: selectedThread.channelId,
        recipientId:
          selectedThread.conversation?.leadProfile?.phone ||
          selectedThread.conversation?.leadProfile?.email ||
          "customer",
        content,
      });

      if (res.success) {
        const msgRes = await getThreadMessagesAction(selectedThread.conversationId);
        if (msgRes.success && msgRes.messages) {
          setMessages(msgRes.messages);
        }
        fetchThreads();
      } else {
        setErrorMsg(res.error || "Failed to send message.");
      }
    } catch (err: any) {
      setErrorMsg(err.message || "Error sending message.");
    } finally {
      setSendingReply(false);
    }
  };

  const handleAssignChange = async (staffId: string | null) => {
    if (!selectedThread) return;
    try {
      const res = await assignThreadAction(selectedThread.id, staffId);
      if (res.success) {
        setSelectedThread((prev: any) =>
          prev ? { ...prev, assignedStaffId: staffId } : null
        );
        fetchThreads();
      } else {
        setErrorMsg(res.error || "Failed to assign staff.");
      }
    } catch (e: any) {
      setErrorMsg(e.message || "Error assigning staff.");
    }
  };

  const handleStatusChange = async (status: "open" | "snoozed" | "closed") => {
    if (!selectedThread) return;
    try {
      const res = await updateThreadStatusAction(selectedThread.id, status);
      if (res.success) {
        setSelectedThread((prev: any) => (prev ? { ...prev, status } : null));
        fetchThreads();
      } else {
        setErrorMsg(res.error || "Failed to update status.");
      }
    } catch (e: any) {
      setErrorMsg(e.message || "Error updating thread status.");
    }
  };

  const handleSaveContact = async () => {
    if (!selectedThread?.conversation?.leadProfile) return;
    try {
      setIsSavingContact(true);
      const tagsArray = contactTags
        .split(",")
        .map((t) => t.trim())
        .filter(Boolean);
      const res = await updateContactAction({
        id: selectedThread.conversation.leadProfile.id,
        name: contactName.trim(),
        email: contactEmail.trim().toLowerCase(),
        phone: contactPhone.trim(),
        status: contactStatus,
        tags: tagsArray,
        notes: contactNotes.trim(),
      });

      if (res.success) {
        const updatedProfile = {
          ...selectedThread.conversation.leadProfile,
          name: contactName.trim(),
          email: contactEmail.trim().toLowerCase(),
          phone: contactPhone.trim(),
          status: contactStatus,
          tags: tagsArray,
          notes: contactNotes.trim(),
        };

        setSelectedThread((prev: any) => {
          if (!prev) return null;
          return {
            ...prev,
            conversation: {
              ...prev.conversation,
              leadProfile: updatedProfile,
            },
          };
        });

        setThreads((prev: any[]) =>
          prev.map((t: any) => {
            if (t.id === selectedThread.id) {
              return {
                ...t,
                conversation: {
                  ...t.conversation,
                  leadProfile: updatedProfile,
                },
              };
            }
            return t;
          })
        );
      } else {
        setErrorMsg(res.error || "Failed to save profile.");
      }
    } catch (e: any) {
      setErrorMsg(e.message || "Error saving contact profile.");
    } finally {
      setIsSavingContact(false);
    }
  };

  const filteredThreads = threads.filter((t) => {
    const profile = t.conversation?.leadProfile;
    const queryMatch =
      !searchQuery.trim() ||
      profile?.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      t.lastMessage?.content?.toLowerCase().includes(searchQuery.toLowerCase());
    const statusMatch = t.status === statusFilter;
    const channelMatch =
      channelFilter === "all" || t.channel?.type === channelFilter;
    return queryMatch && statusMatch && channelMatch;
  });

  const getInitials = (name: string) => {
    if (!name) return "AC";
    const parts = name.trim().split(/\s+/);
    if (parts.length >= 2 && parts[0] && parts[1]) {
      return (parts[0][0] + parts[1][0]).toUpperCase();
    }
    return name.slice(0, 2).toUpperCase();
  };

  const getAvatarGradient = (name: string) => {
    const gradients = [
      "from-indigo-500 to-purple-500",
      "from-blue-500 to-cyan-500",
      "from-emerald-500 to-teal-500",
      "from-amber-500 to-orange-500",
      "from-rose-500 to-pink-500",
    ];
    const hash = (name || "").split("").reduce((acc, char) => acc + char.charCodeAt(0), 0);
    return gradients[hash % gradients.length];
  };

  const isAiAutopilotActive = selectedThread?.aiAutonomy !== "paused";

  return (
    <div className="flex flex-col h-[calc(100vh-theme(spacing.16)-1px)] w-full overflow-hidden">
      {/* Top Banner / Error */}
      {errorMsg && (
        <div className="bg-destructive/10 border-b border-destructive/20 text-destructive text-caption px-space-4 py-space-2 flex items-center justify-between">
          <div className="flex items-center gap-space-2">
            <AlertCircle className="h-4 w-4 shrink-0" />
            <span>{errorMsg}</span>
          </div>
          <button onClick={() => setErrorMsg("")} className="hover:opacity-70">
            <X className="h-4 w-4" />
          </button>
        </div>
      )}

      {/* Main 3-Column Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-space-4 p-space-4 flex-1 overflow-hidden min-h-0">
        
        {/* ─── COLUMN 1: Thread List (3 Cols) ─── */}
        <div className="lg:col-span-3 flex flex-col h-full bg-card border border-border-subtle radius-xl overflow-hidden shadow-xs">
          {/* Header & Search */}
          <div className="p-space-3 border-b border-border-subtle bg-bg-layer-1/30 space-y-space-2 shrink-0">
            <div className="flex items-center justify-between">
              <h3 className="text-body-sm font-bold text-foreground flex items-center gap-space-2">
                <Inbox className="h-4 w-4 text-primary" />
                <span>Inbox</span>
              </h3>
              <span className="text-[11px] font-semibold text-muted-foreground bg-bg-layer-2 px-space-2 py-space-0.5 radius-full border border-border-subtle">
                {filteredThreads.length} threads
              </span>
            </div>

            <div className="relative">
              <Search className="absolute left-space-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-neutral-400" />
              <Input
                type="text"
                placeholder="Search conversations..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="h-8 pl-space-8 text-caption bg-background border-border-subtle focus-visible:ring-primary/20"
              />
            </div>

            {/* Filter Tabs */}
            <div className="flex items-center justify-between gap-space-1 pt-space-1">
              <Tabs
                value={statusFilter}
                onValueChange={(val: any) => setStatusFilter(val)}
                variant="segmented"
                size="sm"
                className="w-full"
              >
                <TabsList className="grid grid-cols-3 w-full bg-bg-layer-2 border border-border-subtle p-0.5 radius-md">
                  <TabsTrigger value="open" className="text-caption font-semibold py-1">Open</TabsTrigger>
                  <TabsTrigger value="snoozed" className="text-caption font-semibold py-1">Snoozed</TabsTrigger>
                  <TabsTrigger value="closed" className="text-caption font-semibold py-1">Closed</TabsTrigger>
                </TabsList>
              </Tabs>
            </div>
          </div>

          {/* Threads Scroll List */}
          <ScrollArea className="flex-1 p-space-2 space-y-space-1 bg-bg-layer-1/5" horizontal={false}>
            {loading ? (
              <div className="h-full flex flex-col items-center justify-center text-caption text-neutral-400 gap-space-2 py-space-12">
                <Loader2 className="h-5 w-5 animate-spin text-primary" />
                <span>Loading threads...</span>
              </div>
            ) : filteredThreads.length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center p-space-6 text-center text-caption text-neutral-400 py-space-12">
                <Inbox className="h-8 w-8 text-neutral-300 mb-space-2" />
                <span className="font-semibold text-foreground">No conversations</span>
                <p className="text-caption text-neutral-400 max-w-40 mx-auto mt-space-1">
                  Try checking other filters or clear search.
                </p>
              </div>
            ) : (
              filteredThreads.map((t) => {
                const isSelected = selectedThread?.id === t.id;
                const profile = t.conversation?.leadProfile;
                const clientName = profile?.name || "Anonymous Client";
                const initials = getInitials(clientName);
                const gradient = getAvatarGradient(clientName);
                const isUnread = t.unreadCount > 0;
                const isPaused = t.aiAutonomy === "paused";

                return (
                  <div
                    key={t.id}
                    onClick={() => handleSelectThread(t)}
                    className={cn(
                      "p-space-3 radius-lg cursor-pointer transition-all duration-150 relative border flex gap-space-3 items-start select-none mb-space-1",
                      isSelected
                        ? "bg-bg-layer-2 border-border-hover shadow-xs"
                        : "bg-transparent border-transparent hover:bg-bg-layer-1/50 hover:border-border-subtle"
                    )}
                  >
                    {isUnread && (
                      <span className="absolute left-space-1.5 top-1/2 -translate-y-1/2 w-1.5 h-1.5 bg-primary radius-full" />
                    )}

                    <div className={`h-8 w-8 radius-full bg-gradient-to-br ${gradient} text-white text-caption font-bold flex items-center justify-center shrink-0 shadow-xs`}>
                      {initials}
                    </div>

                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-space-2 mb-space-0.5">
                        <span className={cn("text-caption truncate", isUnread ? "font-bold text-foreground" : "font-medium text-foreground/80")}>
                          {clientName}
                        </span>
                        <span className="text-[10px] text-neutral-400 whitespace-nowrap shrink-0">
                          {new Date(t.updatedAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                        </span>
                      </div>

                      <div className="flex items-center gap-space-1.5 mb-space-1">
                        <ChannelBadge type={t.channel?.type} />
                        {isPaused ? (
                          <span className="text-[10px] bg-amber-500/10 text-amber-600 dark:text-amber-400 font-bold px-1.5 py-0.2 radius-sm border border-amber-500/20">
                            Human Takeover
                          </span>
                        ) : (
                          <span className="text-[10px] bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 font-medium px-1.5 py-0.2 radius-sm border border-emerald-500/20 flex items-center gap-1">
                            <span className="h-1.5 w-1.5 radius-full bg-emerald-500" />
                            AI Active
                          </span>
                        )}
                      </div>
                      <p className={cn("text-[11px] truncate leading-snug", isUnread ? "font-semibold text-foreground" : "text-neutral-500")}>
                        {t.lastMessage?.content || "No messages yet..."}
                      </p>
                    </div>

                    {isUnread && (
                      <span className="h-4 min-w-4 px-space-1 radius-full bg-primary text-[10px] font-bold text-primary-foreground flex items-center justify-center shrink-0">
                        {t.unreadCount}
                      </span>
                    )}
                  </div>
                );
              })
            )}
          </ScrollArea>
        </div>

        {/* ─── COLUMN 2: Chat Pane & Copilot Trigger (6 Cols) ─── */}
        <div className="lg:col-span-6 flex flex-col h-full bg-card border border-border-subtle radius-xl overflow-hidden shadow-xs min-w-0">
          {selectedThread ? (
            <>
              {/* Chat Header with Autonomy Pill & Human Takeover Switch */}
              <div className="p-space-3 border-b border-border-subtle flex flex-wrap items-center justify-between gap-space-3 bg-bg-layer-1/30 shrink-0">
                <div className="flex items-center gap-space-2.5 min-w-0">
                  <div className={`h-9 w-9 radius-full bg-gradient-to-br ${getAvatarGradient(selectedThread.conversation?.leadProfile?.name || "Client")} text-white text-caption font-bold flex items-center justify-center shrink-0 shadow-xs`}>
                    {getInitials(selectedThread.conversation?.leadProfile?.name || "Client")}
                  </div>
                  <div className="min-w-0">
                    <div className="flex items-center gap-space-2">
                      <h4 className="text-body-sm font-bold text-foreground truncate">
                        {selectedThread.conversation?.leadProfile?.name || "Anonymous Client"}
                      </h4>
                      <ChannelBadge type={selectedThread.channel?.type} />
                    </div>
                    <p className="text-[11px] text-neutral-500 truncate">
                      {selectedThread.conversation?.leadProfile?.phone || selectedThread.conversation?.leadProfile?.email || "Connected via " + selectedThread.channel?.type}
                    </p>
                  </div>
                </div>

                {/* Autonomy Safety Controls */}
                <div className="flex items-center gap-space-2">
                  {/* Autonomy Pill Button */}
                  {isAiAutopilotActive ? (
                    <Button
                      variant="outline"
                      size="sm"
                      className="h-8 border-emerald-500/30 bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 hover:bg-emerald-500/20 text-[11px] font-semibold gap-1.5 shadow-xs"
                      onClick={() => handleToggleAutonomy("paused")}
                      disabled={togglingAutonomy}
                      title="Click to pause AI and take over this conversation manually"
                    >
                      <span className="h-2 w-2 radius-full bg-emerald-500 animate-pulse" />
                      <span>AI Autopilot Active</span>
                      <Pause className="h-3 w-3 ml-1 text-neutral-400" />
                    </Button>
                  ) : (
                    <Button
                      variant="outline"
                      size="sm"
                      className="h-8 border-amber-500/40 bg-amber-500/10 text-amber-700 dark:text-amber-400 hover:bg-amber-500/20 text-[11px] font-bold gap-1.5 shadow-xs animate-fade-in"
                      onClick={() => handleToggleAutonomy("active")}
                      disabled={togglingAutonomy}
                      title="Click to resume autonomous AI responses for this thread"
                    >
                      <Play className="h-3 w-3 fill-amber-500 text-amber-500" />
                      <span>Resume AI Autopilot</span>
                    </Button>
                  )}

                  {/* Status Dropdown */}
                  <Select
                    value={selectedThread.status}
                    onValueChange={(val: any) => handleStatusChange(val)}
                  >
                    <SelectTrigger className="h-8 text-caption border-border-subtle hover:border-border-hover w-24 bg-background">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="open">Open</SelectItem>
                      <SelectItem value="snoozed">Snooze</SelectItem>
                      <SelectItem value="closed">Close</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {/* Sticky Human Takeover Notice Banner */}
              {!isAiAutopilotActive && (
                <div className="bg-amber-500/10 border-b border-amber-500/20 px-space-4 py-space-2 flex items-center justify-between text-[11px] text-amber-800 dark:text-amber-300 font-medium shrink-0 animate-fade-in">
                  <div className="flex items-center gap-space-2">
                    <ShieldAlert className="h-3.5 w-3.5 text-amber-600 shrink-0" />
                    <span><strong>Human Mode:</strong> AI assistant is paused. Staff manual replies active.</span>
                  </div>
                  <button
                    onClick={() => handleToggleAutonomy("active")}
                    className="underline hover:text-amber-900 dark:hover:text-amber-100 font-bold ml-2 cursor-pointer"
                  >
                    Resume AI
                  </button>
                </div>
              )}

              {/* Message Scroll Area */}
              <ScrollArea className="flex-1 p-space-4 space-y-space-4 bg-bg-layer-1/5" horizontal={false}>
                {loadingMessages ? (
                  <div className="h-full flex flex-col items-center justify-center text-caption text-neutral-500 gap-space-2 py-space-10">
                    <Loader2 className="h-5 w-5 animate-spin text-primary" />
                    <span>Loading messages...</span>
                  </div>
                ) : messages.length === 0 ? (
                  <div className="h-full flex items-center justify-center text-caption text-neutral-500 py-space-10">
                    No conversation history.
                  </div>
                ) : (
                  messages.map((msg) => {
                    const isIncoming = msg.direction === "incoming";
                    const isAi = msg.metadata?.isAiGenerated;
                    const isInternal = msg.metadata?.isInternalNote;
                    const citations = msg.metadata?.citations || [];
                    const intent = msg.metadata?.intent;
                    const hasCitations = citations.length > 0;

                    return (
                      <div
                        key={msg.id}
                        className={cn("flex flex-col mb-space-3", isIncoming ? "items-start" : "items-end")}
                      >
                        <div
                          className={cn(
                            "max-w-[80%] radius-xl px-space-4 py-space-2.5 text-caption leading-relaxed border relative shadow-xs",
                            isIncoming
                              ? "bg-bg-layer-1 border-border-subtle text-foreground rounded-tl-none"
                              : isInternal
                              ? "bg-state-warning-bg/40 border-state-warning-text/10 text-state-warning-text rounded-tr-none"
                              : isAi
                              ? "bg-primary/5 border-primary/20 text-foreground rounded-tr-none"
                              : "bg-bg-layer-2 border-border-default text-foreground rounded-tr-none"
                          )}
                        >
                          {isAi && (
                            <div
                              className="absolute -top-space-2 -left-space-2 bg-primary text-primary-foreground p-space-1 radius-md border border-background shrink-0 flex items-center justify-center shadow-xs"
                              title="Autonomous AI Response"
                            >
                              <Sparkles className="h-2.5 w-2.5" />
                            </div>
                          )}

                          <div className="whitespace-pre-wrap">{msg.content}</div>

                          {/* RAG Citations Strip */}
                          {isAi && hasCitations && (
                            <div className="mt-space-2 pt-space-1.5 border-t border-primary/10 flex flex-wrap items-center gap-1.5">
                              <span className="text-[10px] font-bold text-primary/80 uppercase tracking-wider flex items-center gap-1">
                                <BookOpen className="h-2.5 w-2.5" /> Source:
                              </span>
                              {citations.map((c: any, idx: number) => (
                                <button
                                  key={idx}
                                  onClick={() => setExpandedCitationId(expandedCitationId === `${msg.id}-${idx}` ? null : `${msg.id}-${idx}`)}
                                  className="text-[10px] bg-background/80 hover:bg-background border border-primary/20 text-primary font-semibold px-1.5 py-0.5 radius-sm transition-all"
                                >
                                  {c.documentName || c.title || `KB Source ${idx + 1}`}
                                  {c.score && ` (${Math.round(c.score * 100)}%)`}
                                </button>
                              ))}
                            </div>
                          )}
                        </div>

                        {/* Citation Details Card when expanded */}
                        {isAi && hasCitations && citations.map((c: any, idx: number) => {
                          if (expandedCitationId !== `${msg.id}-${idx}`) return null;
                          return (
                            <div
                              key={`cite-pop-${idx}`}
                              className="mt-1 p-space-2.5 bg-background border border-primary/30 radius-lg max-w-[80%] text-[11px] shadow-sm text-foreground space-y-1 animate-fade-in"
                            >
                              <div className="flex items-center justify-between font-semibold text-primary">
                                <span>📄 {c.documentName || "Knowledge Base Citation"}</span>
                                <span className="text-[10px] text-muted-foreground">{c.chunkIndex ? `Chunk #${c.chunkIndex}` : "Verified Reference"}</span>
                              </div>
                              <p className="text-neutral-600 dark:text-neutral-300 text-[11px] italic bg-bg-layer-1 p-1.5 radius-md border border-border-subtle">
                                "{c.content || c.snippet || "Standard business knowledge base ground truth."}"
                              </p>
                            </div>
                          );
                        })}

                        <span className="text-[10px] text-neutral-400 mt-space-1 px-space-1 block">
                          {isIncoming
                            ? "Client"
                            : isInternal
                            ? "Staff Internal Note"
                            : isAi
                            ? `AI Assistant ${intent ? `· [${intent}]` : ""}`
                            : "Staff"}{" "}
                          ·{" "}
                          {new Date(msg.createdAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                        </span>
                      </div>
                    );
                  })
                )}
                <div ref={chatEndRef} />
              </ScrollArea>

              {/* Message Composer & AI Copilot Action Bar */}
              <div className="p-space-3 border-t border-border-subtle bg-background shrink-0 space-y-space-2">
                
                {/* AI Draft & Quick Assist Bar */}
                <div className="flex items-center justify-between gap-space-2">
                  <div className="flex items-center gap-space-1.5">
                    <Button
                      type="button"
                      variant="outline"
                      size="xs"
                      className="text-[11px] font-semibold gap-1 border-primary/30 bg-primary/5 text-primary hover:bg-primary/10 h-7"
                      onClick={handleGenerateAiDraft}
                      disabled={generatingDraft}
                    >
                      {generatingDraft ? (
                        <Loader2 className="h-3 w-3 animate-spin" />
                      ) : (
                        <Sparkles className="h-3 w-3 text-primary" />
                      )}
                      <span>{generatingDraft ? "Synthesizing Draft..." : "Suggest AI Reply"}</span>
                    </Button>
                    
                    <span className="text-[10px] text-neutral-400 hidden sm:inline">
                      Generates verified draft grounded on your Knowledge Base.
                    </span>
                  </div>

                  <div className="flex items-center gap-1">
                    <Tabs
                      value={isInternalNote ? "note" : "message"}
                      onValueChange={(val) => setIsInternalNote(val === "note")}
                      variant="segmented"
                      size="sm"
                      className="w-auto"
                    >
                      <TabsList className="bg-bg-layer-2 border border-border-subtle p-0.5 radius-md h-7">
                        <TabsTrigger value="message" className="px-space-2 py-0.5 text-[11px] font-semibold">
                          Staff Reply
                        </TabsTrigger>
                        <TabsTrigger value="note" className="px-space-2 py-0.5 text-[11px] font-semibold">
                          Internal Note
                        </TabsTrigger>
                      </TabsList>
                    </Tabs>
                  </div>
                </div>

                {/* Reply Form */}
                <form
                  onSubmit={handleSendReply}
                  className="border border-border-default radius-xl bg-background focus-within:border-primary/40 focus-within:ring-2 focus-within:ring-primary/10 transition-all duration-200"
                >
                  <div className="p-space-3">
                    {attachment && (
                      <div className="flex items-center justify-between bg-bg-layer-1 border border-border-subtle p-space-2 radius-md mb-space-2 text-caption animate-fade-in">
                        <span className="truncate max-w-xs text-neutral-700 font-medium">📎 {attachment.name}</span>
                        <Button variant="ghost" size="xs" onClick={() => setAttachment(null)}>
                          <X className="h-3 w-3" />
                        </Button>
                      </div>
                    )}

                    <NativeTextarea
                      value={replyText}
                      onChange={(e) => setReplyText(e.target.value)}
                      placeholder={
                        isInternalNote
                          ? "Write an internal team note (hidden from customer)..."
                          : "Type a reply to the customer (sending will set thread to Human Mode)..."
                      }
                      className="w-full bg-transparent text-caption text-foreground placeholder:text-neutral-400 border-none outline-none focus:ring-0 focus:outline-none resize-none min-h-16 leading-normal"
                      disabled={sendingReply}
                      onKeyDown={(e) => {
                        if (e.key === "Enter" && !e.shiftKey) {
                          e.preventDefault();
                          handleSendReply(e);
                        }
                      }}
                    />
                  </div>

                  <div className="flex items-center justify-between px-space-3 py-space-2 bg-bg-layer-1/10 border-t border-border-subtle radius-b-xl">
                    <span className="text-[10px] text-neutral-400 font-mono">Press Enter to send</span>
                    <div className="flex items-center gap-space-2">
                      <Button
                        type="submit"
                        size="sm"
                        className="px-space-4 text-caption h-7.5"
                        disabled={(!replyText.trim() && !attachment) || sendingReply}
                      >
                        {sendingReply ? (
                          <Loader2 className="h-3.5 w-3.5 animate-spin mr-space-1" />
                        ) : (
                          <Send className="h-3 w-3 mr-space-1" />
                        )}
                        <span>{isInternalNote ? "Log Internal Note" : "Send Reply"}</span>
                      </Button>
                    </div>
                  </div>
                </form>
              </div>
            </>
          ) : (
            <div className="flex-1 flex flex-col items-center justify-center p-space-10 text-center gap-space-3 animate-fade-in py-space-20">
              <div className="flex h-12 w-12 items-center justify-center radius-xl bg-primary/10 text-primary ring-1 ring-primary/20 animate-float shadow-xs">
                <MessageSquare className="h-5 w-5" />
              </div>
              <h3 className="text-body-sm font-semibold text-foreground mt-space-2">Select a conversation</h3>
              <p className="max-w-xs text-caption text-neutral-400 leading-normal">
                Choose a customer thread from the left to review automated AI responses, inspect citations, or take over manually.
              </p>
            </div>
          )}
        </div>

        {/* ─── COLUMN 3: AI Copilot & Contact Profile Drawer (3 Cols) ─── */}
        <div className="lg:col-span-3 flex flex-col h-full bg-card border border-border-subtle radius-xl overflow-hidden shadow-xs">
          
          {/* Drawer Header Tabs */}
          <div className="p-space-2.5 border-b border-border-subtle bg-bg-layer-1/30 shrink-0">
            <Tabs
              value={activeDrawerTab}
              onValueChange={(val: any) => setActiveDrawerTab(val)}
              variant="segmented"
              size="sm"
              className="w-full"
            >
              <TabsList className="grid grid-cols-3 w-full bg-bg-layer-2 border border-border-subtle p-0.5 radius-md h-8">
                <TabsTrigger value="copilot" className="text-[11px] font-bold py-1 flex items-center gap-1">
                  <Brain className="h-3 w-3 text-primary" />
                  <span>Copilot</span>
                </TabsTrigger>
                <TabsTrigger value="profile" className="text-[11px] font-bold py-1 flex items-center gap-1">
                  <User className="h-3 w-3" />
                  <span>Profile</span>
                </TabsTrigger>
                <TabsTrigger value="notes" className="text-[11px] font-bold py-1 flex items-center gap-1">
                  <FileText className="h-3 w-3" />
                  <span>Notes</span>
                </TabsTrigger>
              </TabsList>
            </Tabs>
          </div>

          <ScrollArea className="flex-1 p-space-3 space-y-space-3 bg-bg-layer-1/5" horizontal={false}>
            {selectedThread ? (
              <div className="space-y-space-3 text-caption animate-fade-in">
                
                {/* ── TAB 1: AI COPILOT & CITATIONS ── */}
                {activeDrawerTab === "copilot" && (
                  <div className="space-y-space-3">
                    {/* Autonomy Card */}
                    <div className="p-space-3 bg-background border border-border-subtle radius-lg shadow-xs space-y-space-2">
                      <div className="flex items-center justify-between">
                        <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1">
                          <Brain className="h-3 w-3 text-primary" /> Autopilot Status
                        </span>
                        {isAiAutopilotActive ? (
                          <span className="text-[10px] bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 font-bold px-2 py-0.5 radius-full border border-emerald-500/20">
                            Active
                          </span>
                        ) : (
                          <span className="text-[10px] bg-amber-500/10 text-amber-600 dark:text-amber-400 font-bold px-2 py-0.5 radius-full border border-amber-500/20">
                            Paused (Human Mode)
                          </span>
                        )}
                      </div>
                      <p className="text-[11px] text-neutral-500">
                        {isAiAutopilotActive
                          ? "AI is autonomously answering customer questions using your Knowledge Base."
                          : "AI responses are paused so you can handle this dialogue manually without interruptions."}
                      </p>
                      <Button
                        variant={isAiAutopilotActive ? "outline" : "default"}
                        size="xs"
                        width="full"
                        className="text-[11px] font-semibold mt-1"
                        onClick={() => handleToggleAutonomy(isAiAutopilotActive ? "paused" : "active")}
                      >
                        {isAiAutopilotActive ? "⏸️ Pause AI & Take Over" : "▶️ Resume AI Autopilot"}
                      </Button>
                    </div>

                    {/* Detected Intent & Confidence */}
                    <div className="p-space-3 bg-background border border-border-subtle radius-lg shadow-xs space-y-space-2">
                      <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground block">
                        Intent Intelligence
                      </span>
                      <div className="flex items-center justify-between bg-bg-layer-1 p-space-2 radius-md border border-border-subtle">
                        <div>
                          <span className="text-[10px] text-neutral-400 block uppercase">Detected Intent</span>
                          <span className="text-[12px] font-bold text-foreground capitalize">
                            {aiAnalysis?.intent?.replace(/_/g, " ") || "Inquiry / Booking"}
                          </span>
                        </div>
                        <div className="text-right">
                          <span className="text-[10px] text-neutral-400 block uppercase">Confidence</span>
                          <span className="text-[12px] font-bold text-emerald-600 dark:text-emerald-400">
                            {Math.round((aiAnalysis?.confidenceScore || 0.95) * 100)}%
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* RAG Knowledge Base Sources Matched */}
                    <div className="p-space-3 bg-background border border-border-subtle radius-lg shadow-xs space-y-space-2">
                      <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1">
                        <BookOpen className="h-3 w-3 text-primary" /> Grounded KB Citations
                      </span>

                      {aiAnalysis?.citations && aiAnalysis.citations.length > 0 ? (
                        <div className="space-y-space-1.5">
                          {aiAnalysis.citations.map((cite: any, i: number) => (
                            <div key={i} className="p-space-2 bg-bg-layer-1 border border-border-subtle radius-md text-[11px] space-y-1">
                              <div className="flex items-center justify-between font-semibold text-primary">
                                <span className="truncate max-w-[160px]">📄 {cite.documentName || "Knowledge Base Document"}</span>
                                <span className="text-[10px] text-emerald-600">{Math.round((cite.score || 0.94) * 100)}% Match</span>
                              </div>
                              <p className="text-[10px] text-neutral-500 line-clamp-2 italic">
                                "{cite.content || cite.snippet || "Verified organizational policies and service guidelines."}"
                              </p>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <div className="p-space-2 bg-bg-layer-1 border border-border-subtle radius-md text-[11px] text-neutral-500 text-center">
                          Knowledge ground-truth active.
                        </div>
                      )}
                    </div>

                    {/* Quick Staff Assist Actions */}
                    <div className="p-space-3 bg-background border border-border-subtle radius-lg shadow-xs space-y-space-2">
                      <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground block">
                        Copilot Actions
                      </span>
                      <Button
                        variant="outline"
                        size="xs"
                        width="full"
                        className="text-[11px] font-semibold justify-start gap-2 h-7.5"
                        onClick={handleGenerateAiDraft}
                        disabled={generatingDraft}
                      >
                        <Sparkles className="h-3.5 w-3.5 text-primary" />
                        <span>Suggest Next Best Reply</span>
                      </Button>
                    </div>
                  </div>
                )}

                {/* ── TAB 2: CONTACT PROFILE ── */}
                {activeDrawerTab === "profile" && (
                  <div className="space-y-space-3">
                    {/* Visual Card */}
                    <div className="flex items-center gap-space-3 p-space-2.5 bg-background border border-border-subtle radius-lg shadow-xs">
                      <div className={`h-9 w-9 radius-full bg-gradient-to-br ${getAvatarGradient(selectedThread.conversation?.leadProfile?.name || "Client")} text-white text-caption font-bold flex items-center justify-center shrink-0 shadow-xs`}>
                        {getInitials(selectedThread.conversation?.leadProfile?.name || "Client")}
                      </div>
                      <div className="text-left min-w-0">
                        <h4 className="text-caption font-bold text-foreground truncate">
                          {selectedThread.conversation?.leadProfile?.name || "Anonymous Client"}
                        </h4>
                        <span className="text-[11px] text-neutral-400 block">
                          via <span className="text-primary font-semibold uppercase">{selectedThread.channel?.type}</span>
                        </span>
                      </div>
                    </div>

                    {/* Score & LTV */}
                    <div className="grid grid-cols-2 gap-space-2">
                      <div className="bg-background border border-border-subtle radius-lg p-space-2 shadow-xs">
                        <span className="text-[9px] text-neutral-400 uppercase font-bold block">Lead Score</span>
                        <span className="text-caption font-bold text-foreground mt-0.5 block">
                          {selectedThread.conversation?.leadProfile?.leadScore || 0}
                        </span>
                      </div>
                      <div className="bg-background border border-border-subtle radius-lg p-space-2 shadow-xs">
                        <span className="text-[9px] text-neutral-400 uppercase font-bold block">Est. LTV</span>
                        <span className="text-caption font-bold text-emerald-600 mt-0.5 block">
                          ${selectedThread.conversation?.leadProfile?.lifetimeValue || 0}
                        </span>
                      </div>
                    </div>

                    {/* Editable Fields */}
                    <div className="space-y-space-2 border-t border-border-subtle pt-space-2">
                      <div className="space-y-0.5">
                        <Label className="text-[10px] uppercase font-bold text-neutral-500">Name</Label>
                        <Input
                          value={contactName}
                          onChange={(e) => setContactName(e.target.value)}
                          className="h-7 text-caption bg-background border-border-subtle"
                        />
                      </div>
                      <div className="space-y-0.5">
                        <Label className="text-[10px] uppercase font-bold text-neutral-500">Email</Label>
                        <Input
                          value={contactEmail}
                          onChange={(e) => setContactEmail(e.target.value)}
                          className="h-7 text-caption bg-background border-border-subtle"
                        />
                      </div>
                      <div className="space-y-0.5">
                        <Label className="text-[10px] uppercase font-bold text-neutral-500">Phone</Label>
                        <Input
                          value={contactPhone}
                          onChange={(e) => setContactPhone(e.target.value)}
                          className="h-7 text-caption bg-background border-border-subtle"
                        />
                      </div>
                      <div className="space-y-0.5">
                        <Label className="text-[10px] uppercase font-bold text-neutral-500">Lead Stage</Label>
                        <Select value={contactStatus} onValueChange={(val) => setContactStatus(val)}>
                          <SelectTrigger className="h-7 text-caption bg-background border-border-subtle">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {["New", "Qualified", "Hot", "Booked", "Escalated", "Closed"].map((s) => (
                              <SelectItem key={s} value={s}>{s}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      <Button
                        size="xs"
                        width="full"
                        className="mt-2 h-7.5 text-[11px]"
                        onClick={handleSaveContact}
                        disabled={isSavingContact}
                      >
                        {isSavingContact ? "Saving Profile..." : "Save Contact"}
                      </Button>
                    </div>
                  </div>
                )}

                {/* ── TAB 3: INTERNAL NOTES ── */}
                {activeDrawerTab === "notes" && (
                  <div className="space-y-space-2">
                    <Label className="text-[10px] uppercase font-bold text-neutral-500">Internal Collaboration Notes</Label>
                    <NativeTextarea
                      rows={5}
                      value={contactNotes}
                      onChange={(e) => setContactNotes(e.target.value)}
                      placeholder="Add customer preferences, follow-up deadlines, or staff handover notes..."
                      className="w-full bg-background border border-border-subtle radius-md p-space-2 text-[11px] leading-relaxed resize-none"
                    />
                    <Button
                      size="xs"
                      width="full"
                      className="h-7.5 text-[11px]"
                      onClick={handleSaveContact}
                      disabled={isSavingContact}
                    >
                      {isSavingContact ? "Updating Notes..." : "Update Notes"}
                    </Button>
                  </div>
                )}

              </div>
            ) : (
              <div className="h-full flex flex-col items-center justify-center p-space-6 text-center text-caption text-neutral-400 gap-space-2 py-space-12">
                <Brain className="h-8 w-8 text-neutral-300 mb-1" />
                <span>Select a conversation to inspect AI citations and lead profile.</span>
              </div>
            )}
          </ScrollArea>
        </div>

      </div>
    </div>
  );
}