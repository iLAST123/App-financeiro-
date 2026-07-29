"use client"

import { markBackupDone } from "./backup-meta"
import { transactionsToCSV } from "./csv"
import { buildBackup } from "./store"
import { todayISO, type BudgetMap, type Transaction } from "./types"

/** dispara o download de um arquivo gerado em memória (só no browser) */
function downloadBlob(content: string, mime: string, filename: string) {
  const blob = new Blob([content], { type: mime })
  const url = URL.createObjectURL(blob)
  const a = document.createElement("a")
  a.href = url
  a.download = filename
  a.click()
  URL.revokeObjectURL(url)
}

/** exporta o backup JSON completo e registra a data (zera o lembrete) */
export function downloadBackup(transactions: Transaction[], budgets: BudgetMap) {
  const backup = buildBackup(transactions, budgets)
  downloadBlob(
    JSON.stringify(backup, null, 2),
    "application/json",
    `meu-bolso-backup-${backup.exportedAt.slice(0, 10)}.json`
  )
  markBackupDone()
}

/** exporta o extrato completo em CSV (planilha); não conta como backup */
export function downloadCSV(transactions: Transaction[]) {
  downloadBlob(
    transactionsToCSV(transactions),
    "text/csv;charset=utf-8",
    `meu-bolso-extrato-${todayISO()}.csv`
  )
}
