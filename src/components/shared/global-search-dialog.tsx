"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { Command } from "cmdk";
import * as DialogPrimitive from "@radix-ui/react-dialog";
import {
  Search,
  Users,
  Calendar,
  BookOpen,
  HelpCircle,
  Briefcase,
  PhoneCall,
  Compass,
  ArrowRight,
  Loader2,
  X,
  AlertCircle,
  CornerDownLeft,
  Sparkles,
  ExternalLink,
} from "lucide-react";
import { performGlobalSearchAction } from "@/server/actions/search";
import {
  SearchResultItem,
  SearchResultsGrouped,
  SearchResourceType,
} from "@/lib/search/types";
import { NAVIGATION_REGISTRY } from "@/lib/search/navigation-registry";
import { cn } from "./utils";
import { Badge } from "./badge";

interface GlobalSearchDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function GlobalSearchDialog({ open, onOpenChange }: GlobalSearchDialogProps) {
  const router = useRouter();
  const [query, setQuery] = React.useState("");
  const [isLoading, setIsLoading] = React.useState(false);
  const [errorMsg, setErrorMsg] = React.useState<string | null>(null);
  const [results, setResults] = React.useState<SearchResultsGrouped>({
    contacts: [],
    appointments: [],
    knowledge: [],
    faqs: [],
    services: [],
    calls: [],
    navigation: [],
  });

  const activeRequestId = React.useRef(0);
  const inputRef = React.useRef<HTMLInputElement>(null);

  // Global Keyboard shortcut listener (⌘K / Ctrl+K)
  React.useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        onOpenChange(!open);
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [open, onOpenChange]);

  // Clear query on close
  React.useEffect(() => {
    if (!open) {
      setQuery("");
      setErrorMsg(null);
      setResults({
        contacts: [],
        appointments: [],
        knowledge: [],
        faqs: [],
        services: [],
        calls: [],
        navigation: [],
      });
    }
  }, [open]);

  // Debounced search execution with sequence protection
  React.useEffect(() => {
    const trimmed = query.trim();

    if (trimmed.length < 2) {
      setIsLoading(false);
      setErrorMsg(null);
      // For 1 char, show matching navigation items
      if (trimmed.length === 1) {
        const navMatches = NAVIGATION_REGISTRY.filter(
          (n) =>
            n.title.toLowerCase().includes(trimmed.toLowerCase()) ||
            n.keywords.some((k) => k.startsWith(trimmed.toLowerCase()))
        ).slice(0, 5).map((n) => ({
          id: n.id,
          type: "navigation" as const,
          title: n.title,
          description: n.description,
          badge: n.badge,
          href: n.href,
        }));
        setResults({
          contacts: [],
          appointments: [],
          knowledge: [],
          faqs: [],
          services: [],
          calls: [],
          navigation: navMatches,
        });
      } else {
        setResults({
          contacts: [],
          appointments: [],
          knowledge: [],
          faqs: [],
          services: [],
          calls: [],
          navigation: [],
        });
      }
      return;
    }

    setIsLoading(true);
    setErrorMsg(null);
    const requestId = ++activeRequestId.current;

    const timer = setTimeout(async () => {
      try {
        const response = await performGlobalSearchAction(trimmed, { limitPerCategory: 5 });
        // Only update if this is the newest pending request
        if (requestId === activeRequestId.current) {
          if (response.success) {
            setResults(response.results);
            setErrorMsg(null);
          } else {
            setErrorMsg(response.error || "Unable to search right now");
          }
          setIsLoading(false);
        }
      } catch (err: any) {
        if (requestId === activeRequestId.current) {
          setErrorMsg(err?.message || "Search service connection failed");
          setIsLoading(false);
        }
      }
    }, 280);

    return () => clearTimeout(timer);
  }, [query]);

  const handleSelectResult = (href: string) => {
    onOpenChange(false);
    router.push(href);
  };

  const handleViewAllResults = () => {
    if (!query.trim()) return;
    onOpenChange(false);
    router.push(`/search?q=${encodeURIComponent(query.trim())}`);
  };

  const totalResultsCount =
    results.contacts.length +
    results.appointments.length +
    results.knowledge.length +
    results.faqs.length +
    results.services.length +
    results.calls.length +
    results.navigation.length;

  const isIdle = query.trim().length === 0;
  const hasNoResults = !isIdle && query.trim().length >= 2 && !isLoading && !errorMsg && totalResultsCount === 0;

  // Resource Icon mapper
  const getResourceIcon = (type: SearchResourceType) => {
    switch (type) {
      case "contact":
        return <Users className="h-4 w-4 text-emerald-500 shrink-0" />;
      case "appointment":
        return <Calendar className="h-4 w-4 text-blue-500 shrink-0" />;
      case "knowledge":
        return <BookOpen className="h-4 w-4 text-purple-500 shrink-0" />;
      case "faq":
        return <HelpCircle className="h-4 w-4 text-amber-500 shrink-0" />;
      case "service":
        return <Briefcase className="h-4 w-4 text-rose-500 shrink-0" />;
      case "call":
        return <PhoneCall className="h-4 w-4 text-cyan-500 shrink-0" />;
      case "navigation":
      default:
        return <Compass className="h-4 w-4 text-primary shrink-0" />;
    }
  };

  return (
    <DialogPrimitive.Root open={open} onOpenChange={onOpenChange}>
      <DialogPrimitive.Portal>
        {/* Backdrop overlay */}
        <DialogPrimitive.Overlay
          className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0"
        />

        {/* Modal Content */}
        <DialogPrimitive.Content
          aria-label="Global Search and Command Palette"
          className="fixed left-1/2 top-[12%] sm:top-[16%] -translate-x-1/2 z-50 w-[95vw] sm:w-[90vw] max-w-2xl bg-card border border-border/70 rounded-2xl shadow-2xl overflow-hidden flex flex-col focus:outline-none data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95 duration-200"
        >
          <Command
            shouldFilter={false} // Filter is handled server-side dynamically
            className="flex flex-col w-full bg-card overflow-hidden"
          >
            {/* ── Search Input Header ── */}
            <div className="flex items-center px-4 py-3.5 border-b border-border/60 bg-muted/20 gap-3">
              <Search className="h-5 w-5 text-muted-foreground/70 shrink-0" />
              <input
                ref={inputRef}
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search Operator (contacts, appointments, knowledge, calls, routes)..."
                className="w-full bg-transparent text-sm sm:text-base text-foreground placeholder:text-muted-foreground/60 outline-none border-none focus:ring-0"
                autoFocus
              />
              {isLoading && (
                <Loader2 className="h-4 w-4 text-primary animate-spin shrink-0" />
              )}
              {query && !isLoading && (
                <button
                  type="button"
                  onClick={() => setQuery("")}
                  className="p-1 rounded-md text-muted-foreground/60 hover:text-foreground hover:bg-muted/60 transition-colors cursor-pointer"
                  aria-label="Clear search input"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              )}
              <kbd className="hidden sm:inline-flex items-center gap-0.5 text-[10px] font-mono bg-muted px-1.5 py-0.5 rounded border border-border/80 text-muted-foreground shadow-2xs select-none">
                ESC
              </kbd>
            </div>

            {/* ── Scrollable Results Container ── */}
            <div className="max-h-[62vh] sm:max-h-[55vh] overflow-y-auto overflow-x-hidden p-2 [scrollbar-width:thin]">
              {/* ── 1. IDLE STATE: Guidance & Quick Navigation ── */}
              {isIdle && (
                <div className="py-3 px-2 space-y-4">
                  <div className="px-3 py-2 rounded-xl bg-primary/5 border border-primary/10 flex items-start gap-3">
                    <Sparkles className="h-5 w-5 text-primary shrink-0 mt-0.5" />
                    <div>
                      <h4 className="text-xs font-semibold text-foreground">Global Operator Search</h4>
                      <p className="text-[11px] text-muted-foreground mt-0.5 leading-relaxed">
                        Search across real customers, calendar appointments, knowledge documents, FAQs, service catalog, and voice call logs.
                      </p>
                    </div>
                  </div>

                  {/* Frequently accessed navigation commands */}
                  <div>
                    <div className="px-3 pb-1.5 text-[11px] font-medium tracking-wide uppercase text-muted-foreground/70">
                      Quick Navigation
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-1">
                      {NAVIGATION_REGISTRY.slice(0, 6).map((item) => (
                        <button
                          key={item.id}
                          type="button"
                          onClick={() => handleSelectResult(item.href)}
                          className="flex items-center justify-between p-2.5 rounded-lg text-left hover:bg-accent/60 transition-colors group cursor-pointer border border-transparent hover:border-border/40"
                        >
                          <div className="flex items-center gap-2.5 min-w-0">
                            <Compass className="h-4 w-4 text-primary/70 shrink-0 group-hover:text-primary transition-colors" />
                            <div className="truncate">
                              <span className="text-xs font-medium text-foreground block truncate">
                                {item.title}
                              </span>
                              <span className="text-[10px] text-muted-foreground truncate block">
                                {item.badge}
                              </span>
                            </div>
                          </div>
                          <ArrowRight className="h-3 w-3 text-muted-foreground/40 group-hover:text-foreground shrink-0 transition-transform group-hover:translate-x-0.5" />
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              )}

              {/* ── 2. ERROR STATE ── */}
              {errorMsg && (
                <div className="py-8 px-4 text-center space-y-3">
                  <div className="inline-flex h-10 w-10 items-center justify-center rounded-full bg-rose-500/10 text-rose-500 mb-1">
                    <AlertCircle className="h-5 w-5" />
                  </div>
                  <h4 className="text-sm font-semibold text-foreground">Search Error</h4>
                  <p className="text-xs text-muted-foreground max-w-sm mx-auto leading-relaxed">
                    {errorMsg}
                  </p>
                  <button
                    type="button"
                    onClick={() => {
                      const q = query;
                      setQuery("");
                      setTimeout(() => setQuery(q), 50);
                    }}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium bg-secondary text-secondary-foreground hover:bg-secondary/80 transition-colors cursor-pointer"
                  >
                    Retry Search
                  </button>
                </div>
              )}

              {/* ── 3. NO RESULTS STATE ── */}
              {hasNoResults && (
                <div className="py-8 px-4 text-center space-y-2.5">
                  <div className="inline-flex h-10 w-10 items-center justify-center rounded-full bg-muted text-muted-foreground mb-1">
                    <Search className="h-5 w-5" />
                  </div>
                  <h4 className="text-sm font-semibold text-foreground">
                    No results for &ldquo;{query}&rdquo;
                  </h4>
                  <p className="text-xs text-muted-foreground max-w-sm mx-auto leading-relaxed">
                    No matching records found in contacts, appointments, documents, FAQs, or calls.
                  </p>
                  <div className="pt-2 text-[11px] text-muted-foreground/80 space-y-1">
                    <div>Try searching by:</div>
                    <div className="flex flex-wrap items-center justify-center gap-1.5 mt-1">
                      <span className="px-2 py-0.5 rounded bg-muted text-[10px]">Customer Name</span>
                      <span className="px-2 py-0.5 rounded bg-muted text-[10px]">Email Address</span>
                      <span className="px-2 py-0.5 rounded bg-muted text-[10px]">Phone Number</span>
                      <span className="px-2 py-0.5 rounded bg-muted text-[10px]">Service or FAQ</span>
                    </div>
                  </div>
                </div>
              )}

              {/* ── 4. POPULATED RESULTS ── */}
              {!isIdle && !errorMsg && totalResultsCount > 0 && (
                <div className="space-y-3 pb-1">
                  {/* Contacts */}
                  {results.contacts.length > 0 && (
                    <div className="space-y-1">
                      <div className="flex items-center justify-between px-3 pt-1 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground/70">
                        <span className="flex items-center gap-1.5">
                          <Users className="h-3 w-3 text-emerald-500" /> Contacts & Leads
                        </span>
                        <span>{results.contacts.length}</span>
                      </div>
                      {results.contacts.map((item) => (
                        <button
                          key={item.id}
                          type="button"
                          onClick={() => handleSelectResult(item.href)}
                          className="w-full flex items-center justify-between p-2.5 rounded-xl text-left hover:bg-accent/60 transition-colors group cursor-pointer border border-transparent hover:border-border/50"
                        >
                          <div className="flex items-center gap-3 min-w-0">
                            <div className="h-8 w-8 rounded-lg bg-emerald-500/10 flex items-center justify-center shrink-0 text-emerald-600 dark:text-emerald-400">
                              <Users className="h-4 w-4" />
                            </div>
                            <div className="min-w-0">
                              <div className="text-xs font-semibold text-foreground group-hover:text-primary transition-colors truncate">
                                {item.title}
                              </div>
                              {item.description && (
                                <div className="text-[11px] text-muted-foreground truncate">
                                  {item.description}
                                </div>
                              )}
                            </div>
                          </div>
                          <div className="flex items-center gap-2 shrink-0 ml-2">
                            {item.badge && (
                              <Badge variant="outline" className="text-[10px] py-0 px-1.5 h-4.5">
                                {item.badge}
                              </Badge>
                            )}
                            <ArrowRight className="h-3 w-3 text-muted-foreground/40 group-hover:text-foreground shrink-0 transition-transform group-hover:translate-x-0.5" />
                          </div>
                        </button>
                      ))}
                    </div>
                  )}

                  {/* Appointments */}
                  {results.appointments.length > 0 && (
                    <div className="space-y-1">
                      <div className="flex items-center justify-between px-3 pt-1 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground/70">
                        <span className="flex items-center gap-1.5">
                          <Calendar className="h-3 w-3 text-blue-500" /> Appointments
                        </span>
                        <span>{results.appointments.length}</span>
                      </div>
                      {results.appointments.map((item) => (
                        <button
                          key={item.id}
                          type="button"
                          onClick={() => handleSelectResult(item.href)}
                          className="w-full flex items-center justify-between p-2.5 rounded-xl text-left hover:bg-accent/60 transition-colors group cursor-pointer border border-transparent hover:border-border/50"
                        >
                          <div className="flex items-center gap-3 min-w-0">
                            <div className="h-8 w-8 rounded-lg bg-blue-500/10 flex items-center justify-center shrink-0 text-blue-600 dark:text-blue-400">
                              <Calendar className="h-4 w-4" />
                            </div>
                            <div className="min-w-0">
                              <div className="text-xs font-semibold text-foreground group-hover:text-primary transition-colors truncate">
                                {item.title}
                              </div>
                              {item.description && (
                                <div className="text-[11px] text-muted-foreground truncate">
                                  {item.description}
                                </div>
                              )}
                            </div>
                          </div>
                          <div className="flex items-center gap-2 shrink-0 ml-2">
                            {item.badge && (
                              <Badge variant="secondary" className="text-[10px] py-0 px-1.5 h-4.5 capitalize">
                                {item.badge}
                              </Badge>
                            )}
                            <ArrowRight className="h-3 w-3 text-muted-foreground/40 group-hover:text-foreground shrink-0 transition-transform group-hover:translate-x-0.5" />
                          </div>
                        </button>
                      ))}
                    </div>
                  )}

                  {/* Knowledge Base */}
                  {results.knowledge.length > 0 && (
                    <div className="space-y-1">
                      <div className="flex items-center justify-between px-3 pt-1 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground/70">
                        <span className="flex items-center gap-1.5">
                          <BookOpen className="h-3 w-3 text-purple-500" /> Knowledge Base
                        </span>
                        <span>{results.knowledge.length}</span>
                      </div>
                      {results.knowledge.map((item) => (
                        <button
                          key={item.id}
                          type="button"
                          onClick={() => handleSelectResult(item.href)}
                          className="w-full flex items-center justify-between p-2.5 rounded-xl text-left hover:bg-accent/60 transition-colors group cursor-pointer border border-transparent hover:border-border/50"
                        >
                          <div className="flex items-center gap-3 min-w-0">
                            <div className="h-8 w-8 rounded-lg bg-purple-500/10 flex items-center justify-center shrink-0 text-purple-600 dark:text-purple-400">
                              <BookOpen className="h-4 w-4" />
                            </div>
                            <div className="min-w-0">
                              <div className="text-xs font-semibold text-foreground group-hover:text-primary transition-colors truncate">
                                {item.title}
                              </div>
                              {item.description && (
                                <div className="text-[11px] text-muted-foreground truncate">
                                  {item.description}
                                </div>
                              )}
                            </div>
                          </div>
                          <div className="flex items-center gap-2 shrink-0 ml-2">
                            {item.badge && (
                              <Badge variant="outline" className="text-[10px] py-0 px-1.5 h-4.5">
                                {item.badge}
                              </Badge>
                            )}
                            <ArrowRight className="h-3 w-3 text-muted-foreground/40 group-hover:text-foreground shrink-0 transition-transform group-hover:translate-x-0.5" />
                          </div>
                        </button>
                      ))}
                    </div>
                  )}

                  {/* FAQs */}
                  {results.faqs.length > 0 && (
                    <div className="space-y-1">
                      <div className="flex items-center justify-between px-3 pt-1 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground/70">
                        <span className="flex items-center gap-1.5">
                          <HelpCircle className="h-3 w-3 text-amber-500" /> FAQs
                        </span>
                        <span>{results.faqs.length}</span>
                      </div>
                      {results.faqs.map((item) => (
                        <button
                          key={item.id}
                          type="button"
                          onClick={() => handleSelectResult(item.href)}
                          className="w-full flex items-center justify-between p-2.5 rounded-xl text-left hover:bg-accent/60 transition-colors group cursor-pointer border border-transparent hover:border-border/50"
                        >
                          <div className="flex items-center gap-3 min-w-0">
                            <div className="h-8 w-8 rounded-lg bg-amber-500/10 flex items-center justify-center shrink-0 text-amber-600 dark:text-amber-400">
                              <HelpCircle className="h-4 w-4" />
                            </div>
                            <div className="min-w-0">
                              <div className="text-xs font-semibold text-foreground group-hover:text-primary transition-colors truncate">
                                {item.title}
                              </div>
                              {item.description && (
                                <div className="text-[11px] text-muted-foreground truncate">
                                  {item.description}
                                </div>
                              )}
                            </div>
                          </div>
                          <div className="flex items-center gap-2 shrink-0 ml-2">
                            {item.badge && (
                              <Badge variant="outline" className="text-[10px] py-0 px-1.5 h-4.5">
                                {item.badge}
                              </Badge>
                            )}
                            <ArrowRight className="h-3 w-3 text-muted-foreground/40 group-hover:text-foreground shrink-0 transition-transform group-hover:translate-x-0.5" />
                          </div>
                        </button>
                      ))}
                    </div>
                  )}

                  {/* Services */}
                  {results.services.length > 0 && (
                    <div className="space-y-1">
                      <div className="flex items-center justify-between px-3 pt-1 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground/70">
                        <span className="flex items-center gap-1.5">
                          <Briefcase className="h-3 w-3 text-rose-500" /> Services & Pricing
                        </span>
                        <span>{results.services.length}</span>
                      </div>
                      {results.services.map((item) => (
                        <button
                          key={item.id}
                          type="button"
                          onClick={() => handleSelectResult(item.href)}
                          className="w-full flex items-center justify-between p-2.5 rounded-xl text-left hover:bg-accent/60 transition-colors group cursor-pointer border border-transparent hover:border-border/50"
                        >
                          <div className="flex items-center gap-3 min-w-0">
                            <div className="h-8 w-8 rounded-lg bg-rose-500/10 flex items-center justify-center shrink-0 text-rose-600 dark:text-rose-400">
                              <Briefcase className="h-4 w-4" />
                            </div>
                            <div className="min-w-0">
                              <div className="text-xs font-semibold text-foreground group-hover:text-primary transition-colors truncate">
                                {item.title}
                              </div>
                              {item.description && (
                                <div className="text-[11px] text-muted-foreground truncate">
                                  {item.description}
                                </div>
                              )}
                            </div>
                          </div>
                          <div className="flex items-center gap-2 shrink-0 ml-2">
                            {item.metadata && (
                              <Badge variant="secondary" className="text-[10px] py-0 px-1.5 h-4.5">
                                {item.metadata}
                              </Badge>
                            )}
                            <ArrowRight className="h-3 w-3 text-muted-foreground/40 group-hover:text-foreground shrink-0 transition-transform group-hover:translate-x-0.5" />
                          </div>
                        </button>
                      ))}
                    </div>
                  )}

                  {/* Calls */}
                  {results.calls.length > 0 && (
                    <div className="space-y-1">
                      <div className="flex items-center justify-between px-3 pt-1 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground/70">
                        <span className="flex items-center gap-1.5">
                          <PhoneCall className="h-3 w-3 text-cyan-500" /> Voice Call Sessions
                        </span>
                        <span>{results.calls.length}</span>
                      </div>
                      {results.calls.map((item) => (
                        <button
                          key={item.id}
                          type="button"
                          onClick={() => handleSelectResult(item.href)}
                          className="w-full flex items-center justify-between p-2.5 rounded-xl text-left hover:bg-accent/60 transition-colors group cursor-pointer border border-transparent hover:border-border/50"
                        >
                          <div className="flex items-center gap-3 min-w-0">
                            <div className="h-8 w-8 rounded-lg bg-cyan-500/10 flex items-center justify-center shrink-0 text-cyan-600 dark:text-cyan-400">
                              <PhoneCall className="h-4 w-4" />
                            </div>
                            <div className="min-w-0">
                              <div className="text-xs font-semibold text-foreground group-hover:text-primary transition-colors truncate">
                                {item.title}
                              </div>
                              {item.description && (
                                <div className="text-[11px] text-muted-foreground truncate">
                                  {item.description}
                                </div>
                              )}
                            </div>
                          </div>
                          <div className="flex items-center gap-2 shrink-0 ml-2">
                            {item.badge && (
                              <Badge variant="outline" className="text-[10px] py-0 px-1.5 h-4.5">
                                {item.badge}
                              </Badge>
                            )}
                            <ArrowRight className="h-3 w-3 text-muted-foreground/40 group-hover:text-foreground shrink-0 transition-transform group-hover:translate-x-0.5" />
                          </div>
                        </button>
                      ))}
                    </div>
                  )}

                  {/* Navigation commands */}
                  {results.navigation.length > 0 && (
                    <div className="space-y-1">
                      <div className="flex items-center justify-between px-3 pt-1 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground/70">
                        <span className="flex items-center gap-1.5">
                          <Compass className="h-3 w-3 text-primary" /> Navigation
                        </span>
                        <span>{results.navigation.length}</span>
                      </div>
                      {results.navigation.map((item) => (
                        <button
                          key={item.id}
                          type="button"
                          onClick={() => handleSelectResult(item.href)}
                          className="w-full flex items-center justify-between p-2.5 rounded-xl text-left hover:bg-accent/60 transition-colors group cursor-pointer border border-transparent hover:border-border/50"
                        >
                          <div className="flex items-center gap-3 min-w-0">
                            <div className="h-8 w-8 rounded-lg bg-primary/10 flex items-center justify-center shrink-0 text-primary">
                              <Compass className="h-4 w-4" />
                            </div>
                            <div className="min-w-0">
                              <div className="text-xs font-semibold text-foreground group-hover:text-primary transition-colors truncate">
                                {item.title}
                              </div>
                              {item.description && (
                                <div className="text-[11px] text-muted-foreground truncate">
                                  {item.description}
                                </div>
                              )}
                            </div>
                          </div>
                          <div className="flex items-center gap-2 shrink-0 ml-2">
                            {item.badge && (
                              <Badge variant="secondary" className="text-[10px] py-0 px-1.5 h-4.5">
                                {item.badge}
                              </Badge>
                            )}
                            <ArrowRight className="h-3 w-3 text-muted-foreground/40 group-hover:text-foreground shrink-0 transition-transform group-hover:translate-x-0.5" />
                          </div>
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* ── Modal Footer ── */}
            <div className="flex items-center justify-between px-4 py-2.5 border-t border-border/60 bg-muted/20 text-[11px] text-muted-foreground">
              <div className="flex items-center gap-3">
                <span className="inline-flex items-center gap-1">
                  <kbd className="px-1 py-0.5 rounded bg-muted border border-border/80 text-[10px] font-mono leading-none">
                    ↑
                  </kbd>
                  <kbd className="px-1 py-0.5 rounded bg-muted border border-border/80 text-[10px] font-mono leading-none">
                    ↓
                  </kbd>
                  <span className="hidden sm:inline">Navigate</span>
                </span>
                <span className="inline-flex items-center gap-1">
                  <kbd className="px-1 py-0.5 rounded bg-muted border border-border/80 text-[10px] font-mono leading-none">
                    ↵
                  </kbd>
                  <span className="hidden sm:inline">Select</span>
                </span>
              </div>

              {query.trim().length >= 2 && (
                <button
                  type="button"
                  onClick={handleViewAllResults}
                  className="inline-flex items-center gap-1 text-primary hover:underline font-medium cursor-pointer"
                >
                  <span>View all results for &ldquo;{query.trim()}&rdquo;</span>
                  <ExternalLink className="h-3 w-3" />
                </button>
              )}
            </div>
          </Command>
        </DialogPrimitive.Content>
      </DialogPrimitive.Portal>
    </DialogPrimitive.Root>
  );
}
