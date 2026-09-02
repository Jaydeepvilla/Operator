/**
 * ScoreRing — Reusable radial score visualization.
 *
 * Used by BusinessHealth, AIReadiness, and KnowledgeScore widgets
 * to maintain identical sizing, typography, spacing, and interaction.
 */

interface ScoreRingProps {
  /** 0–100 score value */
  score: number;
  /** Diameter in px (design-system aligned) */
  size?: number;
  /** Ring stroke width */
  strokeWidth?: number;
  /** Optional label under the score */
  label?: string;
  /** Custom text to display inside the ring (e.g. "--" or "Ready") */
  displayValue?: string;
  /** Whether this is an empty/unstarted state */
  empty?: boolean;
  /** Override ring color — defaults to semantic thresholds */
  color?: string;
}

function resolveColor(score: number, empty?: boolean): string {
  if (empty) return "hsl(var(--muted-foreground) / 0.4)";
  if (score >= 90) return "var(--success-500)";
  if (score >= 70) return "var(--warning-500)";
  if (score > 0) return "var(--error-500)";
  return "hsl(var(--muted-foreground) / 0.4)";
}

function resolveTextClass(score: number, empty?: boolean): string {
  if (empty) return "text-muted-foreground";
  if (score >= 90) return "text-success-500";
  if (score >= 70) return "text-warning-500";
  if (score > 0) return "text-error-500";
  return "text-muted-foreground";
}

export function ScoreRing({
  score,
  size = 80,
  strokeWidth = 4,
  label,
  displayValue,
  empty,
  color,
}: ScoreRingProps) {
  const r = (size - strokeWidth * 2) / 2;
  const circ = 2 * Math.PI * r;
  const offset = empty ? circ : circ * (1 - Math.min(score, 100) / 100);
  const ringColor = color ?? resolveColor(score, empty);

  return (
    <div className="relative shrink-0 flex items-center justify-center" style={{ width: size, height: size }}>
      <svg
        width={size}
        height={size}
        className="-rotate-90"
        aria-hidden
        role="presentation"
      >
        {/* Clean light track */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          stroke="var(--neutral-100, #f1f3f5)"
          strokeWidth={strokeWidth}
        />
        {/* Solid value arc */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          stroke={ringColor}
          strokeWidth={strokeWidth}
          strokeLinecap="round"
          strokeDasharray={circ}
          strokeDashoffset={offset}
          style={{
            transition: `stroke-dashoffset var(--duration-slow) var(--ease-smooth)`,
          }}
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span
          className="tabular-nums leading-none text-body-sm font-semibold"
          style={{ color: ringColor }}
          aria-label={`Score: ${displayValue ?? `${score}%`}`}
        >
          {displayValue ?? `${score}%`}
        </span>
        {label && (
          <span className="text-caption text-neutral-500 mt-space-0.5">
            {label}
          </span>
        )}
      </div>
    </div>
  );
}

/** Utility: get semantic text class for a 0-100 score */
ScoreRing.textClass = resolveTextClass;

/** Utility: get semantic label for a 0-100 score */
ScoreRing.label = function resolveLabel(score: number): string {
  if (score >= 90) return "Excellent";
  if (score >= 70) return "Good";
  return "Needs Work";
};
