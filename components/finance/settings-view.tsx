"use client"

import { useRef, useState } from "react"
import {
  Download,
  FileSpreadsheet,
  ShieldCheck,
  Smartphone,
  Trash2,
  Upload,
} from "lucide-react"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { PluggyCard } from "@/components/finance/pluggy-card"
import { downloadBackup, downloadCSV } from "@/lib/finance/download"
import { parseBackup, type ParsedBackup } from "@/lib/finance/store"
import type { BudgetMap, Transaction } from "@/lib/finance/types"

interface SettingsViewProps {
  transactions: Transaction[]
  budgets: BudgetMap
  onReplaceAll: (transactions: Transaction[], budgets?: BudgetMap) => void
  onImportMerge: (transactions: Transaction[]) => {
    added: number
    skipped: number
  }
}

export function SettingsView({
  transactions,
  budgets,
  onReplaceAll,
  onImportMerge,
}: SettingsViewProps) {
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [confirmClear, setConfirmClear] = useState(false)
  const [pendingImport, setPendingImport] = useState<ParsedBackup | null>(null)

  function handleExport() {
    downloadBackup(transactions, budgets)
    toast.success("Backup exportado")
  }

  function handleExportCSV() {
    downloadCSV(transactions)
    toast.success("Extrato CSV exportado")
  }

  async function handleImportFile(file: File) {
    try {
      const imported = parseBackup(await file.text())
      setPendingImport(imported)
    } catch {
      toast.error("Arquivo de backup inválido")
    }
  }

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-base">
            <ShieldCheck className="h-4 w-4 text-[#006300]" />
            Seus dados são só seus
          </CardTitle>
          <CardDescription>
            Tudo fica salvo apenas neste aparelho, no armazenamento do navegador
            — o Meu Bolso não tem servidor. Se você conectar o open finance, o
            app fala direto com a API da Pluggy usando as suas credenciais. Por
            isso, faça backups: se limpar os dados do navegador, os lançamentos
            são perdidos.
          </CardDescription>
        </CardHeader>
      </Card>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Backup</CardTitle>
          <CardDescription>
            Exporte um arquivo JSON com todos os lançamentos (
            {transactions.length} no total) e orçamentos, ou restaure de um
            backup anterior.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3 pb-5">
          <div className="flex gap-3">
            <Button variant="outline" className="flex-1" onClick={handleExport}>
              <Download className="mr-2 h-4 w-4" />
              Exportar
            </Button>
            <Button
              variant="outline"
              className="flex-1"
              onClick={() => fileInputRef.current?.click()}
            >
              <Upload className="mr-2 h-4 w-4" />
              Importar
            </Button>
          </div>
          <Button
            variant="outline"
            className="w-full"
            onClick={handleExportCSV}
            disabled={transactions.length === 0}
          >
            <FileSpreadsheet className="mr-2 h-4 w-4" />
            Exportar extrato em CSV (planilha)
          </Button>
          <input
            ref={fileInputRef}
            type="file"
            accept="application/json,.json"
            className="hidden"
            onChange={(e) => {
              const file = e.target.files?.[0]
              if (file) void handleImportFile(file)
              e.target.value = ""
            }}
          />
        </CardContent>
      </Card>

      <PluggyCard onImport={onImportMerge} />

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-base">
            <Smartphone className="h-4 w-4" />
            Instalar no celular
          </CardTitle>
          <CardDescription>
            No Android (Chrome): menu ⋮ → &quot;Adicionar à tela inicial&quot;. No
            iPhone (Safari): botão de compartilhar → &quot;Adicionar à Tela de
            Início&quot;. O app funciona offline depois de instalado.
          </CardDescription>
        </CardHeader>
      </Card>

      <Card className="border-destructive/30">
        <CardHeader className="pb-3">
          <CardTitle className="text-base text-destructive">Zona de perigo</CardTitle>
          <CardDescription>
            Apaga todos os lançamentos e orçamentos deste aparelho. Essa ação
            não pode ser desfeita.
          </CardDescription>
        </CardHeader>
        <CardContent className="pb-5">
          <Button
            variant="outline"
            className="w-full text-destructive"
            onClick={() => setConfirmClear(true)}
          >
            <Trash2 className="mr-2 h-4 w-4" />
            Apagar todos os dados
          </Button>
        </CardContent>
      </Card>

      <Dialog open={confirmClear} onOpenChange={setConfirmClear}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Apagar tudo?</DialogTitle>
            <DialogDescription>
              Todos os {transactions.length} lançamentos serão apagados deste
              aparelho. Se quiser, exporte um backup antes.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setConfirmClear(false)}>
              Cancelar
            </Button>
            <Button
              variant="destructive"
              onClick={() => {
                onReplaceAll([], {})
                setConfirmClear(false)
                toast.success("Dados apagados")
              }}
            >
              Apagar tudo
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog
        open={pendingImport !== null}
        onOpenChange={(open) => !open && setPendingImport(null)}
      >
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Restaurar backup?</DialogTitle>
            <DialogDescription>
              O arquivo contém {pendingImport?.transactions.length ?? 0}{" "}
              lançamentos. Eles vão substituir os {transactions.length}{" "}
              lançamentos atuais deste aparelho.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setPendingImport(null)}>
              Cancelar
            </Button>
            <Button
              onClick={() => {
                if (pendingImport) {
                  onReplaceAll(pendingImport.transactions, pendingImport.budgets)
                  toast.success("Backup restaurado")
                }
                setPendingImport(null)
              }}
            >
              Restaurar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
