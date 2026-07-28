"use client"

import { Card, CardContent } from "@/components/ui/card"
import { EmptyState } from "@/components/ui/EmptyState"
import { getCategory } from "@/lib/finance/categories"
import { centsToBRL } from "@/lib/finance/summary"
import type { Transaction } from "@/lib/finance/types"
import { cn } from "@/lib/utils"

function dayLabel(date: string): string {
  const [y, m, d] = date.split("-").map(Number)
  return new Date(y, m - 1, d).toLocaleDateString("pt-BR", {
    weekday: "short",
    day: "2-digit",
    month: "short",
  })
}

interface TransactionListProps {
  transactions: Transaction[]
  onSelect: (tx: Transaction) => void
}

export function TransactionList({ transactions, onSelect }: TransactionListProps) {
  if (transactions.length === 0) {
    return (
      <EmptyState
        title="Nenhum lançamento neste mês"
        description="Toque no botão + para registrar sua primeira receita ou despesa."
      />
    )
  }

  const byDay = new Map<string, Transaction[]>()
  const sorted = [...transactions].sort((a, b) => b.date.localeCompare(a.date))
  for (const tx of sorted) {
    const list = byDay.get(tx.date) ?? []
    list.push(tx)
    byDay.set(tx.date, list)
  }

  return (
    <div className="space-y-4">
      {Array.from(byDay.entries()).map(([date, txs]) => (
        <div key={date}>
          <p className="mb-1.5 px-1 text-xs font-medium uppercase tracking-wide text-muted-foreground">
            {dayLabel(date)}
          </p>
          <Card>
            <CardContent className="divide-y p-0">
              {txs.map((tx) => {
                const category = getCategory(tx.categoryId)
                const Icon = category.icon
                const income = tx.type === "income"
                return (
                  <button
                    key={tx.id}
                    type="button"
                    onClick={() => onSelect(tx)}
                    className="flex w-full items-center gap-3 px-4 py-3 text-left transition-colors hover:bg-accent"
                  >
                    <span
                      className={cn(
                        "flex h-9 w-9 shrink-0 items-center justify-center rounded-full",
                        income
                          ? "bg-[#0ca30c]/10 text-[#006300]"
                          : "bg-muted text-muted-foreground"
                      )}
                    >
                      <Icon className="h-4 w-4" />
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-sm font-medium">
                        {tx.note || category.label}
                      </span>
                      {tx.note && (
                        <span className="block truncate text-xs text-muted-foreground">
                          {category.label}
                        </span>
                      )}
                    </span>
                    <span
                      className={cn(
                        "shrink-0 text-sm font-semibold tabular-nums",
                        income && "text-[#006300]"
                      )}
                    >
                      {income ? "+" : "−"}
                      {centsToBRL(tx.amountCents)}
                    </span>
                  </button>
                )
              })}
            </CardContent>
          </Card>
        </div>
      ))}
    </div>
  )
}
