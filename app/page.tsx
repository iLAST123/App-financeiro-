"use client"

import { useMemo, useState } from "react"
import { List, PieChart, Plus, Settings } from "lucide-react"
import { toast } from "sonner"
import { BudgetEditor } from "@/components/finance/budget-editor"
import { BudgetsCard } from "@/components/finance/budgets-card"
import { CategoryBars } from "@/components/finance/category-bars"
import { HistoryChart } from "@/components/finance/history-chart"
import { InsightCards } from "@/components/finance/insight-cards"
import { MonthPicker } from "@/components/finance/month-picker"
import { SettingsView } from "@/components/finance/settings-view"
import { SummaryCards } from "@/components/finance/summary-cards"
import { TransactionForm } from "@/components/finance/transaction-form"
import { TransactionList } from "@/components/finance/transaction-list"
import { EmptyState } from "@/components/ui/EmptyState"
import { Skeleton } from "@/components/ui/skeleton"
import { budgetStatuses } from "@/lib/finance/budgets"
import { buildInsights } from "@/lib/finance/insights"
import { useTransactions } from "@/lib/finance/store"
import {
  expensesByCategory,
  lastMonthsSeries,
  summarize,
  transactionsOfMonth,
} from "@/lib/finance/summary"
import {
  currentMonthKey,
  shiftMonth,
  type BudgetMap,
  type Transaction,
} from "@/lib/finance/types"
import { cn } from "@/lib/utils"

type Tab = "resumo" | "extrato" | "ajustes"

const TABS: { id: Tab; label: string; icon: typeof PieChart }[] = [
  { id: "resumo", label: "Resumo", icon: PieChart },
  { id: "extrato", label: "Extrato", icon: List },
  { id: "ajustes", label: "Ajustes", icon: Settings },
]

export default function HomePage() {
  const {
    transactions,
    budgets,
    ready,
    add,
    update,
    remove,
    replaceAll,
    saveBudgets,
  } = useTransactions()
  const [tab, setTab] = useState<Tab>("resumo")
  const [month, setMonth] = useState(currentMonthKey)
  const [formOpen, setFormOpen] = useState(false)
  const [budgetEditorOpen, setBudgetEditorOpen] = useState(false)
  const [editing, setEditing] = useState<Transaction | undefined>(undefined)

  const monthTransactions = useMemo(
    () => transactionsOfMonth(transactions, month),
    [transactions, month]
  )
  const summary = useMemo(() => summarize(monthTransactions), [monthTransactions])
  const categoryTotals = useMemo(
    () => expensesByCategory(monthTransactions),
    [monthTransactions]
  )
  const historyPoints = useMemo(() => {
    const months = Array.from({ length: 6 }, (_, i) => shiftMonth(month, i - 5))
    return lastMonthsSeries(transactions, months)
  }, [transactions, month])
  const budgetStats = useMemo(
    () => budgetStatuses(monthTransactions, budgets),
    [monthTransactions, budgets]
  )
  const insights = useMemo(
    () => buildInsights(transactions, month, budgets),
    [transactions, month, budgets]
  )

  function openNew() {
    setEditing(undefined)
    setFormOpen(true)
  }

  function openEdit(tx: Transaction) {
    setEditing(tx)
    setFormOpen(true)
  }

  function handleSave(tx: Omit<Transaction, "id">, id?: string) {
    if (id) {
      update({ ...tx, id })
      toast.success("Lançamento atualizado")
    } else {
      add(tx)
      toast.success(tx.type === "income" ? "Receita registrada" : "Despesa registrada")
    }
  }

  function handleDelete(id: string) {
    remove(id)
    toast.success("Lançamento excluído")
  }

  function handleSaveBudgets(next: BudgetMap) {
    saveBudgets(next)
    toast.success("Orçamentos salvos")
  }

  return (
    <div className="mx-auto flex min-h-dvh w-full max-w-md flex-col">
      <header className="flex items-center justify-between px-4 pb-2 pt-[max(1rem,env(safe-area-inset-top))]">
        <h1 className="text-lg font-bold tracking-tight">
          Meu <span className="text-brand">Bolso</span>
        </h1>
      </header>

      <main className="flex-1 space-y-4 px-4 pb-32">
        {!ready ? (
          <div className="space-y-3">
            <Skeleton className="h-28 w-full" />
            <div className="grid grid-cols-2 gap-3">
              <Skeleton className="h-20" />
              <Skeleton className="h-20" />
            </div>
            <Skeleton className="h-48 w-full" />
          </div>
        ) : tab === "ajustes" ? (
          <SettingsView
            transactions={transactions}
            budgets={budgets}
            onReplaceAll={replaceAll}
          />
        ) : (
          <>
            <MonthPicker month={month} onChange={setMonth} />
            {tab === "resumo" && (
              <>
                <SummaryCards summary={summary} />
                {monthTransactions.length === 0 ? (
                  <>
                    <EmptyState
                      title="Nada por aqui ainda"
                      description="Registre receitas e despesas no botão + e acompanhe seu mês."
                    />
                    {budgetStats.length > 0 && (
                      <BudgetsCard
                        statuses={budgetStats}
                        onEdit={() => setBudgetEditorOpen(true)}
                      />
                    )}
                  </>
                ) : (
                  <>
                    <InsightCards insights={insights} />
                    <BudgetsCard
                      statuses={budgetStats}
                      onEdit={() => setBudgetEditorOpen(true)}
                    />
                    <CategoryBars totals={categoryTotals} />
                    <HistoryChart points={historyPoints} />
                  </>
                )}
              </>
            )}
            {tab === "extrato" && (
              <TransactionList
                transactions={monthTransactions}
                onSelect={openEdit}
              />
            )}
          </>
        )}
      </main>

      <button
        type="button"
        onClick={openNew}
        aria-label="Novo lançamento"
        className="fixed bottom-[calc(4.5rem+env(safe-area-inset-bottom))] right-[max(1rem,calc(50%-13rem))] z-40 flex h-14 w-14 items-center justify-center rounded-full bg-brand text-brand-foreground shadow-lg transition-transform active:scale-95"
      >
        <Plus className="h-6 w-6" />
      </button>

      <nav className="fixed inset-x-0 bottom-0 z-30 border-t bg-background/95 backdrop-blur">
        <div className="mx-auto grid max-w-md grid-cols-3 pb-[env(safe-area-inset-bottom)]">
          {TABS.map(({ id, label, icon: Icon }) => (
            <button
              key={id}
              type="button"
              onClick={() => setTab(id)}
              className={cn(
                "flex flex-col items-center gap-0.5 py-2.5 text-xs transition-colors",
                tab === id ? "font-medium text-brand" : "text-muted-foreground"
              )}
            >
              <Icon className="h-5 w-5" />
              {label}
            </button>
          ))}
        </div>
      </nav>

      <TransactionForm
        open={formOpen}
        onOpenChange={setFormOpen}
        editing={editing}
        onSave={handleSave}
        onDelete={handleDelete}
      />

      <BudgetEditor
        open={budgetEditorOpen}
        onOpenChange={setBudgetEditorOpen}
        budgets={budgets}
        onSave={handleSaveBudgets}
      />
    </div>
  )
}
