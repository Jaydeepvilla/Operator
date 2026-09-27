"use client";

import * as React from "react";
import { useSearchParams, useRouter, usePathname } from "next/navigation";
import Link from "next/link";
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
  Sparkles,
  Filter,
} from "lucide-react";
import { performGlobalSearchAction } from "@/server/actions/search";
import {
  SearchResultItem,
  SearchResultsGrouped,
  SearchResourceType,
} from "@/lib/search/types";
import { NAVIGATION_REGISTRY } from "@/lib/search/navigation-registry";
import { Button } from "@/components/shared/button";
import { Badge } from "@/components/shared/badge";
import { PageTitle } from "@/components/shared/page-title";
import { cn } from "@/components/shared/utils";

type CategoryFilter =
  | "all"
  | "contacts"
  | "appointments"
  | "knowledge"
  | "faqs"
  | "services"
  | "calls"
  | "navigation";

export function SearchClient() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();

  const initialQuery = searchParams.get("q") || "";
  const [query, setQuery] = React.useState(initialQuery);
  const [activeCategory, setActiveCategory] = React.useState<CategoryFilter>("all");
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

  // Sync state with URL parameter changes (e.g. browser back/forward)
  React.useEffect(() => {
    const q = searchParams.get("q") || "";
    if (q !== query) {
      setQuery(q);
    }
  }, [searchParams]);

  // Execute search when query changes
  React.useEffect(() => {
    const trimmed = query.trim();

    // Update URL query parameter without triggering full reload
    const params = new URLSearchParams(searchParams.toString());
    if (trimmed) {
      params.set("q", trimmed);
    } else {
      params.delete("q");
    }
    const newUrl = `${pathname}${params.toString() ? `?${params.toString()}` : ""}`;
    window.history.replaceState(null, "", newUrl);

    if (trimmed.length < 2) {
      setIsLoading(false);
      setErrorMsg(null);
      if (trimmed.length === 1) {
        const navMatches = NAVIGATION_REGISTRY.filter(
          (n) =>
            n.title.toLowerCase().includes(trimmed.toLowerCase()) ||
            n.keywords.some((k) => k.startsWith(trimmed.toLowerCase()))
        ).slice(0, 10).map((n) => ({
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
        const response = await performGlobalSearchAction(trimmed, { limitPerCategory: 20 });
        if (requestId === activeRequestId.current) {
          if (response.success) {
            setResults(response.results);
            setErrorMsg(null);
          } else {
            setErrorMsg(response.error || "Unable to complete search");
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
  }, [query, pathname]);

  const totalResultsCount =
    results.contacts.length +
    results.appointments.length +
    results.knowledge.length +
    results.faqs.length +
    results.services.length +
    results.calls.length +
    results.navigation.length;

  const categoriesConfig: { key: CategoryFilter; label: string; count: number; icon: any }[] = [
    { key: "all", label: "All Results", count: totalResultsCount, icon: Filter },
    { key: "contacts", label: "Contacts & Leads", count: results.contacts.length, icon: Users },
    { key: "appointments", label: "Appointments", count: results.appointments.length, icon: Calendar },
    { key: "knowledge", label: "Knowledge Base", count: results.knowledge.length, icon: BookOpen },
    { key: "faqs", label: "FAQs", count: results.faqs.length, icon: HelpCircle },
    { key: "services", label: "Services", count: results.services.length, icon: Briefcase },
    { key: "calls", label: "Voice Calls", count: results.calls.length, icon: PhoneCall },
    { key: "navigation", label: "Navigation", count: results.navigation.length, icon: Compass },
  ];

  const renderResultCard = (item: SearchResultItem) => {
    return (
      <Link
        key={item.id}
        href={item.href}
        className="flex items-start justify-between p-4 rounded-xl border border-border/60 bg-card hover:bg-accent/40 hover:border-border transition-all duration-150 group shadow-2xs"
      >
        <div className="flex items-start gap-3.5 min-w-0">
          <div className="h-9 w-9 rounded-lg bg-primary/10 flex items-center justify-center shrink-0 text-primary mt-0.5">
            {item.type === "contact" && <Users className="h-4.5 w-4.5 text-emerald-500" />}
            {item.type === "appointment" && <Calendar className="h-4.5 w-4.5 text-blue-500" />}
            {item.type === "knowledge" && <BookOpen className="h-4.5 w-4.5 text-purple-500" />}
            {item.type === "faq" && <HelpCircle className="h-4.5 w-4.5 text-amber-500" />}
            {item.type === "service" && <Briefcase className="h-4.5 w-4.5 text-rose-500" />}
            {item.type === "call" && <PhoneCall className="h-4.5 w-4.5 text-cyan-500" />}
            {item.type === "navigation" && <Compass className="h-4.5 w-4.5 text-primary" />}
          </div>
          <div className="min-w-0 space-y-1">
            <div className="flex items-center gap-2">
              <span className="text-sm font-semibold text-foreground group-hover:text-primary transition-colors truncate">
                {item.title}
              </span>
              {item.badge && (
                <Badge variant="outline" className="text-[10px] py-0 px-1.5 h-4.5 font-normal">
                  {item.badge}
                </Badge>
              )}
            </div>
            {item.description && (
              <p className="text-xs text-muted-foreground line-clamp-2 leading-relaxed">
                {item.description}
              </p>
            )}
            <div className="flex items-center gap-3 text-[11px] text-muted-foreground/80 pt-0.5">
              {item.metadata && <span>{item.metadata}</span>}
              {item.timestamp && (
                <>
                  <span>•</span>
                  <span>{item.timestamp}</span>
                </>
              )}
            </div>
          </div>
        </div>
        <div className="flex items-center gap-1 shrink-0 ml-3 text-xs font-medium text-muted-foreground/60 group-hover:text-primary transition-colors">
          <span className="hidden sm:inline">Open</span>
          <ArrowRight className="h-3.5 w-3.5 transition-transform group-hover:translate-x-0.5" />
        </div>
      </Link>
    );
  };

  return (
    <div className="flex flex-col flex-1 min-h-0 w-full space-y-6 animate-fade-in max-w-5xl mx-auto">
      {/* ── Page Header ── */}
      <div className="space-y-1">
        <PageTitle
          title="Global Search"
          description="Find real customer profiles, appointment records, knowledge documents, and system navigation."
        />
      </div>

      {/* ── Search Input Box ── */}
      <div className="relative flex items-center w-full rounded-2xl border border-border/80 bg-card shadow-sm px-4 py-2.5 focus-within:ring-2 focus-within:ring-primary/20 focus-within:border-primary transition-all">
        <Search className="h-5 w-5 text-muted-foreground/70 shrink-0 mr-3" />
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search by contact name, email, phone, appointment, FAQ, or service..."
          className="w-full bg-transparent text-sm sm:text-base text-foreground placeholder:text-muted-foreground/60 outline-none border-none"
          autoFocus
        />
        {isLoading && <Loader2 className="h-4 w-4 text-primary animate-spin shrink-0 mx-2" />}
        {query && !isLoading && (
          <button
            type="button"
            onClick={() => setQuery("")}
            className="p-1 rounded-md text-muted-foreground/60 hover:text-foreground hover:bg-muted transition-colors cursor-pointer mr-2"
            aria-label="Clear search query"
          >
            <X className="h-4 w-4" />
          </button>
        )}
        <kbd className="hidden sm:inline-flex items-center gap-0.5 text-[10px] font-mono bg-muted px-2 py-0.5 rounded border border-border text-muted-foreground">
          ⌘K
        </kbd>
      </div>

      {/* ── Category Filter Tabs ── */}
      {query.trim().length >= 2 && !errorMsg && (
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          {categoriesConfig.map((cat) => {
            const Icon = cat.icon;
            const isActive = activeCategory === cat.key;
            return (
              <button
                key={cat.key}
                type="button"
                onClick={() => setActiveCategory(cat.key)}
                className={cn(
                  "inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-medium transition-all whitespace-nowrap cursor-pointer border",
                  isActive
                    ? "bg-primary text-primary-foreground border-primary shadow-2xs"
                    : "bg-muted/40 text-muted-foreground hover:bg-muted hover:text-foreground border-border/60"
                )}
              >
                <Icon className="h-3.5 w-3.5" />
                <span>{cat.label}</span>
                <span
                  className={cn(
                    "text-[10px] px-1.5 py-0.2 rounded-full",
                    isActive
                      ? "bg-primary-foreground/20 text-primary-foreground"
                      : "bg-muted text-muted-foreground"
                  )}
                >
                  {cat.count}
                </span>
              </button>
            );
          })}
        </div>
      )}

      {/* ── Results Container ── */}
      <div className="space-y-4">
        {/* State 1: Idle (Query empty or < 2 characters) */}
        {query.trim().length < 2 && (
          <div className="py-12 px-6 rounded-2xl border border-dashed border-border/80 bg-card/50 text-center space-y-4">
            <div className="inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-primary/10 text-primary mb-1">
              <Sparkles className="h-6 w-6" />
            </div>
            <h3 className="text-base font-semibold text-foreground">
              Search Operator Resources
            </h3>
            <p className="text-xs text-muted-foreground max-w-md mx-auto leading-relaxed">
              Type at least 2 characters to search across authorized customer contacts, scheduled appointments, knowledge base articles, FAQs, and voice call logs.
            </p>
            <div className="pt-4 grid grid-cols-1 sm:grid-cols-3 gap-2.5 max-w-xl mx-auto text-left">
              <div className="p-3 rounded-xl bg-card border border-border/60">
                <Users className="h-4 w-4 text-emerald-500 mb-1" />
                <div className="text-xs font-medium text-foreground">Contacts</div>
                <div className="text-[11px] text-muted-foreground">Search by name, phone, email</div>
              </div>
              <div className="p-3 rounded-xl bg-card border border-border/60">
                <Calendar className="h-4 w-4 text-blue-500 mb-1" />
                <div className="text-xs font-medium text-foreground">Appointments</div>
                <div className="text-[11px] text-muted-foreground">Search bookings & clients</div>
              </div>
              <div className="p-3 rounded-xl bg-card border border-border/60">
                <BookOpen className="h-4 w-4 text-purple-500 mb-1" />
                <div className="text-xs font-medium text-foreground">Knowledge & FAQs</div>
                <div className="text-[11px] text-muted-foreground">Search documents & answers</div>
              </div>
            </div>
          </div>
        )}

        {/* State 2: Error */}
        {errorMsg && (
          <div className="py-12 px-6 rounded-2xl border border-rose-500/20 bg-rose-500/5 text-center space-y-3">
            <div className="inline-flex h-12 w-12 items-center justify-center rounded-full bg-rose-500/10 text-rose-500 mb-1">
              <AlertCircle className="h-6 w-6" />
            </div>
            <h3 className="text-base font-semibold text-foreground">Search Error</h3>
            <p className="text-xs text-muted-foreground max-w-sm mx-auto leading-relaxed">
              {errorMsg}
            </p>
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                const q = query;
                setQuery("");
                setTimeout(() => setQuery(q), 50);
              }}
            >
              Try Again
            </Button>
          </div>
        )}

        {/* State 3: No Results */}
        {query.trim().length >= 2 && !isLoading && !errorMsg && totalResultsCount === 0 && (
          <div className="py-14 px-6 rounded-2xl border border-border/80 bg-card text-center space-y-3">
            <div className="inline-flex h-12 w-12 items-center justify-center rounded-full bg-muted text-muted-foreground mb-1">
              <Search className="h-6 w-6" />
            </div>
            <h3 className="text-base font-semibold text-foreground">
              No results found for &ldquo;{query}&rdquo;
            </h3>
            <p className="text-xs text-muted-foreground max-w-sm mx-auto leading-relaxed">
              We couldn&apos;t find any records matching your search in the authorized organization data.
            </p>
            <div className="pt-2 text-xs text-muted-foreground/80 space-y-1">
              <div>Suggestions:</div>
              <ul className="text-[11px] text-muted-foreground space-y-0.5">
                <li>• Verify the spelling of the customer name or phone number</li>
                <li>• Try searching by email domain or keyword</li>
                <li>• Ensure the resource hasn&apos;t been archived</li>
              </ul>
            </div>
          </div>
        )}

        {/* State 4: Results Display */}
        {query.trim().length >= 2 && !errorMsg && totalResultsCount > 0 && (
          <div className="space-y-6">
            {/* Contacts & Leads */}
            {(activeCategory === "all" || activeCategory === "contacts") &&
              results.contacts.length > 0 && (
                <div className="space-y-2.5">
                  <div className="flex items-center justify-between text-xs font-semibold text-foreground uppercase tracking-wider px-1">
                    <span className="flex items-center gap-2">
                      <Users className="h-4 w-4 text-emerald-500" /> Contacts & Leads ({results.contacts.length})
                    </span>
                  </div>
                  <div className="grid grid-cols-1 gap-2">
                    {results.contacts.map(renderResultCard)}
                  </div>
                </div>
              )}

            {/* Appointments */}
            {(activeCategory === "all" || activeCategory === "appointments") &&
              results.appointments.length > 0 && (
                <div className="space-y-2.5">
                  <div className="flex items-center justify-between text-xs font-semibold text-foreground uppercase tracking-wider px-1">
                    <span className="flex items-center gap-2">
                      <Calendar className="h-4 w-4 text-blue-500" /> Appointments ({results.appointments.length})
                    </span>
                  </div>
                  <div className="grid grid-cols-1 gap-2">
                    {results.appointments.map(renderResultCard)}
                  </div>
                </div>
              )}

            {/* Knowledge Base */}
            {(activeCategory === "all" || activeCategory === "knowledge") &&
              results.knowledge.length > 0 && (
                <div className="space-y-2.5">
                  <div className="flex items-center justify-between text-xs font-semibold text-foreground uppercase tracking-wider px-1">
                    <span className="flex items-center gap-2">
                      <BookOpen className="h-4 w-4 text-purple-500" /> Knowledge Base Documents ({results.knowledge.length})
                    </span>
                  </div>
                  <div className="grid grid-cols-1 gap-2">
                    {results.knowledge.map(renderResultCard)}
                  </div>
                </div>
              )}

            {/* FAQs */}
            {(activeCategory === "all" || activeCategory === "faqs") &&
              results.faqs.length > 0 && (
                <div className="space-y-2.5">
                  <div className="flex items-center justify-between text-xs font-semibold text-foreground uppercase tracking-wider px-1">
                    <span className="flex items-center gap-2">
                      <HelpCircle className="h-4 w-4 text-amber-500" /> Frequently Asked Questions ({results.faqs.length})
                    </span>
                  </div>
                  <div className="grid grid-cols-1 gap-2">
                    {results.faqs.map(renderResultCard)}
                  </div>
                </div>
              )}

            {/* Services */}
            {(activeCategory === "all" || activeCategory === "services") &&
              results.services.length > 0 && (
                <div className="space-y-2.5">
                  <div className="flex items-center justify-between text-xs font-semibold text-foreground uppercase tracking-wider px-1">
                    <span className="flex items-center gap-2">
                      <Briefcase className="h-4 w-4 text-rose-500" /> Services & Offerings ({results.services.length})
                    </span>
                  </div>
                  <div className="grid grid-cols-1 gap-2">
                    {results.services.map(renderResultCard)}
                  </div>
                </div>
              )}

            {/* Voice Calls */}
            {(activeCategory === "all" || activeCategory === "calls") &&
              results.calls.length > 0 && (
                <div className="space-y-2.5">
                  <div className="flex items-center justify-between text-xs font-semibold text-foreground uppercase tracking-wider px-1">
                    <span className="flex items-center gap-2">
                      <PhoneCall className="h-4 w-4 text-cyan-500" /> Voice Call History ({results.calls.length})
                    </span>
                  </div>
                  <div className="grid grid-cols-1 gap-2">
                    {results.calls.map(renderResultCard)}
                  </div>
                </div>
              )}

            {/* Navigation */}
            {(activeCategory === "all" || activeCategory === "navigation") &&
              results.navigation.length > 0 && (
                <div className="space-y-2.5">
                  <div className="flex items-center justify-between text-xs font-semibold text-foreground uppercase tracking-wider px-1">
                    <span className="flex items-center gap-2">
                      <Compass className="h-4 w-4 text-primary" /> Application Navigation ({results.navigation.length})
                    </span>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    {results.navigation.map(renderResultCard)}
                  </div>
                </div>
              )}
          </div>
        )}
      </div>
    </div>
  );
}
