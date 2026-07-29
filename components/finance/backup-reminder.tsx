"use client"

import { useEffect, useState } from "react"
import { Download, HardDriveDownload } from "lucide-react"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import {
  readBackupMeta,
  shouldRemindBackup,
  snoozeBackupReminder,
} from "@/lib/finance/backup-meta"
import { downloadBackup } from "@/lib/finance/download"
import type { BudgetMap, Transaction } from "@/lib/finance/types"

interface BackupReminderProps {
  transactions: Transaction[]
  budgets: BudgetMap
}

/**
 * Lembrete periódico de backup: num app local-first, backup é sobrevivência
 * do dado. Aparece quando o último backup (ou "agora não") tem 14+ dias.
 * Não bloqueia nada — um card dispensável no topo do Resumo.
 */
export function BackupReminder({ transactions, budgets }: BackupReminderProps) {
  const [visible, setVisible] = useState(false)

  useEffect(() => {
    setVisible(shouldRemindBackup(readBackupMeta(), new Date(), transactions.length > 0))
  }, [transactions.length])

  if (!visible) return null

  return (
    <Card className="border-brand/30 bg-brand/5">
      <CardContent className="space-y-3 p-4">
        <div className="flex items-start gap-3">
          <HardDriveDownload className="mt-0.5 h-5 w-5 shrink-0 text-brand" />
          <div className="space-y-1">
            <p className="text-sm font-medium">Hora de fazer backup</p>
            <p className="text-xs text-muted-foreground">
              Seus lançamentos vivem só neste aparelho. Exporte um arquivo agora
              — leva um toque.
            </p>
          </div>
        </div>
        <div className="flex gap-2">
          <Button
            size="sm"
            className="flex-1"
            onClick={() => {
              downloadBackup(transactions, budgets)
              setVisible(false)
              toast.success("Backup exportado")
            }}
          >
            <Download className="mr-2 h-4 w-4" />
            Fazer backup
          </Button>
          <Button
            size="sm"
            variant="ghost"
            className="flex-1"
            onClick={() => {
              snoozeBackupReminder()
              setVisible(false)
            }}
          >
            Agora não
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}
