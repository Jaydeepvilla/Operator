export default function AppointmentsLoading() {
  return (
    <div className="w-full space-y-6 animate-pulse p-6">
      <div className="flex items-center justify-between pb-4 border-b border-border/40">
        <div className="space-y-2">
          <div className="h-7 w-44 rounded-lg bg-muted/60" />
          <div className="h-4 w-64 rounded-md bg-muted/40" />
        </div>
        <div className="flex items-center gap-3">
          <div className="h-9 w-28 rounded-full bg-muted/50" />
          <div className="h-9 w-32 rounded-full bg-muted/50" />
        </div>
      </div>
      <div className="rounded-xl border border-border/50 bg-card/60 p-6 space-y-4">
        <div className="h-5 w-48 rounded bg-muted/60" />
        <div className="space-y-3 pt-2">
          {[1, 2, 3, 4, 5].map((i) => (
            <div key={i} className="h-16 w-full rounded-lg bg-muted/30" />
          ))}
        </div>
      </div>
    </div>
  );
}
