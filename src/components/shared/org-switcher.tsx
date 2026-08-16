"use client";

import * as React from "react";
import { useState, useEffect, useTransition } from "react";
import { useRouter } from "next/navigation";
import { 
  Building2, 
  Check, 
  ChevronDown, 
  Plus, 
  Loader2, 
  Sparkles, 
  ShieldCheck,
  Briefcase
} from "lucide-react";
import * as DropdownMenu from "@radix-ui/react-dropdown-menu";
import { getUserOrganizationsAction, switchOrganizationAction } from "@/server/actions/auth";
import { cn } from "@/components/shared/utils";

interface OrganizationItem {
  id: string;
  name: string;
  slug: string;
  industry: string | null;
  logoUrl: string | null;
  plan?: string | null;
  role: string;
  isCurrent: boolean;
}

interface OrgSwitcherProps {
  currentOrgName?: string;
  currentOrgIndustry?: string | null;
  roleLabel?: string;
  className?: string;
}

export function OrgSwitcher({
  currentOrgName,
  currentOrgIndustry,
  roleLabel = "Member",
  className,
}: OrgSwitcherProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [isOpen, setIsOpen] = useState(false);
  const [organizations, setOrganizations] = useState<OrganizationItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [switchingId, setSwitchingId] = useState<string | null>(null);

  const fetchOrganizations = async () => {
    try {
      setLoading(true);
      const res = await getUserOrganizationsAction();
      if (res.success && res.organizations) {
        setOrganizations(res.organizations);
      }
    } catch (err) {
      console.error("Failed to load user organizations:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchOrganizations();
  }, []);

  const handleSwitch = async (orgId: string) => {
    if (switchingId || isPending) return;
    setSwitchingId(orgId);
    try {
      const res = await switchOrganizationAction(orgId);
      if (res.success) {
        setIsOpen(false);
        startTransition(() => {
          router.refresh();
        });
      }
    } catch (err) {
      console.error("Error switching organization context:", err);
    } finally {
      setSwitchingId(null);
    }
  };

  const currentOrg = organizations.find((o) => o.isCurrent) || {
    name: currentOrgName || "My Workspace",
    industry: currentOrgIndustry,
    role: roleLabel,
  };

  return (
    <DropdownMenu.Root open={isOpen} onOpenChange={setIsOpen}>
      <DropdownMenu.Trigger asChild>
        <button
          className={cn(
            "flex items-center gap-space-2.5 px-space-2.5 py-space-1.5 rounded-lg border border-[hsl(var(--foreground)/0.08)] bg-card hover:bg-[hsl(var(--foreground)/0.04)] text-left transition-all duration-200 cursor-pointer select-none focus:outline-none focus-visible:ring-2 focus-visible:ring-primary/40",
            className
          )}
          aria-label="Switch organization"
        >
          <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md bg-primary/10 text-primary border border-primary/20 font-bold text-caption">
            {currentOrg.name ? currentOrg.name.charAt(0).toUpperCase() : "O"}
          </div>
          <div className="flex flex-col min-w-0 pr-1 text-left hidden sm:flex">
            <span className="text-body-sm font-semibold text-foreground truncate max-w-[130px] leading-tight">
              {currentOrg.name}
            </span>
            <span className="text-[10px] text-muted-foreground truncate leading-tight mt-0.5">
              {currentOrg.industry || roleLabel}
            </span>
          </div>
          {isPending || switchingId ? (
            <Loader2 className="h-3.5 w-3.5 animate-spin text-muted-foreground shrink-0 ml-auto" />
          ) : (
            <ChevronDown className={cn("h-3.5 w-3.5 text-muted-foreground shrink-0 transition-transform duration-200 ml-auto", isOpen && "rotate-180")} />
          )}
        </button>
      </DropdownMenu.Trigger>

      <DropdownMenu.Portal>
        <DropdownMenu.Content
          align="start"
          sideOffset={8}
          className="z-[100] w-64 overflow-hidden rounded-xl border border-border bg-popover p-1.5 shadow-xl animate-in fade-in-50 zoom-in-95 duration-150"
        >
          <div className="px-2.5 py-2 border-b border-[hsl(var(--foreground)/0.06)]">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider">
                Workspaces ({organizations.length || 1})
              </span>
              <span className="text-[10px] px-1.5 py-0.5 rounded bg-primary/10 text-primary font-medium">
                Multi-Tenant
              </span>
            </div>
          </div>

          <div className="py-1 max-h-56 overflow-y-auto sidebar-scroll">
            {organizations.length === 0 && loading ? (
              <div className="flex items-center justify-center py-4 text-caption text-muted-foreground gap-2">
                <Loader2 className="h-4 w-4 animate-spin text-primary" />
                <span>Loading workspaces...</span>
              </div>
            ) : (
              organizations.map((org) => {
                const isSelected = org.isCurrent;
                const isThisSwitching = switchingId === org.id;

                return (
                  <DropdownMenu.Item
                    key={org.id}
                    onClick={() => handleSwitch(org.id)}
                    disabled={isSelected || !!switchingId}
                    className={cn(
                      "flex items-center justify-between gap-2 px-2.5 py-2 rounded-lg text-body-sm cursor-pointer select-none outline-none transition-colors",
                      isSelected
                        ? "bg-primary/10 text-primary font-medium"
                        : "text-foreground hover:bg-[hsl(var(--foreground)/0.05)] hover:text-foreground",
                      isThisSwitching && "opacity-70"
                    )}
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      <div
                        className={cn(
                          "flex h-6 w-6 shrink-0 items-center justify-center rounded text-[11px] font-bold",
                          isSelected
                            ? "bg-primary text-primary-foreground"
                            : "bg-[hsl(var(--foreground)/0.08)] text-foreground/80"
                        )}
                      >
                        {org.name ? org.name.charAt(0).toUpperCase() : "O"}
                      </div>
                      <div className="flex flex-col min-w-0">
                        <span className="text-body-sm font-semibold truncate max-w-[140px] leading-tight">
                          {org.name}
                        </span>
                        <span className="text-[10px] text-muted-foreground capitalize leading-tight mt-0.5">
                          {org.role} {org.industry ? `• ${org.industry}` : ""}
                        </span>
                      </div>
                    </div>

                    {isThisSwitching ? (
                      <Loader2 className="h-3.5 w-3.5 animate-spin text-primary shrink-0" />
                    ) : isSelected ? (
                      <Check className="h-4 w-4 text-primary shrink-0" />
                    ) : null}
                  </DropdownMenu.Item>
                );
              })
            )}
          </div>

          <div className="h-px bg-[hsl(var(--foreground)/0.06)] my-1" />

          <DropdownMenu.Item
            onClick={() => router.push("/onboarding")}
            className="flex items-center gap-2 px-2.5 py-2 rounded-lg text-body-sm text-foreground/80 hover:text-foreground hover:bg-[hsl(var(--foreground)/0.05)] transition-colors cursor-pointer select-none outline-none font-medium"
          >
            <Plus className="h-4 w-4 text-muted-foreground" />
            <span>Create New Workspace</span>
          </DropdownMenu.Item>
        </DropdownMenu.Content>
      </DropdownMenu.Portal>
    </DropdownMenu.Root>
  );
}
