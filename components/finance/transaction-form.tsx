"use client"

import { useEffect, useState } from "react"
import { Trash2 } from "lucide-react"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet"
import { categoriesOf } from "@/lib/finance/categories"
import { centsToBRL, parseBRLInput } from "@/lib/finance/summary"
import { todayISO, type Transaction, type TransactionType } from "@/lib/finance/types"
import { cn } from "@/lib/utils"

interface TransactionFormProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  /** transação sendo editada; undefined = novo lançamento */
  editing?: Transaction
  onSave: (tx: Omit<Transaction, "id">, id?: string) => void
  onDelete: (id: string) => void
}

export function TransactionForm({
  open,
  onOpenChange,
  editing,
  onSave,
  onDelete,
}: TransactionFormProps) {
  const [type, setType] = useState<TransactionType>("expense")
  const [amount, setAmount] = useState("")
  const [categoryId, setCategoryId] = useState("")
  const [date, setDate] = useState(todayISO())
  const [note, setNote] = useState("")

  useEffect(() => {
    if (!open) return
    if (editing) {
      setType(editing.type)
      setAmount((editing.amountCents / 100).toFixed(2).replace(".", ","))
      setCategoryId(editing.categoryId)
      setDate(editing.date)
      setNote(editing.note ?? "")
    } else {
      setType("expense")
      setAmount("")
      setCategoryId("")
      setDate(todayISO())
      setNote("")
    }
  }, [open, editing])

  const categories = categoriesOf(type)
  const amountCents = parseBRLInput(amount)

  function handleTypeChange(next: TransactionType) {
    setType(next)
    setCategoryId("")
  }

  function handleSubmit() {
    if (!amountCents) {
      toast.error("Informe um valor válido")
      return
    }
    if (!categoryId) {
      toast.error("Escolha uma categoria")
      return
    }
    if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
      toast.error("Informe uma data válida")
      return
    }
    onSave(
      { type, amountCents, categoryId, date, note: note.trim() || undefined },
      editing?.id
    )
    onOpenChange(false)
  }

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side="bottom"
        className="max-h-[92dvh] overflow-y-auto rounded-t-2xl pb-[max(1.5rem,env(safe-area-inset-bottom))]"
      >
        <SheetHeader className="text-left">
          <SheetTitle>{editing ? "Editar lançamento" : "Novo lançamento"}</SheetTitle>
        </SheetHeader>

        <div className="mt-4 space-y-5">
          <div className="grid grid-cols-2 gap-2 rounded-lg bg-muted p-1">
            {(
              [
                ["expense", "Despesa"],
                ["income", "Receita"],
              ] as const
            ).map(([value, label]) => (
              <button
                key={value}
                type="button"
                onClick={() => handleTypeChange(value)}
                className={cn(
                  "rounded-md py-2 text-sm font-medium transition-colors",
                  type === value
                    ? "bg-background shadow-sm"
                    : "text-muted-foreground"
                )}
              >
                {label}
              </button>
            ))}
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="amount">Valor</Label>
            <Input
              id="amount"
              inputMode="decimal"
              placeholder="0,00"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              className="text-lg font-semibold"
              autoFocus={!editing}
            />
            {amountCents !== null && (
              <p className="text-xs text-muted-foreground">
                {centsToBRL(amountCents)}
              </p>
            )}
          </div>

          <div className="space-y-1.5">
            <Label>Categoria</Label>
            <div className="grid grid-cols-3 gap-2">
              {categories.map((c) => {
                const Icon = c.icon
                const selected = categoryId === c.id
                return (
                  <button
                    key={c.id}
                    type="button"
                    onClick={() => setCategoryId(c.id)}
                    className={cn(
                      "flex flex-col items-center gap-1 rounded-lg border px-2 py-2.5 text-xs transition-colors",
                      selected
                        ? "border-brand bg-brand/10 font-medium text-brand"
                        : "border-border text-muted-foreground hover:bg-accent"
                    )}
                  >
                    <Icon className="h-4 w-4" />
                    <span className="truncate">{c.label}</span>
                  </button>
                )
              })}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="date">Data</Label>
              <Input
                id="date"
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="note">Descrição (opcional)</Label>
              <Input
                id="note"
                placeholder="Ex.: almoço"
                value={note}
                onChange={(e) => setNote(e.target.value)}
              />
            </div>
          </div>

          <div className="flex gap-3 pt-1">
            {editing && (
              <Button
                variant="outline"
                size="icon"
                aria-label="Excluir lançamento"
                className="shrink-0 text-destructive"
                onClick={() => {
                  onDelete(editing.id)
                  onOpenChange(false)
                }}
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            )}
            <Button className="flex-1 bg-brand hover:bg-brand/90" onClick={handleSubmit}>
              Salvar
            </Button>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  )
}
