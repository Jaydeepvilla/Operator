"use client"

import * as React from "react"
import { Area, AreaChart, ResponsiveContainer, Tooltip, XAxis, YAxis, CartesianGrid } from "recharts"
import { ChartTooltip } from "./chart-tooltip"
import { ChartSkeleton } from "./chart-skeleton"
import { ChartEmptyState } from "./chart-empty-state"

export interface AreaChartCardProps {
  data: any[]
  index: string
  categories: string[]
  colors?: string[]
  valueFormatter?: (value: number) => string
  valuePrefix?: string
  valueSuffix?: string
  height?: number
  loading?: boolean
  emptyMessage?: string
}

const defaultColors = [
  "hsl(var(--primary))",
  "#3b82f6", // blue-500
  "#10b981", // emerald-500
]

export function AreaChartCard({
  data,
  index,
  categories,
  colors = defaultColors,
  valueFormatter,
  valuePrefix = "",
  valueSuffix = "",
  height = 300,
  loading,
  emptyMessage
}: AreaChartCardProps) {
  const [mounted, setMounted] = React.useState(false);
  React.useEffect(() => {
    setMounted(true);
  }, []);

  const formatter = React.useCallback(
    (v: number) => valueFormatter ? valueFormatter(v) : `${valuePrefix}${v}${valueSuffix}`,
    [valueFormatter, valuePrefix, valueSuffix]
  );

  if (!mounted || loading) return <div style={{ height }}><ChartSkeleton /></div>
  if (!data || data.length === 0) return <div style={{ height }}><ChartEmptyState message={emptyMessage} /></div>

  return (
    <div style={{ height }} className="w-full">
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={data} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
          <defs>
            {categories.map((cat, i) => (
              <linearGradient key={cat} id={`color-${cat}`} x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor={colors[i % colors.length]} stopOpacity={0.3} />
                <stop offset="95%" stopColor={colors[i % colors.length]} stopOpacity={0} />
              </linearGradient>
            ))}
          </defs>
          <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(var(--foreground)/0.06)" />
          <XAxis 
            dataKey={index} 
            axisLine={false} 
            tickLine={false} 
            tick={{ fill: "hsl(var(--foreground)/0.5)", fontSize: 12 }} 
            dy={10}
          />
          <YAxis 
            axisLine={false} 
            tickLine={false} 
            tick={{ fill: "hsl(var(--foreground)/0.5)", fontSize: 12 }} 
            tickFormatter={formatter}
          />
          <Tooltip content={<ChartTooltip formatter={formatter} />} cursor={{ stroke: "hsl(var(--foreground)/0.1)", strokeWidth: 1, strokeDasharray: "3 3" }} />
          {categories.map((cat, i) => (
            <Area
              key={cat}
              type="monotone"
              dataKey={cat}
              stroke={colors[i % colors.length]}
              strokeWidth={2}
              fillOpacity={1}
              fill={`url(#color-${cat})`}
              activeDot={{ r: 4, strokeWidth: 0, fill: colors[i % colors.length] }}
            />
          ))}
        </AreaChart>
      </ResponsiveContainer>
    </div>
  )
}
