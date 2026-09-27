export default function DashboardRootLoading() {
  return (
    <div className="w-full space-y-6 animate-pulse p-6">
      {/* Header skeleton */}
      <div className="flex items-center justify-between pb-6 border-b border-border/40">
        <div className="space-y-2">
          <div className="h-7 w-48 rounded-lg bg-muted/60" />
          <div className="h-4 w-72 rounded-md bg-muted/40" />
        </div>
        <div className="flex items-center gap-3">
          <div className="h-9 w-24 rounded-full bg-muted/50" />
          <div className="h-9 w-32 rounded-full bg-muted/50" />
        </div>
      </div>

      {/* Metrics Row skeleton */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {[1, 2, 3, 4].map((i) => (
          <div
            key={i}
            className="rounded-xl border border-border/50 bg-card/60 p-5 space-y-3"
          >
            <div className="flex items-center justify-between">
              <div className="h-4 w-24 rounded bg-muted/60" />
              <div className="h-8 w-8 rounded-lg bg-muted/50" />
            </div>
            <div className="h-8 w-32 rounded bg-muted/70" />
            <div className="h-3 w-40 rounded bg-muted/40" />
          </div>
        ))}
      </div>

      {/* Main Content Area skeleton */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 pt-2">
        <div className="lg:col-span-2 rounded-xl border border-border/50 bg-card/60 p-6 space-y-4 min-h-[360px]">
          <div className="h-5 w-40 rounded bg-muted/60" />
          <div className="space-y-3 pt-4">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="h-12 w-full rounded-lg bg-muted/30" />
            ))}
          </div>
        </div>
        <div className="rounded-xl border border-border/50 bg-card/60 p-6 space-y-4 min-h-[360px]">
          <div className="h-5 w-36 rounded bg-muted/60" />
          <div className="space-y-3 pt-4">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-16 w-full rounded-lg bg-muted/30" />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
