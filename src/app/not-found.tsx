import Link from "next/link";
import { ArrowLeft, Home, Compass } from "lucide-react";
import { Button } from "@/components/shared/button";

export default function NotFound() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center text-center p-space-6 bg-background text-foreground">
      <div className="flex h-20 w-20 items-center justify-center radius-full bg-primary/10 text-primary mb-space-6">
        <Compass className="h-10 w-10 animate-pulse" />
      </div>
      <span className="font-mono text-caption text-primary uppercase tracking-widest font-semibold mb-space-2">
        Error 404
      </span>
      <h1 className="text-heading-xl font-bold tracking-tight text-foreground mb-space-3">
        Page not found
      </h1>
      <p className="text-body-md text-muted-foreground max-w-md leading-relaxed mb-space-8">
        Sorry, we couldn&apos;t find the page you&apos;re looking for. It might have been moved, deleted, or never existed.
      </p>
      <div className="flex flex-wrap items-center justify-center gap-space-3">
        <Button asChild id="not-found-dashboard-btn">
          <Link href="/dashboard">
            <Home className="h-4 w-4 mr-2" />
            Dashboard
          </Link>
        </Button>
        <Button asChild variant="outline" id="not-found-back-btn">
          <Link href="/">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Return Home
          </Link>
        </Button>
      </div>
    </div>
  );
}
