export default function BillingLoading() {
  return (
    <div className="space-y-space-6 animate-pulse w-full">
      <div className="space-y-space-2">
        <div className="h-7 w-48 radius-md bg-muted" />
        <div className="h-4 w-72 radius-md bg-muted" />
      </div>
      <div className="grid gap-space-4 sm:grid-cols-3">
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="h-40 radius-xl border border-border bg-card/30" />
        ))}
      </div>
      <div className="h-64 radius-xl border border-border bg-card/30" />
    </div>
  );
}
