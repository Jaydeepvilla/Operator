"use client";;
import Link from"next/link";
import { usePathname } from"next/navigation";
import { useState, useEffect } from"react";
import { useTheme } from"next-themes";
import { Show } from "@/lib/auth/client";
import { UserAvatarMenu } from "@/components/shared/user-avatar-menu";
import { Logo } from "@/components/shared/logo";
import { Menu, X, Sun, Moon, ArrowRight } from"lucide-react";
import { Button } from"@/components/shared/button";

import { getButtonClasses } from '@/design-system/button-tokens';

const NAV_LINKS = [
 { label:"Features", href:"/features"},
 { label:"Pricing", href:"/pricing"},
 { label:"Integrations", href:"/integrations"},
 { label:"Docs", href:"/docs"},
 { label:"Changelog", href:"/changelog"},
];

export function MarketingNav() {
 const pathname = usePathname();
 const [mobileOpen, setMobileOpen] = useState(false);
 const { resolvedTheme, setTheme } = useTheme();
 const [isScrolled, setIsScrolled] = useState(false);
 const [mounted, setMounted] = useState(false);

 useEffect(() => {
 setMounted(true);
 const handleScroll = () => {
 setIsScrolled(window.scrollY > 10);
 };
 window.addEventListener("scroll", handleScroll);
 handleScroll();
 return () => window.removeEventListener("scroll", handleScroll);
 }, []);

 return (
  <header
  className={`left-space-0 right-space-0 z-50 w-full transition-all duration-300 ${isScrolled
  ?"fixed top-space-0 pt-space-2 px-space-6"
  :"absolute top-space-0 pt-space-5 px-space-6"
  }`}
  >
   <div
   className={`mx-auto max-w-5xl rounded-full px-space-6 transition-all duration-300 ${isScrolled
   ?"bg-card/85 backdrop-blur-md border border-border-muted"
   :"bg-transparent border border-transparent"
   }`}
   >
   <div className="flex h-14 items-center justify-between">
   {/* Logo */}
   <Link href="/" className="shrink-0">
     <Logo />
   </Link>

   {/* Desktop nav */}
   <nav className="hidden md:flex items-center gap-space-1">
   {NAV_LINKS.map((item) => (
   <Link
   key={item.href}
   href={item.href}
   className={`px-space-4 py-space-2 rounded-full text-body-sm transition-all ${pathname === item.href
   ?"text-primary bg-primary/5 font-medium"
   :"text-muted-foreground hover:text-foreground hover:bg-[hsl(var(--foreground)/0.03)]"
   }`}
   >
   {item.label}
   </Link>
   ))}
   </nav>

   {/* Desktop right */}
   <div className="hidden md:flex items-center gap-space-2">
   {/* Theme toggle */}
   <Button variant="ghost" size="icon" shape="circle" onClick={() => setTheme(resolvedTheme ==="dark"?"light":"dark")}
   className="h-8 w-8 text-muted-foreground hover:text-foreground hover:bg-transparent transition-colors"
   aria-label="Toggle theme"
   >
   {mounted && resolvedTheme ==="dark"? (
   <Sun className="h-4 w-4"/>
   ) : (
   <Moon className="h-4 w-4"/>
   )}
   </Button>

   {/* Auth controls: show sign-in/up when signed out, dashboard+avatar when signed in */}
   <Show when="signed-out">
   <Button asChild size="sm">
   <Link href="/sign-up" className="flex items-center gap-space-1">Get started <ArrowRight className="h-3.5 w-3.5"/></Link>
   </Button>
   </Show>

   <Show when="signed-in">
   <Link
   href="/dashboard"
   className="text-body-sm text-muted-foreground hover:text-foreground transition-colors px-space-3 py-space-2"
   >
   Dashboard
   </Link>
   <UserAvatarMenu avatarClass="h-8 w-8" />
   </Show>
   </div>

   {/* Mobile toggle */}
   <Button variant="ghost" size="icon" className="md:hidden text-muted-foreground hover:text-foreground hover:bg-[hsl(var(--foreground)/0.04)]" onClick={() => setMobileOpen(!mobileOpen)}
   aria-label="Toggle menu"
   >
   {mobileOpen ? <X className="h-5 w-5"/> : <Menu className="h-5 w-5"/>}
   </Button>
   </div>

   {/* Mobile menu */}
   {mobileOpen && (
   <div className="md:hidden border-t border-[hsl(var(--foreground)/0.06)] py-space-4 space-y-space-1">
   {NAV_LINKS.map((item) => (
   <Link
   key={item.href}
   href={item.href}
   onClick={() => setMobileOpen(false)}
   className="block px-space-3 py-space-2 text-body-sm text-muted-foreground hover:text-foreground radius-md transition-colors"
   >
   {item.label}
   </Link>
   ))}
   {[
   ["Demo","/demo"],
   ["Contact","/contact"],
   ["Integrations","/integrations"],
   ].map(([label, href]) => (
   <Link
   key={href}
   href={href}
   onClick={() => setMobileOpen(false)}
   className="block px-space-3 py-space-2 text-body-sm text-muted-foreground hover:text-foreground radius-md transition-colors"
   >
   {label}
   </Link>
   ))}
   <div className="h-px bg-[hsl(var(--foreground)/0.06)] my-space-3"/>
   <div className="flex flex-col gap-space-2">
    <Show when="signed-out">
    <Link
    href="/sign-up"
    onClick={() => setMobileOpen(false)}
    className={getButtonClasses('primary', 'filled', 'medium', 'block text-body-sm text-center')}
    >
    Get started
    </Link>
    </Show>
   <Show when="signed-in">
   <Link
   href="/dashboard"
   onClick={() => setMobileOpen(false)}
   className="block px-space-3 py-space-2 text-body-sm text-center text-muted-foreground border border-[hsl(var(--foreground)/0.08)] radius-md"
   >
   Dashboard
   </Link>
   <div className="flex justify-center pt-space-1">
   <UserAvatarMenu />
   </div>
   </Show>
   </div>
   </div>
   )}
   </div>
  </header>
 );
}
