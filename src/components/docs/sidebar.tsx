"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { cn } from "@/components/shared/utils";
import { SIDEBAR } from "@/lib/docs-data";
import { Suspense } from "react";
import { Badge } from "@/components/shared/badge";

interface DocsSidebarProps {
  onSelect?: () => void;
}

function SidebarContent({ onSelect }: DocsSidebarProps) {
  const searchParams = useSearchParams();
  const activeId = searchParams.get("id") || "introduction";

  return (
    <nav className="w-full space-y-space-6 text-sm" aria-label="Documentation sidebar">
      {SIDEBAR.map((group, index) => (
        <div key={index} className="space-y-space-2">
          <div className="flex items-center gap-space-2 px-space-2 py-space-1 text-xs font-semibold text-foreground uppercase tracking-wider">
            <group.icon className="h-3.5 w-3.5 text-primary shrink-0" aria-hidden="true" />
            <span>{group.section}</span>
          </div>

          <div className="grid grid-flow-row auto-rows-max gap-0.5">
            {group.items.map((item) => {
              const isActive = activeId === item.id;
              return (
                <Link
                  key={item.id}
                  href={`/docs?id=${item.id}`}
                  onClick={onSelect}
                  className={cn(
                    "flex w-full items-center justify-between rounded-lg px-space-3 py-space-2 text-xs font-medium transition-colors",
                    isActive
                      ? "bg-primary text-primary-foreground font-semibold shadow-xs"
                      : "text-muted-foreground hover:text-foreground hover:bg-[hsl(var(--foreground)/0.04)]"
                  )}
                  aria-current={isActive ? "page" : undefined}
                >
                  <span className="truncate">{item.label}</span>
                  {item.badge && (
                    <Badge variant={isActive ? "secondary" : "soft"} className="text-[10px] ml-space-2">
                      {item.badge}
                    </Badge>
                  )}
                </Link>
              );
            })}
          </div>
        </div>
      ))}
    </nav>
  );
}

export function DocsSidebar({ onSelect }: DocsSidebarProps) {
  return (
    <Suspense fallback={<div className="w-full h-full animate-pulse bg-muted/20 rounded-md" />}>
      <SidebarContent onSelect={onSelect} />
    </Suspense>
  );
}