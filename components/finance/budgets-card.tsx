"use client"

import { SlidersHorizontal, Target } from "lucide-react"
import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { getCategory } from "@/lib/finance/categories"
import type { BudgetStatus } from "@/lib/finance/budgets"
import { centsToBRL } from "@/lib/finance/summary"
import { cn } from "@/lib/utils"

const BAR_COLOR: Record<BudgetStatus["state"], string> = {
  ok: "bg-brand",
  near: "bg-amber-500",
  over: "bg-[#d03b3b]",
}

interface BudgetsCardProps {
  statuses: BudgetStatus[]
  onEdit: () => void
}

export function BudgetsCard({ statuses, onEdit }: BudgetsCardProps) {
  if (statuses.length === 0) {
    return (
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-base">
            <Target className="h-4 w-4 text-brand" />
            Orçamento do mês
          </CardTitle>
          <CardDescription>
            Defina um teto de gastos por categoria e acompanhe aqui quanto ainda
            dá pra gastar sem estourar.
          </CardDescription>
        </CardHeader>
        <CardContent className="pb-5">
          <Button variant="outline" className="w-full" onClick={onEdit}>
            <SlidersHorizontal className="mr-2 h-4 w-4" />
            Definir orçamentos
          </Button>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader className="flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="flex items-center gap-2 text-base">
          <Target className="h-4 w-4 text-brand" />
          Orçamento do mês
        </CardTitle>
        <Button
          variant="ghost"
          size="sm"
          className="-mr-2 h-8 text-brand hover:text-brand"
          onClick={onEdit}
        >
          <SlidersHorizontal className="mr-1.5 h-3.5 w-3.5" />
          Editar
        </Button>
      </CardHeader>
      <CardContent className="space-y-4 pb-5">
        {statuses.map((s) => {
          const Icon = getCategory(s.categoryId).icon
          const remainingCents = s.limitCents - s.spentCents
          return (
            <div key={s.categoryId}>
              <div className="mb-1 flex items-center justify-between gap-2 text-sm">
                <span className="flex min-w-0 items-center gap-2">
                  <Icon className="h-4 w-4 shrink-0 text-muted-foreground" />
                  <span className="truncate">{s.label}</span>
                </span>
                <span className="shrink-0 tabular-nums">
                  <span
                    className={cn(
                      "font-medium",
                      s.state === "over" && "text-[#d03b3b]"
                    )}
                  >
                    {centsToBRL(s.spentCents)}
                  </span>
                  <span className="ml-1 text-xs text-muted-foreground">
                    de {centsToBRL(s.limitCents)}
                  </span>
                </span>
              </div>
              <div className="h-2 overflow-hidden rounded-full bg-muted">
                <div
                  className={cn("h-full rounded-full", BAR_COLOR[s.state])}
                  style={{
                    width: `${Math.max(Math.min(s.ratio, 1) * 100, 2)}%`,
                  }}
                />
              </div>
              <p
                className={cn(
                  "mt-1 text-right text-xs tabular-nums",
                  s.state === "over"
                    ? "font-medium text-[#d03b3b]"
                    : "text-muted-foreground"
                )}
              >
                {remainingCents >= 0
                  ? `Restam ${centsToBRL(remainingCents)}`
                  : `Estourou ${centsToBRL(-remainingCents)}`}
              </p>
            </div>
          )
        })}
      </CardContent>
    </Card>
  )
}
