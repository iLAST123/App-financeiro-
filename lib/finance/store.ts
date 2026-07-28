"use client"

import { useCallback, useEffect, useState } from "react"
import type { BackupFile, Transaction } from "./types"

const STORAGE_KEY = "meu-bolso:v1"

interface StoredData {
  version: 1
  transactions: Transaction[]
}

function loadFromStorage(): Transaction[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return []
    const parsed = JSON.parse(raw) as StoredData
    if (!Array.isArray(parsed.transactions)) return []
    return parsed.transactions
  } catch {
    return []
  }
}

function saveToStorage(transactions: Transaction[]) {
  const data: StoredData = { version: 1, transactions }
  localStorage.setItem(STORAGE_KEY, JSON.stringify(data))
}

export function newId(): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID()
  }
  return `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`
}

export function useTransactions() {
  const [transactions, setTransactions] = useState<Transaction[]>([])
  const [ready, setReady] = useState(false)

  useEffect(() => {
    setTransactions(loadFromStorage())
    setReady(true)
  }, [])

  const persist = useCallback((next: Transaction[]) => {
    const sorted = [...next].sort((a, b) =>
      a.date === b.date ? b.id.localeCompare(a.id) : b.date.localeCompare(a.date)
    )
    setTransactions(sorted)
    saveToStorage(sorted)
  }, [])

  const add = useCallback(
    (tx: Omit<Transaction, "id">) => {
      persist([...loadFromStorage(), { ...tx, id: newId() }])
    },
    [persist]
  )

  const update = useCallback(
    (tx: Transaction) => {
      persist(loadFromStorage().map((t) => (t.id === tx.id ? tx : t)))
    },
    [persist]
  )

  const remove = useCallback(
    (id: string) => {
      persist(loadFromStorage().filter((t) => t.id !== id))
    },
    [persist]
  )

  const replaceAll = useCallback(
    (next: Transaction[]) => {
      persist(next)
    },
    [persist]
  )

  return { transactions, ready, add, update, remove, replaceAll }
}

export function buildBackup(transactions: Transaction[]): BackupFile {
  return {
    app: "meu-bolso",
    version: 1,
    exportedAt: new Date().toISOString(),
    transactions,
  }
}

export function parseBackup(raw: string): Transaction[] {
  const parsed = JSON.parse(raw) as Partial<BackupFile>
  if (parsed.app !== "meu-bolso" || !Array.isArray(parsed.transactions)) {
    throw new Error("Arquivo de backup inválido")
  }
  return parsed.transactions.filter(
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
}
