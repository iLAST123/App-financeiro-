"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { getCategory } from "@/lib/finance/categories"
import { centsToBRL, type CategoryTotal } from "@/lib/finance/summary"

export function CategoryBars({ totals }: { totals: CategoryTotal[] }) {
  if (totals.length === 0) return null
  const max = totals[0].totalCents
  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-base">Despesas por categoria</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4 pb-5">
        {totals.map((t) => {
          const Icon = getCategory(t.categoryId).icon
          return (
            <div key={t.categoryId}>
              <div className="mb-1 flex items-center justify-between gap-2 text-sm">
                <span className="flex min-w-0 items-center gap-2">
                  <Icon className="h-4 w-4 shrink-0 text-muted-foreground" />
                  <span className="truncate">{t.label}</span>
                </span>
                <span className="shrink-0 font-medium tabular-nums">
                  {centsToBRL(t.totalCents)}
                  <span className="ml-1.5 text-xs text-muted-foreground">
                    {Math.round(t.share * 100)}%
                  </span>
                </span>
              </div>
              <div className="h-2 overflow-hidden rounded-full bg-muted">
                <div
                  className="h-full rounded-full bg-[#2a78d6]"
                  style={{ width: `${Math.max((t.totalCents / max) * 100, 2)}%` }}
                />
              </div>
            </div>
          )
        })}
      </CardContent>
    </Card>
  )
}
