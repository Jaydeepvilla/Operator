"use client"

import * as React from "react"
import { Line, LineChart, ResponsiveContainer, YAxis } from "recharts"

export interface SparklineCardProps {
  data: any[]
  categories: string[]
  colors?: string[]
  height?: number
}

const defaultColors = ["hsl(var(--primary))"]

export function SparklineCard({
  data,
  categories,
  colors = defaultColors,
  height = 40
}: SparklineCardProps) {
  const [mounted, setMounted] = React.useState(false);
  React.useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted || !data || data.length === 0) return null

  return (
    <div style={{ height }} className="w-24 shrink-0">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={data}>
          <YAxis domain={['dataMin', 'dataMax']} hide />
          {categories.map((cat, i) => (
            <Line
              key={cat}
              type="monotone"
              dataKey={cat}
              stroke={colors[i % colors.length]}
              strokeWidth={2}
              dot={false}
              isAnimationActive={false}
            />
          ))}
        </LineChart>
      </ResponsiveContainer>
    </div>
  )
}
