/**
 * MetricBar — Reusable labeled metric row for sub-metrics.
 * Shows label + value only, no progress bar track.
 */

interface MetricBarProps {
  label: string;
  value: number;
  colorClass?: string;
  showDot?: boolean;
  empty?: boolean;
  displayValue?: string;
}

function resolveTextColor(value: number, empty?: boolean): string {
  if (empty) return "text-muted-foreground/70";
  if (value >= 90) return "text-[hsl(var(--state-success-text))]";
  if (value >= 70) return "text-[hsl(var(--state-warning-text))]";
  return "text-[hsl(var(--state-error-text))]";
}

function resolveDotColor(value: number, empty?: boolean): string {
  if (empty) return "bg-muted-foreground/30";
  if (value >= 90) return "bg-emerald-500";
  if (value >= 70) return "bg-amber-500";
  return "bg-rose-500";
}

export function MetricBar({ label, value, colorClass, showDot, empty, displayValue }: MetricBarProps) {
  const textColor = resolveTextColor(value, empty);
  const dotColor = colorClass ?? resolveDotColor(value, empty);

  return (
    <div className="flex items-center justify-between py-space-0.5">
      <span className="text-[11px] text-muted-foreground/65 flex items-center gap-1.5 font-medium">
        {showDot && (
          <span
            className={`inline-block w-1.5 h-1.5 rounded-full shrink-0 ${dotColor}`}
            aria-hidden
          />
        )}
        {label}
      </span>
      <span className={`text-[11px] font-bold tabular-nums ${textColor}`}>
        {displayValue ?? `${value}%`}
      </span>
    </div>
  );
}
