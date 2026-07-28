"use client"

import { useEffect, useState } from "react"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet"
import { categoriesOf } from "@/lib/finance/categories"
import { parseBRLInput } from "@/lib/finance/summary"
import type { BudgetMap } from "@/lib/finance/types"

interface BudgetEditorProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  budgets: BudgetMap
  onSave: (budgets: BudgetMap) => void
}

function centsToInput(cents: number): string {
  return (cents / 100).toFixed(2).replace(".", ",")
}

export function BudgetEditor({
  open,
  onOpenChange,
  budgets,
  onSave,
}: BudgetEditorProps) {
  const [drafts, setDrafts] = useState<Record<string, string>>({})

  useEffect(() => {
    if (!open) return
    const initial: Record<string, string> = {}
    for (const [categoryId, cents] of Object.entries(budgets)) {
      initial[categoryId] = centsToInput(cents)
    }
    setDrafts(initial)
  }, [open, budgets])

  const categories = categoriesOf("expense")

  function handleSubmit() {
    const next: BudgetMap = {}
    for (const c of categories) {
      const raw = (drafts[c.id] ?? "").trim()
      if (!raw) continue
      const cents = parseBRLInput(raw)
      if (cents === null) {
        toast.error(`Valor inválido em ${c.label}`)
        return
      }
      next[c.id] = cents
    }
    onSave(next)
    onOpenChange(false)
  }

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side="bottom"
        className="max-h-[92dvh] overflow-y-auto rounded-t-2xl pb-[max(1.5rem,env(safe-area-inset-bottom))]"
      >
        <SheetHeader className="text-left">
          <SheetTitle>Orçamento mensal</SheetTitle>
          <SheetDescription>
            Teto de gastos por categoria. Deixe em branco para não acompanhar.
          </SheetDescription>
        </SheetHeader>

        <div className="mt-4 space-y-3">
          {categories.map((c) => {
            const Icon = c.icon
            return (
              <div key={c.id} className="flex items-center gap-3">
                <label
                  htmlFor={`budget-${c.id}`}
                  className="flex min-w-0 flex-1 items-center gap-2 text-sm"
                >
                  <Icon className="h-4 w-4 shrink-0 text-muted-foreground" />
                  <span className="truncate">{c.label}</span>
                </label>
                <div className="relative w-32 shrink-0">
                  <span className="pointer-events-none absolute inset-y-0 left-3 flex items-center text-xs text-muted-foreground">
                    R$
                  </span>
                  <Input
                    id={`budget-${c.id}`}
                    inputMode="decimal"
                    placeholder="—"
                    value={drafts[c.id] ?? ""}
                    onChange={(e) =>
                      setDrafts((d) => ({ ...d, [c.id]: e.target.value }))
                    }
                    className="pl-9 text-right tabular-nums"
                  />
                </div>
              </div>
            )
          })}

          <div className="pt-2">
            <Button
              className="w-full bg-brand hover:bg-brand/90"
              onClick={handleSubmit}
            >
              Salvar orçamentos
            </Button>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  )
}
