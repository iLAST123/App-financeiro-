import { getCategory } from "./categories"
import type { BudgetMap, Transaction } from "./types"

export type BudgetState = "ok" | "near" | "over"

export interface BudgetStatus {
  categoryId: string
  label: string
  limitCents: number
  spentCents: number
  /** gasto / teto (pode passar de 1 quando estourou) */
  ratio: number
  state: BudgetState
}

/** a partir de 80% do teto o orçamento entra em alerta */
export const BUDGET_NEAR_RATIO = 0.8

const STATE_ORDER: Record<BudgetState, number> = { over: 0, near: 1, ok: 2 }

/** status de cada orçamento no mês (recebe apenas as transações do mês) */
export function budgetStatuses(
  monthTransactions: Transaction[],
  budgets: BudgetMap
): BudgetStatus[] {
  const entries = Object.entries(budgets).filter(([, limit]) => limit > 0)
  if (entries.length === 0) return []

  const spent = new Map<string, number>()
  for (const t of monthTransactions) {
    if (t.type !== "expense") continue
    spent.set(t.categoryId, (spent.get(t.categoryId) ?? 0) + t.amountCents)
  }

  return entries
    .map(([categoryId, limitCents]) => {
      const spentCents = spent.get(categoryId) ?? 0
      const ratio = spentCents / limitCents
      const state: BudgetState =
        ratio > 1 ? "over" : ratio >= BUDGET_NEAR_RATIO ? "near" : "ok"
      return {
        categoryId,
        label: getCategory(categoryId).label,
        limitCents,
        spentCents,
        ratio,
        state,
      }
    })
    .sort(
      (a, b) => STATE_ORDER[a.state] - STATE_ORDER[b.state] || b.ratio - a.ratio
    )
}
