"use client"

import { ChevronLeft, ChevronRight } from "lucide-react"
import { Button } from "@/components/ui/button"
import { monthLabel, shiftMonth, type MonthKey } from "@/lib/finance/types"

interface MonthPickerProps {
  month: MonthKey
  onChange: (month: MonthKey) => void
}

export function MonthPicker({ month, onChange }: MonthPickerProps) {
  return (
    <div className="flex items-center justify-between">
      <Button
        variant="ghost"
        size="icon"
        aria-label="Mês anterior"
        onClick={() => onChange(shiftMonth(month, -1))}
      >
        <ChevronLeft className="h-5 w-5" />
      </Button>
      <span className="text-sm font-semibold">{monthLabel(month)}</span>
      <Button
        variant="ghost"
        size="icon"
        aria-label="Próximo mês"
        onClick={() => onChange(shiftMonth(month, 1))}
      >
        <ChevronRight className="h-5 w-5" />
      </Button>
    </div>
  )
}
