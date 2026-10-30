"use client"

import * as React from "react"
import { Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis, CartesianGrid, Legend } from "recharts"
import { ChartTooltip } from "./chart-tooltip"
import { ChartSkeleton } from "./chart-skeleton"
import { ChartEmptyState } from "./chart-empty-state"
import { ChartLegend } from "./chart-legend"

export interface LineChartCardProps {
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
  showLegend?: boolean
}

const defaultColors = [
  "hsl(var(--primary))",
  "#3b82f6", // blue-500
  "#10b981", // emerald-500
]

export function LineChartCard({
  data,
  index,
  categories,
  colors = defaultColors,
  valueFormatter,
  valuePrefix = "",
  valueSuffix = "",
  height = 300,
  loading,
  emptyMessage,
  showLegend = false
}: LineChartCardProps) {
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
    <div style={{ height }} className="w-full relative">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={data} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
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
          {showLegend && <Legend content={<ChartLegend />} layout="horizontal" verticalAlign="bottom" />}
          {categories.map((cat, i) => (
            <Line
              key={cat}
              type="monotone"
              dataKey={cat}
              stroke={colors[i % colors.length]}
              strokeWidth={2}
              dot={{ r: 3, fill: colors[i % colors.length] }}
              activeDot={{ r: 5 }}
            />
          ))}
        </LineChart>
      </ResponsiveContainer>
    </div>
  )
}
