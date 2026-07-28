import { getCategory } from "./categories"
import { monthKeyOf, type MonthKey, type Transaction } from "./types"

export interface MonthSummary {
  incomeCents: number
  expenseCents: number
  balanceCents: number
}

export function transactionsOfMonth(
  transactions: Transaction[],
  month: MonthKey
): Transaction[] {
  return transactions.filter((t) => monthKeyOf(t.date) === month)
}

export function summarize(transactions: Transaction[]): MonthSummary {
  let incomeCents = 0
  let expenseCents = 0
  for (const t of transactions) {
    if (t.type === "income") incomeCents += t.amountCents
    else expenseCents += t.amountCents
  }
  return { incomeCents, expenseCents, balanceCents: incomeCents - expenseCents }
}

export interface CategoryTotal {
  categoryId: string
  label: string
  totalCents: number
  share: number
}

export function expensesByCategory(transactions: Transaction[]): CategoryTotal[] {
  const totals = new Map<string, number>()
  let overall = 0
  for (const t of transactions) {
    if (t.type !== "expense") continue
    totals.set(t.categoryId, (totals.get(t.categoryId) ?? 0) + t.amountCents)
    overall += t.amountCents
  }
  return Array.from(totals.entries())
    .map(([categoryId, totalCents]) => ({
      categoryId,
      label: getCategory(categoryId).label,
      totalCents,
      share: overall > 0 ? totalCents / overall : 0,
    }))
    .sort((a, b) => b.totalCents - a.totalCents)
}

export interface MonthPoint {
  month: MonthKey
  label: string
  incomeCents: number
  expenseCents: number
}

export function lastMonthsSeries(
  transactions: Transaction[],
  months: MonthKey[]
): MonthPoint[] {
  return months.map((month) => {
    const s = summarize(transactionsOfMonth(transactions, month))
    const [y, m] = month.split("-").map(Number)
    const label = new Date(y, m - 1, 1)
      .toLocaleDateString("pt-BR", { month: "short" })
      .replace(".", "")
    return {
      month,
      label: label.charAt(0).toUpperCase() + label.slice(1),
      incomeCents: s.incomeCents,
      expenseCents: s.expenseCents,
    }
  })
}

export function centsToBRL(cents: number): string {
  return (cents / 100).toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL",
  })
}

/** interpreta "1.234,56", "1234.56" ou "1234" como centavos */
export function parseBRLInput(raw: string): number | null {
  const cleaned = raw.trim().replace(/\s|R\$/g, "")
  if (!cleaned) return null
  let normalized = cleaned
  if (cleaned.includes(",")) {
    normalized = cleaned.replace(/\./g, "").replace(",", ".")
  }
  const value = Number(normalized)
  if (!Number.isFinite(value) || value <= 0) return null
  return Math.round(value * 100)
}
