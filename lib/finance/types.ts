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
  /**
   * id da transação na Pluggy (open finance). Presente só em lançamentos
   * importados; é a chave de deduplicação — reimportar nunca duplica.
   */
  pluggyId?: string
}

/** orçamento mensal por categoria: categoryId → teto em centavos */
export type BudgetMap = Record<string, number>

export interface BackupFile {
  app: "meu-bolso"
  /** acompanha a versão do schema local (`CURRENT_SCHEMA_VERSION`); a leitura
   *  (`parseBackup`) é tolerante e valida pelo shape, não pela versão */
  version: number
  exportedAt: string
  transactions: Transaction[]
  /** ausente em backups antigos (antes dos orçamentos) */
  budgets?: BudgetMap
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

export function daysInMonth(month: MonthKey): number {
  const [y, m] = month.split("-").map(Number)
  return new Date(y, m, 0).getDate()
}

export function monthLabel(month: MonthKey): string {
  const [y, m] = month.split("-").map(Number)
  const label = new Date(y, m - 1, 1).toLocaleDateString("pt-BR", {
    month: "long",
    year: "numeric",
  })
  return label.charAt(0).toUpperCase() + label.slice(1)
}
