export type TransactionType = "income" | "expense"

export interface Transaction {
  id: string
  type: TransactionType
  /** valor em centavos, sempre positivo */
  amountCents: number
  categoryId: string
  /** formato YYYY-MM-DD */
  date: string
  note?: string
}

export interface BackupFile {
  app: "meu-bolso"
  version: 1
  exportedAt: string
  transactions: Transaction[]
}

/** chave de mês no formato YYYY-MM */
export type MonthKey = string

export function monthKeyOf(date: string): MonthKey {
  return date.slice(0, 7)
}

export function todayISO(): string {
  const d = new Date()
  const pad = (n: number) => String(n).padStart(2, "0")
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`
}

export function currentMonthKey(): MonthKey {
  return todayISO().slice(0, 7)
}

export function shiftMonth(month: MonthKey, delta: number): MonthKey {
  const [y, m] = month.split("-").map(Number)
  const d = new Date(y, m - 1 + delta, 1)
  const pad = (n: number) => String(n).padStart(2, "0")
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}`
}

export function monthLabel(month: MonthKey): string {
  const [y, m] = month.split("-").map(Number)
  const label = new Date(y, m - 1, 1).toLocaleDateString("pt-BR", {
    month: "long",
    year: "numeric",
  })
  return label.charAt(0).toUpperCase() + label.slice(1)
}
