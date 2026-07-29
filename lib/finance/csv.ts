import { getCategory } from "./categories"
import type { Transaction } from "./types"

/**
 * Export CSV do extrato — função pura, testada em `csv.test.ts`.
 * Formato pensado para Excel/Numbers/Sheets em pt-BR: separador `;`,
 * decimal com vírgula e BOM UTF-8 (acentos corretos no Excel).
 */

const SEPARATOR = ";"
const HEADER = ["data", "tipo", "categoria", "valor", "observacao"].join(SEPARATOR)

/** BOM UTF-8: sem ele o Excel pt-BR abre os acentos quebrados */
export const CSV_BOM = "\ufeff"

function escapeField(value: string): string {
  if (/[";\n\r]/.test(value)) {
    return `"${value.replace(/"/g, '""')}"`
  }
  return value
}

/** 123456 → "1234,56" (sem separador de milhar, p/ planilha reconhecer número) */
export function centsToCSVNumber(cents: number): string {
  const sign = cents < 0 ? "-" : ""
  const abs = Math.abs(cents)
  const reais = Math.floor(abs / 100)
  const centavos = String(abs % 100).padStart(2, "0")
  return `${sign}${reais},${centavos}`
}

export function transactionsToCSV(transactions: Transaction[]): string {
  const rows = transactions.map((t) =>
    [
      t.date,
      t.type === "income" ? "receita" : "despesa",
      escapeField(getCategory(t.categoryId).label),
      centsToCSVNumber(t.amountCents),
      escapeField(t.note ?? ""),
    ].join(SEPARATOR)
  )
  return CSV_BOM + [HEADER, ...rows].join("\r\n") + "\r\n"
}
