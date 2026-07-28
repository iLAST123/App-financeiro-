"use client"

import {
  AlertTriangle,
  Lightbulb,
  TrendingDown,
  TrendingUp,
  type LucideIcon,
} from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import type { Insight, InsightTone } from "@/lib/finance/insights"
import { cn } from "@/lib/utils"

const TONE_STYLE: Record<InsightTone, { icon: LucideIcon; className: string }> = {
  danger: { icon: AlertTriangle, className: "bg-[#d03b3b]/10 text-[#d03b3b]" },
  warning: { icon: TrendingUp, className: "bg-amber-500/15 text-amber-600" },
  positive: { icon: TrendingDown, className: "bg-[#006300]/10 text-[#006300]" },
  info: { icon: Lightbulb, className: "bg-brand/10 text-brand" },
}

export function InsightCards({ insights }: { insights: Insight[] }) {
  if (insights.length === 0) return null
  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-base">Radar do mês</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3.5 pb-5">
        {insights.map((insight) => {
          const { icon: Icon, className } = TONE_STYLE[insight.tone]
          return (
            <div key={insight.id} className="flex items-start gap-3">
              <span
                className={cn(
                  "flex h-8 w-8 shrink-0 items-center justify-center rounded-full",
                  className
                )}
              >
                <Icon className="h-4 w-4" />
              </span>
              <div className="min-w-0">
                <p className="text-sm font-medium leading-snug">{insight.title}</p>
                <p className="mt-0.5 text-xs leading-snug text-muted-foreground">
                  {insight.description}
                </p>
              </div>
            </div>
          )
        })}
      </CardContent>
    </Card>
  )
}
