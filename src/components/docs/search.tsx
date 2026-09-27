"use client";

import { useEffect, useState } from "react";
import { Command } from "cmdk";
import { Search, FileText } from "lucide-react";
import { useRouter } from "next/navigation";
import { SIDEBAR } from "@/lib/docs-data";
import { Dialog, DialogContent } from "@radix-ui/react-dialog";
import { Button } from "@/components/shared/button";
import { cn } from "@/components/shared/utils";
import { ScrollArea } from "@/components/ui/scroll-area";

export function DocsSearch() {
  const [open, setOpen] = useState(false);
  const router = useRouter();

  useEffect(() => {
    const down = (e: KeyboardEvent) => {
      if (e.key === "k" && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        setOpen((open) => !open);
      }
    };

    document.addEventListener("keydown", down);
    return () => document.removeEventListener("keydown", down);
  }, []);

  const allItems = SIDEBAR.flatMap((section) => 
    section.items.map(item => ({ ...item, section: section.section }))
  );

  return (
    <>
      <Button variant="outline" size="sm" className="hidden sm:flex w-64 justify-start text-muted-foreground border-[hsl(var(--foreground)/0.08)] hover:bg-[hsl(var(--foreground)/0.04)]" onClick={() => setOpen(true)}
      >
        <Search className="h-4 w-4" />
        <span className="text-xs">Search documentation...</span>
        <kbd className="pointer-events-none ml-auto inline-flex h-5 select-none items-center gap-space-1 rounded border border-[hsl(var(--foreground)/0.08)] bg-[hsl(var(--foreground)/0.04)] px-space-1.5 font-mono text-caption font-medium opacity-100">
          <span className="text-xs">⌘</span>K
        </kbd>
      </Button>
      
      <Button variant="ghost" size="icon" className="sm:hidden text-foreground" onClick={() => setOpen(true)} aria-label="Search documentation">
        <Search className="h-5 w-5" />
      </Button>

      <Command.Dialog 
        open={open} 
        onOpenChange={setOpen}
        label="Search Documentation"
        className="fixed top-[20%] left-1/2 -translate-x-1/2 w-full max-w-2xl bg-background border border-[hsl(var(--foreground)/0.08)] rounded-xl shadow-2xl overflow-hidden z-50 flex flex-col"
        contentClassName="fixed inset-space-0 bg-background/80 backdrop-blur-sm z-50"
      >
        <div className="flex items-center border-b border-[hsl(var(--foreground)/0.08)] px-space-3">
          <Search className="h-5 w-5 text-muted-foreground" />
          <Command.Input 
            placeholder="Search documentation..." 
            className="flex h-14 w-full rounded-md bg-transparent px-space-3 py-space-3 text-base outline-none placeholder:text-muted-foreground text-foreground"
          />
        </div>
        
        <Command.List className="p-space-2" style={{ maxHeight: `60vh` }}><ScrollArea className="h-full w-full" horizontal={false}>
                        <Command.Empty className="py-space-6 text-center text-sm text-muted-foreground">
                          No results found.
                        </Command.Empty>

                        {SIDEBAR.map((section) => (
                          <Command.Group 
                            key={section.section} 
                            heading={section.section}
                            className="px-space-2 py-space-1.5 text-xs font-medium text-muted-foreground"
                          >
                            {section.items.map((item) => (
                              <Command.Item
                                key={item.id}
                                value={item.label}
                                onSelect={() => {
                                  setOpen(false);
                                  router.push(`/docs?id=${item.id}`);
                                }}
                                className="flex items-center gap-space-2 cursor-pointer rounded-sm px-space-2 py-space-2 text-sm text-foreground aria-selected:bg-[hsl(var(--foreground)/0.04)] aria-selected:text-foreground mt-space-1"
                              >
                                <FileText className="h-4 w-4 text-muted-foreground" />
                                {item.label}
                              </Command.Item>
                            ))}
                          </Command.Group>
                        ))}
                      </ScrollArea></Command.List>
      </Command.Dialog>
    </>
  );
}
