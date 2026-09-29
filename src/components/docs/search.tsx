"use client";

import { useEffect, useState } from "react";
import { Command } from "cmdk";
import { Search, FileText } from "lucide-react";
import { useRouter } from "next/navigation";
import { SIDEBAR, DOC_CONTENT } from "@/lib/docs-data";
import { Button } from "@/components/shared/button";
import { ScrollArea } from "@/components/ui/scroll-area";

export function DocsSearch() {
  const [open, setOpen] = useState(false);
  const router = useRouter();

  useEffect(() => {
    const down = (e: KeyboardEvent) => {
      if (e.key === "k" && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        setOpen((prev) => !prev);
      }
    };

    document.addEventListener("keydown", down);
    return () => document.removeEventListener("keydown", down);
  }, []);

  return (
    <>
      <Button
        variant="outline"
        size="sm"
        className="hidden sm:flex w-56 md:w-64 justify-start text-muted-foreground border-[hsl(var(--foreground)/0.08)] hover:bg-[hsl(var(--foreground)/0.04)]"
        onClick={() => setOpen(true)}
      >
        <Search className="h-3.5 w-3.5 mr-space-2 text-muted-foreground" />
        <span className="text-xs">Search documentation...</span>
        <kbd className="pointer-events-none ml-auto inline-flex h-5 select-none items-center gap-space-0.5 rounded border border-[hsl(var(--foreground)/0.08)] bg-[hsl(var(--foreground)/0.04)] px-space-1.5 font-mono text-[10px] font-medium text-muted-foreground">
          <span>⌘</span>K
        </kbd>
      </Button>

      <Button
        variant="ghost"
        size="icon"
        className="sm:hidden text-foreground hover:bg-[hsl(var(--foreground)/0.04)]"
        onClick={() => setOpen(true)}
        aria-label="Search documentation"
      >
        <Search className="h-5 w-5" />
      </Button>

      <Command.Dialog
        open={open}
        onOpenChange={setOpen}
        label="Search Documentation"
        className="fixed top-[15%] left-1/2 -translate-x-1/2 w-full max-w-2xl bg-background border border-[hsl(var(--foreground)/0.12)] rounded-xl shadow-2xl overflow-hidden z-50 flex flex-col"
        contentClassName="fixed inset-space-0 bg-background/80 backdrop-blur-sm z-50"
      >
        <div className="flex items-center border-b border-[hsl(var(--foreground)/0.08)] px-space-4">
          <Search className="h-5 w-5 text-muted-foreground shrink-0" />
          <Command.Input
            placeholder="Search docs, APIs, webhooks, or guides..."
            className="flex h-14 w-full rounded-md bg-transparent px-space-3 py-space-3 text-sm outline-none placeholder:text-muted-foreground text-foreground"
          />
        </div>

        <Command.List className="p-space-2 max-h-[60vh] overflow-y-auto">
          <ScrollArea className="h-full w-full" horizontal={false}>
            <Command.Empty className="py-space-8 text-center text-sm text-muted-foreground">
              No matching documentation topics found.
            </Command.Empty>

            {SIDEBAR.map((section) => (
              <Command.Group
                key={section.section}
                heading={section.section}
                className="px-space-2 py-space-1.5 text-xs font-semibold text-muted-foreground"
              >
                {section.items.map((item) => {
                  const doc = DOC_CONTENT[item.id];
                  const searchString = `${item.label} ${section.section} ${doc?.description || ""} ${
                    doc?.toc?.map((t) => t.title).join(" ") || ""
                  }`;

                  return (
                    <Command.Item
                      key={item.id}
                      value={searchString}
                      onSelect={() => {
                        setOpen(false);
                        router.push(`/docs?id=${item.id}`);
                      }}
                      className="flex flex-col gap-0.5 cursor-pointer rounded-lg px-space-3 py-space-2 text-sm text-foreground aria-selected:bg-primary/10 aria-selected:text-primary transition-colors my-0.5"
                    >
                      <div className="flex items-center gap-space-2 font-medium">
                        <FileText className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                        <span>{item.label}</span>
                      </div>
                      {doc?.description && (
                        <p className="text-xs text-muted-foreground line-clamp-1 pl-5">
                          {doc.description}
                        </p>
                      )}
                    </Command.Item>
                  );
                })}
              </Command.Group>
            ))}
          </ScrollArea>
        </Command.List>
      </Command.Dialog>
    </>
  );
}
