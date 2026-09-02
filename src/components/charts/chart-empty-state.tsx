import * as React from "react"
import { BarChart3 } from "lucide-react"
import { m } from "framer-motion"

export function ChartEmptyState({ message = "No data available" }: { message?: string }) {
 return (
 <div className="flex flex-col items-center justify-center h-full w-full p-space-8 text-center text-muted-foreground bg-[hsl(var(--foreground)/0.01)] border-[hsl(var(--foreground)/0.06)] radius-xl">
 <m.div 
 className="h-10 w-10 radius-full bg-[hsl(var(--foreground)/0.06)] flex items-center justify-center mb-space-3"
 animate={{ y: [0, -6, 0] }}
 transition={{
 repeat: Infinity,
 repeatType: "reverse",
 duration: 3.5,
 ease: "easeInOut",
 }}
 >
 <BarChart3 className="h-5 w-5 opacity-50" />
 </m.div>
 <p className="text-body-sm font-medium">{message}</p>
    </div>
  )
}
