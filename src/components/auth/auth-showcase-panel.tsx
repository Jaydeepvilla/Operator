"use client";

import * as React from "react";
import { cn } from "@/components/shared/utils";

/* ════════════════════════════════════════════════════════════════════════════
   SHARED CARD SHELL
   ════════════════════════════════════════════════════════════════════════════ */
function DashCard({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "rounded-2xl border border-white/[0.05] bg-[#181B2A]",
        "shadow-[0_2px_20px_rgba(0,0,0,0.4)]",
        "transition-transform duration-300 hover:-translate-y-0.5",
        className
      )}
    >
      {children}
    </div>
  );
}

/* ════════════════════════════════════════════════════════════════════════════
   CHART PRIMITIVES
   ════════════════════════════════════════════════════════════════════════════ */

/** Compact sparkline bars — sits in top-right of Revenue card */
function SparkBars({
  bars,
  accent = "#7C5CFC",
  barW = 7,
  height = 30,
}: {
  bars: number[];
  accent?: string;
  barW?: number;
  height?: number;
}) {
  const max = Math.max(...bars);
  return (
    <div className="flex items-end gap-[2.5px]" style={{ height }}>
      {bars.map((v, i) => {
        const h = Math.max(3, Math.round((v / max) * height * 0.92));
        const isLast = i === bars.length - 1;
        return (
          <div
            key={i}
            style={{
              width: barW,
              height: h,
              borderRadius: 2,
              background: isLast ? accent : `${accent}60`,
            }}
          />
        );
      })}
    </div>
  );
}

/** Bar chart with horizontal grid lines — used in Appointments card */
function GridBarChart({
  data,
  height = 90,
  accent = "#7C5CFC",
}: {
  data: { a: number; b: number }[];
  height?: number;
  accent?: string;
}) {
  const maxVal = Math.max(...data.map((d) => d.a + d.b));
  const gridCount = 4;

  return (
    <div className="relative w-full" style={{ height }}>
      {/* Horizontal grid lines */}
      {Array.from({ length: gridCount }).map((_, i) => (
        <div
          key={i}
          className="absolute left-0 right-0 border-t border-white/[0.04]"
          style={{ top: `${(i / (gridCount - 1)) * 100}%` }}
        />
      ))}
      {/* Bars */}
      <div className="absolute inset-0 flex items-end gap-[3px]">
        {data.map((d, i) => {
          const totalH = Math.round(((d.a + d.b) / maxVal) * (height - 2));
          const bH = Math.max(2, Math.round((d.b / (d.a + d.b)) * totalH));
          const aH = Math.max(2, totalH - bH);
          return (
            <div key={i} className="flex flex-col-reverse flex-1 gap-[1px]">
              <div
                style={{ height: aH, background: `${accent}50`, borderRadius: "2px 2px 0 0" }}
              />
              <div
                style={{ height: bH, background: accent, borderRadius: "2px 2px 0 0" }}
              />
            </div>
          );
        })}
      </div>
    </div>
  );
}

/** Circular progress ring */
function RingChart({
  percent,
  size = 64,
  stroke = 5,
  accent = "#7C5CFC",
  label,
}: {
  percent: number;
  size?: number;
  stroke?: number;
  accent?: string;
  label?: string;
}) {
  const r = (size - stroke) / 2;
  const circ = 2 * Math.PI * r;
  const dash = Math.max(0, (percent / 100) * circ);

  return (
    <div className="relative shrink-0" style={{ width: size, height: size }}>
      <svg width={size} height={size} aria-hidden="true">
        <circle
          cx={size / 2} cy={size / 2} r={r}
          fill="none" stroke="rgba(255,255,255,0.07)" strokeWidth={stroke}
        />
        <circle
          cx={size / 2} cy={size / 2} r={r}
          fill="none" stroke={accent} strokeWidth={stroke}
          strokeDasharray={`${dash} ${circ - dash}`}
          strokeLinecap="round"
          transform={`rotate(-90 ${size / 2} ${size / 2})`}
        />
      </svg>
      {label && (
        <span className="absolute inset-0 flex items-center justify-center text-[10px] font-black text-white">
          {label}
        </span>
      )}
    </div>
  );
}

/** Large centered donut for Segmentation card */
function DonutChart({
  segments,
  size = 92,
  stroke = 13,
  centerSub,
  centerLabel,
}: {
  segments: { value: number; color: string }[];
  size?: number;
  stroke?: number;
  centerSub?: string;
  centerLabel?: string;
}) {
  const r = (size - stroke) / 2;
  const circ = 2 * Math.PI * r;
  const total = segments.reduce((s, g) => s + g.value, 0);
  let offset = 0;

  return (
    <div className="relative mx-auto" style={{ width: size, height: size }}>
      <svg width={size} height={size} aria-hidden="true">
        <circle
          cx={size / 2} cy={size / 2} r={r}
          fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth={stroke}
        />
        {segments.map((seg, i) => {
          const len = (seg.value / total) * circ;
          const gap = 2;
          const el = (
            <circle
              key={i}
              cx={size / 2} cy={size / 2} r={r}
              fill="none"
              stroke={seg.color}
              strokeWidth={stroke}
              strokeDasharray={`${Math.max(0, len - gap)} ${circ - Math.max(0, len - gap)}`}
              strokeDashoffset={-offset}
              strokeLinecap="butt"
              transform={`rotate(-90 ${size / 2} ${size / 2})`}
            />
          );
          offset += len;
          return el;
        })}
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        {centerSub && (
          <span className="text-[6.5px] text-white/35 leading-none mb-0.5">{centerSub}</span>
        )}
        {centerLabel && (
          <span className="text-[16px] font-black text-white leading-none">{centerLabel}</span>
        )}
      </div>
    </div>
  );
}

/** Slim horizontal progress bar */
function ProgressBar({
  pct,
  color = "#7C5CFC",
  className,
}: {
  pct: number;
  color?: string;
  className?: string;
}) {
  return (
    <div className={cn("h-[4px] w-full rounded-full bg-white/[0.06]", className)}>
      <div
        className="h-full rounded-full"
        style={{ width: `${Math.min(100, pct)}%`, background: color }}
      />
    </div>
  );
}

/* ════════════════════════════════════════════════════════════════════════════
   DASHBOARD CARDS
   ════════════════════════════════════════════════════════════════════════════ */

/** Card 1 — Monthly Revenue (sparkline bars top-right) */
function RevenueCard() {
  const bars = [32, 48, 40, 58];
  return (
    <DashCard className="p-4">
      <div className="flex items-start justify-between">
        <p className="text-[8px] font-semibold text-white/35 uppercase tracking-wider">
          Monthly Revenue
        </p>
        <div className="flex flex-col items-end gap-1.5">
          <SparkBars bars={bars} barW={7} height={28} />
          <div className="flex gap-1.5">
            {["Apr", "May", "Jun", "Jul"].map((m) => (
              <span key={m} className="text-[6px] text-white/25">{m}</span>
            ))}
          </div>
        </div>
      </div>
      <p className="mt-2 text-[19px] font-black text-white leading-none tracking-tight">
        <span className="text-[11px] font-semibold text-white/45 mr-px">$</span>24,830
      </p>
      <p className="mt-1.5 text-[7px] text-white/30 leading-relaxed">
        Your revenue decreased this month by about{" "}
        <span className="text-rose-400/80 font-semibold">–$421</span>
      </p>
    </DashCard>
  );
}

/** Card 2 — Target Status (ring + numbers) */
function TargetCard() {
  return (
    <DashCard className="p-4 flex flex-col h-full">
      <p className="text-[8px] font-semibold text-white/35 uppercase tracking-wider mb-3">
        Target Status
      </p>
      <div className="flex items-center gap-3 flex-1">
        <RingChart percent={80} size={60} stroke={5} accent="#7C5CFC" label="80%" />
        <div>
          <p className="text-[22px] font-black text-white leading-none">3,415</p>
          <p className="text-[7px] text-white/30 mt-0.5">/ 4,000</p>
          <p className="text-[7px] text-amber-400/75 mt-2 leading-snug">
            less than 20% of your<br />sales target will be achieved.
          </p>
        </div>
      </div>
    </DashCard>
  );
}

/** Card 3 — Appointments / Closed Won (tall, bar chart with gridlines) */
function AppointmentsCard() {
  const data = [
    { a: 32, b: 14 }, { a: 44, b: 20 }, { a: 38, b: 16 },
    { a: 58, b: 26 }, { a: 50, b: 22 }, { a: 64, b: 30 },
  ];
  return (
    <DashCard className="p-4 flex flex-col flex-1">
      <div className="flex items-start justify-between mb-1.5">
        <p className="text-[8px] font-semibold text-white/35 uppercase tracking-wider">
          Appointments Booked
        </p>
        <span className="text-[9px] text-white/20">›</span>
      </div>
      <p className="text-[19px] font-black text-white leading-none tracking-tight">
        <span className="text-[11px] font-semibold text-white/45 mr-px">$</span>11,680
      </p>
      <p className="mt-1.5 text-[7px] text-white/30 leading-relaxed">
        this month&apos;s total booking value increased<br />
        from last month&apos;s around{" "}
        <span className="text-emerald-400/80 font-semibold">+$6,450</span>
      </p>

      <div className="mt-3 flex-1">
        <GridBarChart data={data} height={86} />
      </div>

      <div className="flex gap-3 mt-2">
        {[
          { label: "Existing Customers", color: "#7C5CFC50" },
          { label: "New Customers",      color: "#7C5CFC" },
        ].map(({ label, color }) => (
          <span key={label} className="flex items-center gap-1 text-[6.5px] text-white/30">
            <span className="w-1.5 h-1.5 rounded-sm shrink-0" style={{ background: color }} />
            {label}
          </span>
        ))}
      </div>
    </DashCard>
  );
}

/** Card 4 — Customer Segmentation (large centered donut) */
function SegmentationCard() {
  const segments = [
    { value: 1650, color: "#7C5CFC" },
    { value: 458,  color: "#60A5FA" },
    { value: 350,  color: "#34D399" },
    { value: 300,  color: "#F59E0B" },
  ];
  const rows = [
    { label: "Small Business", val: "1,650", delta: "↑ 434", color: "#7C5CFC" },
    { label: "Enterprise",     val: "350",   delta: "↑ 34",  color: "#60A5FA" },
    { label: "Individuals",    val: "458",   delta: "↑ 111", color: "#34D399" },
  ];

  return (
    <DashCard className="p-4 flex flex-col flex-1">
      <div className="flex items-center justify-between mb-2">
        <p className="text-[8px] font-semibold text-white/35 uppercase tracking-wider">
          Customer Segmentation
        </p>
        <span className="text-[9px] text-white/20">›</span>
      </div>

      {/* Large centered donut */}
      <div className="flex justify-center my-2.5">
        <DonutChart
          segments={segments}
          size={90}
          stroke={13}
          centerSub="Total"
          centerLabel="2,758"
        />
      </div>

      {/* Legend rows */}
      <div className="space-y-2 flex-1">
        {rows.map((r) => (
          <div key={r.label} className="flex items-center gap-1.5">
            <div
              className="w-[3px] h-3.5 rounded-full shrink-0"
              style={{ background: r.color }}
            />
            <span className="text-[7px] text-white/40 flex-1 min-w-0 truncate">{r.label}</span>
            <span className="text-[7px] font-bold text-white/60">{r.val}</span>
            <span className="text-[6.5px] text-emerald-400/60 w-8 text-right">{r.delta}</span>
          </div>
        ))}
      </div>

      {/* Pill "More details" button */}
      <button
        type="button"
        className="mt-3 w-full rounded-full border border-white/[0.08] py-1.5 text-[7.5px] font-semibold text-white/35 hover:text-white/55 hover:border-white/15 transition-all"
      >
        More details
      </button>
    </DashCard>
  );
}

/** Card 5 — Task / AI Resolution Rate */
function TaskCard() {
  return (
    <DashCard className="p-4">
      <div className="flex items-center justify-between mb-2">
        <p className="text-[8px] font-semibold text-white/35 uppercase tracking-wider">
          AI Resolution Rate
        </p>
        <span className="text-[9px] text-white/20">›</span>
      </div>
      <div className="flex items-end justify-between">
        <div className="flex items-baseline gap-1.5">
          <p className="text-[22px] font-black text-white leading-none">92%</p>
          <span className="text-[7px] text-emerald-400 font-semibold">↑ 3%</span>
        </div>
        {/* Avatar stack — mirrors the face-bubbles in reference */}
        <div className="flex -space-x-1.5">
          {["#7C5CFC", "#60A5FA", "#34D399"].map((c, i) => (
            <div
              key={i}
              className="w-5 h-5 rounded-full border border-[#181B2A] flex items-center justify-center"
              style={{ background: c }}
            />
          ))}
        </div>
      </div>
      <ProgressBar pct={92} className="mt-3" />
    </DashCard>
  );
}

/** Card 6 — Conversion Rates */
function ConversionCard() {
  const rows = [
    { pct: 75.3, label: "↑ 7,434", sub: "12,800 booked",     color: "#7C5CFC" },
    { pct: 24.7, label: "↑ 711",   sub: "1,421 Product sales", color: "#F59E0B" },
  ];

  return (
    <DashCard className="p-4">
      <div className="flex items-center justify-between mb-3">
        <p className="text-[8px] font-semibold text-white/35 uppercase tracking-wider">
          Conversion Rates
        </p>
        <span className="text-[9px] text-white/20">›</span>
      </div>
      <div className="space-y-3.5">
        {rows.map((r) => (
          <div key={r.label}>
            <div className="flex items-center justify-between mb-1.5">
              <div className="flex items-center gap-1.5">
                <div
                  className="w-[3px] h-3 rounded-full shrink-0"
                  style={{ background: r.color }}
                />
                <span className="text-[8.5px] font-bold text-white/60">{r.pct}%</span>
                <span className="text-[7px] text-emerald-400/70">{r.label}</span>
              </div>
              <span className="text-[6.5px] text-white/25">{r.sub}</span>
            </div>
            <ProgressBar pct={r.pct} color={r.color} />
          </div>
        ))}
      </div>
    </DashCard>
  );
}

/* ════════════════════════════════════════════════════════════════════════════
   DASHBOARD MOSAIC — TWO EQUAL COLUMNS, CARDS STACKED VERTICALLY
   ════════════════════════════════════════════════════════════════════════════ */
function DashboardComposition() {
  return (
    <div className="select-none" aria-hidden="true">
      <div className="grid grid-cols-2 gap-2.5">
        {/* LEFT column: Revenue → Appointments (tall) → Task Rate */}
        <div className="flex flex-col gap-2.5">
          <RevenueCard />
          <AppointmentsCard />
          <TaskCard />
        </div>

        {/* RIGHT column: Target Ring → Segmentation (tall) → Conversion */}
        <div className="flex flex-col gap-2.5">
          <TargetCard />
          <SegmentationCard />
          <ConversionCard />
        </div>
      </div>
    </div>
  );
}

/* ════════════════════════════════════════════════════════════════════════════
   HEADLINE SLIDES
   ════════════════════════════════════════════════════════════════════════════ */
const HEADLINES = [
  {
    headline: "Transform Data into Cool Insights",
    sub: "Make informed decisions with Operator's powerful analytics tools. Harness the power of data to drive your business forward.",
  },
  {
    headline: "Never Miss Another Appointment or Lead",
    sub: "Operator AI answers calls 24/7, qualifies inquiries, and syncs directly with your calendar.",
  },
  {
    headline: "Automate Your Entire Client Journey",
    sub: "From first call to follow-up — Operator handles the full workflow so your team stays focused on what matters.",
  },
];

/* ════════════════════════════════════════════════════════════════════════════
   MOBILE CAROUSEL
   ════════════════════════════════════════════════════════════════════════════ */
export function MobileShowcaseCarousel() {
  const [active, setActive] = React.useState(0);
  React.useEffect(() => {
    const t = setInterval(() => setActive((i) => (i + 1) % HEADLINES.length), 5000);
    return () => clearInterval(t);
  }, []);

  return (
    <div className="relative overflow-hidden px-6 py-8 text-center" style={{ background: "#0F1120" }}>
      <p className="text-[10px] font-black tracking-widest uppercase mb-2" style={{ color: "#7C5CFC" }}>
        AI Business Operating System
      </p>
      <p className="text-xl font-bold tracking-tight text-white leading-snug min-h-[50px]">
        {HEADLINES[active].headline}
      </p>
    </div>
  );
}

/* ════════════════════════════════════════════════════════════════════════════
   MAIN AUTH SHOWCASE PANEL
   ════════════════════════════════════════════════════════════════════════════ */
export function AuthShowcasePanel() {
  const [active, setActive] = React.useState(0);
  React.useEffect(() => {
    const t = setInterval(() => setActive((i) => (i + 1) % HEADLINES.length), 6000);
    return () => clearInterval(t);
  }, []);

  return (
    <div
      className="relative flex h-full flex-col overflow-hidden"
      style={{
        background: `
          radial-gradient(ellipse at 25% 0%, rgba(124, 92, 252, 0.18) 0%, transparent 55%),
          radial-gradient(ellipse at 85% 100%, rgba(52, 211, 153, 0.06) 0%, transparent 50%),
          #0F1120
        `,
      }}
    >
      {/* Dot-grid texture */}
      <div
        className="absolute inset-0 opacity-[0.015] pointer-events-none"
        style={{
          backgroundImage: "radial-gradient(rgba(255,255,255,0.8) 1px, transparent 1px)",
          backgroundSize: "28px 28px",
        }}
        aria-hidden="true"
      />

      <div className="relative z-10 flex h-full flex-col py-7 px-6 xl:px-8">
        {/* Top spacer */}
        <div className="h-3" />

        {/* Dashboard mosaic — fills remaining vertical space */}
        <div className="flex-1 flex items-center overflow-hidden">
          <div className="w-full">
            <DashboardComposition />
          </div>
        </div>

        {/* Bottom: headline rotation + pill dots */}
        <div className="mt-5 text-center">
          <div className="relative">
            {HEADLINES.map((h, i) => {
              const isActive = i === active;
              return (
                <div
                  key={i}
                  className={cn(
                    "transition-all duration-500 ease-out",
                    isActive
                      ? "relative opacity-100 translate-y-0"
                      : "absolute inset-0 opacity-0 translate-y-2 pointer-events-none"
                  )}
                >
                  <h2 className="text-[17px] xl:text-[19px] font-black text-white tracking-tight leading-tight max-w-xs mx-auto">
                    {h.headline}
                  </h2>
                  <p className="text-[10px] text-white/35 leading-relaxed max-w-[260px] mx-auto mt-1.5">
                    {h.sub}
                  </p>
                </div>
              );
            })}
          </div>

          <div
            className="flex items-center justify-center gap-1.5 mt-4"
            role="tablist"
            aria-label="Showcase slides"
          >
            {HEADLINES.map((_, i) => (
              <button
                key={i}
                type="button"
                role="tab"
                aria-selected={i === active}
                aria-label={`Slide ${i + 1}`}
                onClick={() => setActive(i)}
                className={cn(
                  "rounded-full transition-all duration-300 cursor-pointer",
                  i === active
                    ? "w-5 h-[5px] bg-white"
                    : "w-[5px] h-[5px] bg-white/25 hover:bg-white/45"
                )}
              />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
