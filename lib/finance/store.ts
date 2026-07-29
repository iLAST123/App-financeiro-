"use client"

import { useCallback, useEffect, useState } from "react"
import { CURRENT_SCHEMA_VERSION, sanitizeBudgets } from "./migrations"
import { loadFromStorage, saveToStorage } from "./persistence"
import type { BackupFile, BudgetMap, Transaction } from "./types"

function sortTransactions(transactions: Transaction[]): Transaction[] {
  return [...transactions].sort((a, b) =>
    a.date === b.date ? b.id.localeCompare(a.id) : b.date.localeCompare(a.date)
  )
}

/**
 * Mescla lançamentos importados do open finance com os existentes (MERGE,
 * nunca replace): quem já tem o mesmo `pluggyId` é ignorado — reimportar o
 * mesmo mês quantas vezes for não duplica o extrato. Pura, p/ ser testável.
 */
export function mergeByPluggyId(
  current: Transaction[],
  incoming: Transaction[]
): { merged: Transaction[]; added: number; skipped: number } {
  const known = new Set(current.flatMap((t) => (t.pluggyId ? [t.pluggyId] : [])))
  const fresh: Transaction[] = []
  let skipped = 0
  for (const t of incoming) {
    if (t.pluggyId !== undefined && known.has(t.pluggyId)) {
      skipped++
      continue
    }
    // marca também os do próprio lote: se a API devolver a mesma transação
    // duas vezes (ex.: overlap de cursor), a segunda cópia é descartada aqui
    if (t.pluggyId !== undefined) known.add(t.pluggyId)
    fresh.push(t)
  }
  return { merged: [...current, ...fresh], added: fresh.length, skipped }
}

export function newId(): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID()
  }
  return `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`
}

export function useTransactions() {
  const [transactions, setTransactions] = useState<Transaction[]>([])
  const [budgets, setBudgets] = useState<BudgetMap>({})
  const [ready, setReady] = useState(false)

  useEffect(() => {
    const data = loadFromStorage()
    setTransactions(sortTransactions(data.transactions))
    setBudgets(data.budgets)
    setReady(true)
  }, [])

  const persist = useCallback(
    (nextTransactions: Transaction[], nextBudgets?: BudgetMap) => {
      const sorted = sortTransactions(nextTransactions)
      const budgetsToSave =
        nextBudgets !== undefined
          ? sanitizeBudgets(nextBudgets)
          : loadFromStorage().budgets
      setTransactions(sorted)
      setBudgets(budgetsToSave)
      saveToStorage(sorted, budgetsToSave)
    },
    []
  )

  const add = useCallback(
    (tx: Omit<Transaction, "id">) => {
      persist([...loadFromStorage().transactions, { ...tx, id: newId() }])
    },
    [persist]
  )

  const update = useCallback(
    (tx: Transaction) => {
      persist(
        loadFromStorage().transactions.map((t) => (t.id === tx.id ? tx : t))
      )
    },
    [persist]
  )

  const remove = useCallback(
    (id: string) => {
      persist(loadFromStorage().transactions.filter((t) => t.id !== id))
    },
    [persist]
  )

  /** substitui os lançamentos e, se informado, também os orçamentos */
  const replaceAll = useCallback(
    (next: Transaction[], nextBudgets?: BudgetMap) => {
      persist(next, nextBudgets)
    },
    [persist]
  )

  /** import do open finance: merge deduplicado por `pluggyId` (ver mergeByPluggyId) */
  const importMerge = useCallback(
    (incoming: Transaction[]): { added: number; skipped: number } => {
      const { merged, added, skipped } = mergeByPluggyId(
        loadFromStorage().transactions,
        incoming
      )
      if (added > 0) persist(merged)
      return { added, skipped }
    },
    [persist]
  )

  const saveBudgets = useCallback(
    (next: BudgetMap) => {
      persist(loadFromStorage().transactions, next)
    },
    [persist]
  )

  return {
    transactions,
    budgets,
    ready,
    add,
    update,
    remove,
    replaceAll,
    importMerge,
    saveBudgets,
  }
}

export function buildBackup(
  transactions: Transaction[],
  budgets: BudgetMap = {}
): BackupFile {
  const backup: BackupFile = {
    app: "meu-bolso",
    version: CURRENT_SCHEMA_VERSION,
    exportedAt: new Date().toISOString(),
    transactions,
  }
  if (Object.keys(budgets).length > 0) backup.budgets = budgets
  return backup
}

export interface ParsedBackup {
  transactions: Transaction[]
  /** undefined quando o backup é antigo e não traz orçamentos */
  budgets?: BudgetMap
}

export function parseBackup(raw: string): ParsedBackup {
  const parsed = JSON.parse(raw) as Partial<BackupFile>
  if (parsed.app !== "meu-bolso" || !Array.isArray(parsed.transactions)) {
    throw new Error("Arquivo de backup inválido")
  }
  const transactions = parsed.transactions
    .filter(
      (t): t is Transaction =>
        typeof t === "object" &&
        t !== null &&
        typeof t.id === "string" &&
        (t.type === "income" || t.type === "expense") &&
        typeof t.amountCents === "number" &&
        t.amountCents > 0 &&
        typeof t.categoryId === "string" &&
        typeof t.date === "string" &&
        /^\d{4}-\d{2}-\d{2}$/.test(t.date)
    )
    // `pluggyId` é chave de dedup do open finance: se vier malformado no
    // arquivo, mantém o lançamento mas descarta o campo
    .map((t) => {
      if (t.pluggyId === undefined) return t
      if (typeof t.pluggyId === "string" && t.pluggyId.length > 0) return t
      const clean = { ...t }
      delete clean.pluggyId
      return clean
    })
  return {
    transactions,
    budgets:
      parsed.budgets !== undefined ? sanitizeBudgets(parsed.budgets) : undefined,
  }
}
