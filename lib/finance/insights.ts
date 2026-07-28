import { budgetStatuses } from "./budgets"
import { getCategory } from "./categories"
import {
  centsToBRL,
  expensesByCategory,
  summarize,
  transactionsOfMonth,
} from "./summary"
import {
  daysInMonth,
  monthKeyOf,
  shiftMonth,
  todayISO,
  type BudgetMap,
  type MonthKey,
  type Transaction,
} from "./types"

export type InsightTone = "danger" | "warning" | "positive" | "info"

export interface Insight {
  id: string
  tone: InsightTone
  title: string
  description: string
}

const TONE_ORDER: Record<InsightTone, number> = {
  danger: 0,
  warning: 1,
  positive: 2,
  info: 3,
}

/** variações menores que isso (R$ 50) não viram insight */
const MIN_DELTA_CENTS = 5000
/** variação percentual mínima p/ comparar com o mês anterior */
const MIN_DELTA_PCT = 30
/** nº máximo de cartões exibidos */
const MAX_INSIGHTS = 4

function dayLabel(date: string): string {
  const [, m, d] = date.split("-")
  return `${d}/${m}`
}

/**
 * Gera os cartões do "Radar do mês" por heurística pura sobre os dados locais:
 * projeção de fim de mês, orçamentos em risco, variação vs. mês anterior e
 * maior gasto. Nada sai do aparelho.
 */
export function buildInsights(
  transactions: Transaction[],
  month: MonthKey,
  budgets: BudgetMap,
  today: string = todayISO()
): Insight[] {
  const monthTx = transactionsOfMonth(transactions, month)
  if (monthTx.length === 0) return []

  const insights: Insight[] = []
  const summary = summarize(monthTx)

  // 1. Projeção de fim de mês (só faz sentido no mês corrente, com algum histórico)
  if (month === monthKeyOf(today)) {
    const dayOfMonth = Number(today.slice(8, 10))
    if (dayOfMonth >= 3 && summary.expenseCents > 0) {
      const totalDays = daysInMonth(month)
      const projectedCents = Math.round(
        (summary.expenseCents / dayOfMonth) * totalDays
      )
      const perDayCents = Math.round(summary.expenseCents / dayOfMonth)
      if (summary.incomeCents > 0 && projectedCents > summary.incomeCents) {
        insights.push({
          id: "projecao-deficit",
          tone: "danger",
          title: "Ritmo de gastos acima da renda",
          description: `Nesse ritmo (${centsToBRL(perDayCents)}/dia), o mês fecha em ${centsToBRL(projectedCents)} de despesas — acima das receitas de ${centsToBRL(summary.incomeCents)}.`,
        })
      } else if (dayOfMonth < totalDays) {
        insights.push({
          id: "projecao",
          tone: "info",
          title: `Projeção do mês: ${centsToBRL(projectedCents)} em despesas`,
          description: `Você está gastando em média ${centsToBRL(perDayCents)} por dia.`,
        })
      }
    }
  }

  // 2. Orçamentos estourados ou perto do limite
  const statuses = budgetStatuses(monthTx, budgets)
  const over = statuses.filter((s) => s.state === "over")
  const near = statuses.filter((s) => s.state === "near")
  if (over.length === 1) {
    insights.push({
      id: "orcamento-estourado",
      tone: "danger",
      title: `Orçamento de ${over[0].label} estourado`,
      description: `Você já gastou ${centsToBRL(over[0].spentCents)} de um teto de ${centsToBRL(over[0].limitCents)}.`,
    })
  } else if (over.length > 1) {
    insights.push({
      id: "orcamento-estourado",
      tone: "danger",
      title: `${over.length} orçamentos estourados`,
      description: `${over.map((s) => s.label).join(", ")} passaram do teto definido para o mês.`,
    })
  } else if (near.length > 0) {
    const s = near[0]
    insights.push({
      id: "orcamento-perto",
      tone: "warning",
      title: `${s.label} perto do limite`,
      description: `Já foram ${centsToBRL(s.spentCents)} de ${centsToBRL(s.limitCents)} (${Math.round(s.ratio * 100)}% do orçamento).`,
    })
  }

  // 3. Maior variação por categoria vs. mês anterior
  const prevTotals = expensesByCategory(
    transactionsOfMonth(transactions, shiftMonth(month, -1))
  )
  const curByCategory = new Map(
    expensesByCategory(monthTx).map((c) => [c.categoryId, c.totalCents])
  )
  let topIncrease: { label: string; pct: number; cur: number; prev: number } | null = null
  let topDecrease: { label: string; pct: number; savedCents: number } | null = null
  for (const prev of prevTotals) {
    const cur = curByCategory.get(prev.categoryId) ?? 0
    const delta = cur - prev.totalCents
    const pct = Math.round((delta / prev.totalCents) * 100)
    if (delta >= MIN_DELTA_CENTS && pct >= MIN_DELTA_PCT) {
      if (topIncrease === null || pct > topIncrease.pct) {
        topIncrease = { label: prev.label, pct, cur, prev: prev.totalCents }
      }
    } else if (-delta >= MIN_DELTA_CENTS && pct <= -MIN_DELTA_PCT) {
      if (topDecrease === null || -pct > topDecrease.pct) {
        topDecrease = { label: prev.label, pct: -pct, savedCents: -delta }
      }
    }
  }
  if (topIncrease) {
    insights.push({
      id: "categoria-subiu",
      tone: "warning",
      title: `${topIncrease.label} subiu ${topIncrease.pct}% vs. mês passado`,
      description: `Foram ${centsToBRL(topIncrease.cur)} neste mês, contra ${centsToBRL(topIncrease.prev)} no anterior.`,
    })
  }
  if (topDecrease) {
    insights.push({
      id: "categoria-caiu",
      tone: "positive",
      title: `${topDecrease.label} caiu ${topDecrease.pct}% vs. mês passado`,
      description: `Economia de ${centsToBRL(topDecrease.savedCents)} em relação ao mês anterior.`,
    })
  }

  // 4. Maior gasto do mês (quando é relevante: ≥ 25% das despesas)
  const expenses = monthTx.filter((t) => t.type === "expense")
  if (expenses.length >= 3) {
    const biggest = expenses.reduce((a, b) =>
      b.amountCents > a.amountCents ? b : a
    )
    if (biggest.amountCents >= summary.expenseCents * 0.25) {
      const label = getCategory(biggest.categoryId).label
      insights.push({
        id: "maior-gasto",
        tone: "info",
        title: `Maior gasto: ${centsToBRL(biggest.amountCents)}`,
        description: `${label}${biggest.note ? ` (${biggest.note})` : ""}, em ${dayLabel(biggest.date)}.`,
      })
    }
  }

  return insights
    .sort((a, b) => TONE_ORDER[a.tone] - TONE_ORDER[b.tone])
    .slice(0, MAX_INSIGHTS)
}
