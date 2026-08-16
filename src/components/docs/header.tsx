"use client";

import * as React from "react";
import Link from "next/link";
import { Search, Sun, Moon } from "lucide-react";
import { useTheme } from "next-themes";
import { Logo } from "@/components/shared/logo";
import { Button } from "@/components/shared/button";
import { DocsSearch } from "@/components/docs/search";

export function DocsHeader() {
  const { resolvedTheme, setTheme } = useTheme();
  const [mounted, setMounted] = React.useState(false);

  React.useEffect(() => {
    setMounted(true);
  }, []);

  const toggleTheme = () => {
    setTheme(resolvedTheme === "dark" ? "light" : "dark");
  };

  return (
    <header className="sticky top-space-0 z-50 w-full border-b border-[hsl(var(--foreground)/0.08)] bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="container mx-auto px-space-4 md:px-space-8 max-w-screen-2xl flex h-14 items-center justify-between">
        <div className="flex items-center gap-space-6">
          <Link href="/docs" className="flex items-center gap-space-2">
            <Logo />
            <span className="text-sm font-semibold text-muted-foreground hidden sm:inline-block border-l border-[hsl(var(--foreground)/0.08)] pl-space-2 ml-space-2">
              Documentation
            </span>
          </Link>
        </div>
        
        <div className="flex items-center gap-space-4">
          <DocsSearch />

          <Button variant="ghost" size="icon" className="text-muted-foreground hover:text-foreground hover:bg-transparent" onClick={toggleTheme} aria-label="Toggle theme">
            {mounted && resolvedTheme === "dark" ? (
              <Sun className="h-4 w-4" />
            ) : (
              <Moon className="h-4 w-4" />
            )}
          </Button>

          <Button variant="outline" size="sm" className="text-xs border-[hsl(var(--foreground)/0.08)] hidden sm:flex">
            Dashboard
          </Button>
        </div>
      </div>
    </header>
  );
}
