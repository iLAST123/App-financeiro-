/**
 * Tradução de transações da Pluggy para lançamentos do Meu Bolso.
 *
 * - Direção (receita × despesa): campo `type` da Pluggy (DEBIT = saída,
 *   CREDIT = entrada). Sem `type`, cai no sinal do `amount` — atenção que a
 *   convenção INVERTE no cartão de crédito (compra vem positiva).
 * - Valor: sempre positivo, em centavos (convenção do app).
 * - Categoria: heurística por palavra-chave sobre a categoria em inglês do
 *   categorizador da Pluggy; sem match → "outros-despesa"/"outros-receita".
 */

import { newId } from "@/lib/finance/store"
import type { Transaction, TransactionType } from "@/lib/finance/types"
import type { PluggyAccount, PluggyTransaction } from "./client"

/** regras: primeira que casar vence (ordem importa) */
const EXPENSE_RULES: Array<[categoryId: string, pattern: RegExp]> = [
  ["mercado", /grocer|supermarket/],
  ["alimentacao", /food|eating|restaurant|delivery|bakery|coffee|drink|bar\b/],
  [
    "transporte",
    /transport|taxi|ride|mobility|gas station|fuel|parking|toll|bus|subway|car\b|automotive/,
  ],
  ["moradia", /housing|rent\b|mortgage|condominium|home|furniture|repair/],
  [
    "contas",
    /utilit|electricity|energy|water|internet|telecom|phone|bill|bank fee|fees|tax|interest|fine/,
  ],
  ["saude", /health|pharmac|hospital|dental|medic|clinic|wellness/],
  ["educacao", /education|school|universit|course|book|kids/],
  ["lazer", /leisure|entertainment|cinema|movie|game|gambling|sport|gym|party|event|hobb/],
  ["assinaturas", /stream|subscription|digital service|software|apps?\b/],
  ["viagem", /travel|flight|airport|airline|hotel|accommodation|lodging/],
  ["compras", /shopping|clothing|electronic|online|store|marketplace|department|pet/],
]

const INCOME_RULES: Array<[categoryId: string, pattern: RegExp]> = [
  ["salario", /salary|payroll|wage|retirement|pension|benefit|government aid/],
  ["investimentos", /invest|dividend|interest|yield|redemption|fixed income|proceeds/],
  ["freelance", /freelance|self.?employ|service income|entrepreneur/],
]

export function mapCategory(
  pluggyCategory: string | null | undefined,
  type: TransactionType
): string {
  const fallback = type === "expense" ? "outros-despesa" : "outros-receita"
  if (!pluggyCategory) return fallback
  const normalized = pluggyCategory.toLowerCase()
  const rules = type === "expense" ? EXPENSE_RULES : INCOME_RULES
  for (const [categoryId, pattern] of rules) {
    if (pattern.test(normalized)) return categoryId
  }
  return fallback
}

function directionOf(
  tx: PluggyTransaction,
  account: PluggyAccount
): TransactionType {
  if (tx.type === "DEBIT") return "expense"
  if (tx.type === "CREDIT") return "income"
  // fallback pelo sinal do amount: no cartão de crédito a compra vem positiva;
  // na conta bancária a saída vem negativa.
  if (account.type === "CREDIT") return tx.amount >= 0 ? "expense" : "income"
  return tx.amount < 0 ? "expense" : "income"
}

/**
 * Converte uma transação da Pluggy em lançamento local, ou `null` quando ela
 * não deve entrar (valor zero, pendente/agendada, ou fora do padrão).
 */
export function toLocalTransaction(
  tx: PluggyTransaction,
  account: PluggyAccount
): Transaction | null {
  if (tx.status === "PENDING") return null
  const amountCents = Math.round(Math.abs(tx.amount) * 100)
  if (!Number.isFinite(amountCents) || amountCents === 0) return null
  const date = tx.date?.slice(0, 10)
  if (!date || !/^\d{4}-\d{2}-\d{2}$/.test(date)) return null

  const type = directionOf(tx, account)
  const label = (tx.description || tx.descriptionRaw || "").trim()
  return {
    id: newId(),
    type,
    amountCents,
    categoryId: mapCategory(tx.category, type),
    date,
    note: label ? label.slice(0, 120) : undefined,
    pluggyId: tx.id,
  }
}
