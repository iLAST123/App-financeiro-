"use client"

import { ArrowDownCircle, ArrowUpCircle } from "lucide-react"
import { Card, CardContent } from "@/components/ui/card"
import { centsToBRL, type MonthSummary } from "@/lib/finance/summary"
import { cn } from "@/lib/utils"

export function SummaryCards({ summary }: { summary: MonthSummary }) {
  const negative = summary.balanceCents < 0
  return (
    <div className="space-y-3">
      <Card className="bg-brand text-brand-foreground">
        <CardContent className="px-5 py-6">
          <p className="text-sm/none opacity-80">Saldo do mês</p>
          <p
            className={cn(
              "mt-2 text-4xl font-bold tracking-tight",
              negative && "text-red-200"
            )}
          >
            {centsToBRL(summary.balanceCents)}
          </p>
        </CardContent>
      </Card>
      <div className="grid grid-cols-2 gap-3">
        <Card>
          <CardContent className="flex items-center gap-2.5 p-3.5">
            <ArrowUpCircle className="h-7 w-7 shrink-0 text-[#006300]" />
            <div className="min-w-0">
              <p className="text-xs text-muted-foreground">Receitas</p>
              <p className="truncate text-sm font-semibold">
                {centsToBRL(summary.incomeCents)}
              </p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="flex items-center gap-2.5 p-3.5">
            <ArrowDownCircle className="h-7 w-7 shrink-0 text-[#d03b3b]" />
            <div className="min-w-0">
              <p className="text-xs text-muted-foreground">Despesas</p>
              <p className="truncate text-sm font-semibold">
                {centsToBRL(summary.expenseCents)}
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
