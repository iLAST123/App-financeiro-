"use client"

import { useCallback, useEffect, useState } from "react"
import type { BackupFile, BudgetMap, Transaction } from "./types"

const STORAGE_KEY = "meu-bolso:v1"

interface StoredData {
  version: 1
  transactions: Transaction[]
  /** orçamento mensal por categoria (categoryId → centavos); opcional p/ dados antigos */
  budgets?: BudgetMap
}

function sanitizeBudgets(raw: unknown): BudgetMap {
  if (typeof raw !== "object" || raw === null) return {}
  const out: BudgetMap = {}
  for (const [categoryId, value] of Object.entries(raw as Record<string, unknown>)) {
    if (typeof value === "number" && Number.isFinite(value) && value > 0) {
      out[categoryId] = Math.round(value)
    }
  }
  return out
}

function loadFromStorage(): { transactions: Transaction[]; budgets: BudgetMap } {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return { transactions: [], budgets: {} }
    const parsed = JSON.parse(raw) as Partial<StoredData>
    return {
      transactions: Array.isArray(parsed.transactions) ? parsed.transactions : [],
      budgets: sanitizeBudgets(parsed.budgets),
    }
  } catch {
    return { transactions: [], budgets: {} }
  }
}

function saveToStorage(transactions: Transaction[], budgets: BudgetMap) {
  const data: StoredData = { version: 1, transactions, budgets }
  localStorage.setItem(STORAGE_KEY, JSON.stringify(data))
}

function sortTransactions(transactions: Transaction[]): Transaction[] {
  return [...transactions].sort((a, b) =>
    a.date === b.date ? b.id.localeCompare(a.id) : b.date.localeCompare(a.date)
  )
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

  const saveBudgets = useCallback(
    (next: BudgetMap) => {
      persist(loadFromStorage().transactions, next)
    },
    [persist]
  )

  return { transactions, budgets, ready, add, update, remove, replaceAll, saveBudgets }
}

export function buildBackup(
  transactions: Transaction[],
  budgets: BudgetMap = {}
): BackupFile {
  const backup: BackupFile = {
    app: "meu-bolso",
    version: 1,
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
  const transactions = parsed.transactions.filter(
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
  return {
    transactions,
    budgets:
      parsed.budgets !== undefined ? sanitizeBudgets(parsed.budgets) : undefined,
  }
}
