"use client"

import { useEffect, useMemo, useState } from "react"
import { Landmark, Loader2, Trash2 } from "lucide-react"
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
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea"
import {
  createApiKey,
  fetchAccounts,
  fetchTransactions,
  PluggyError,
  type PluggyAccount,
} from "@/lib/pluggy/client"
import {
  clearPluggyCredentials,
  loadPluggyCredentials,
  parseItemIds,
  savePluggyCredentials,
  type PluggyCredentials,
} from "@/lib/pluggy/credentials"
import { toLocalTransaction } from "@/lib/pluggy/mapping"
import { centsToBRL } from "@/lib/finance/summary"
import {
  currentMonthKey,
  daysInMonth,
  monthLabel,
  shiftMonth,
  type MonthKey,
  type Transaction,
} from "@/lib/finance/types"

interface PluggyCardProps {
  onImport: (transactions: Transaction[]) => { added: number; skipped: number }
}

type Step = "form" | "accounts"

export function PluggyCard({ onImport }: PluggyCardProps) {
  const [saved, setSaved] = useState<PluggyCredentials | null>(null)
  const [open, setOpen] = useState(false)
  const [step, setStep] = useState<Step>("form")
  const [busy, setBusy] = useState(false)

  const [clientId, setClientId] = useState("")
  const [clientSecret, setClientSecret] = useState("")
  const [itemIdsRaw, setItemIdsRaw] = useState("")

  // apiKey da Pluggy (validade ~2h): só em memória, nunca persistida
  const [apiKey, setApiKey] = useState<string | null>(null)
  const [accounts, setAccounts] = useState<PluggyAccount[]>([])
  const [selected, setSelected] = useState<Set<string>>(new Set())
  const [month, setMonth] = useState<MonthKey>(currentMonthKey)

  useEffect(() => {
    setSaved(loadPluggyCredentials())
  }, [])

  const monthOptions = useMemo(() => {
    const current = currentMonthKey()
    return Array.from({ length: 12 }, (_, i) => shiftMonth(current, -i))
  }, [])

  function openDialog() {
    const credentials = loadPluggyCredentials()
    setClientId(credentials?.clientId ?? "")
    setClientSecret(credentials?.clientSecret ?? "")
    setItemIdsRaw(credentials?.itemIds.join("\n") ?? "")
    setStep("form")
    setApiKey(null)
    setAccounts([])
    setSelected(new Set())
    setMonth(currentMonthKey())
    setOpen(true)
  }

  function failure(error: unknown) {
    toast.error(
      error instanceof PluggyError
        ? error.message
        : "Algo deu errado ao falar com a Pluggy."
    )
  }

  async function handleTest() {
    const itemIds = parseItemIds(itemIdsRaw)
    if (!clientId.trim() || !clientSecret.trim()) {
      toast.error("Preencha o Client ID e o Client Secret.")
      return
    }
    if (itemIds.length === 0) {
      toast.error("Informe pelo menos um Item ID (um por linha).")
      return
    }
    setBusy(true)
    try {
      const key = await createApiKey(clientId.trim(), clientSecret.trim())
      const found: PluggyAccount[] = []
      const failedItems: string[] = []
      for (const itemId of itemIds) {
        try {
          found.push(...(await fetchAccounts(key, itemId)))
        } catch {
          failedItems.push(itemId)
        }
      }
      if (found.length === 0) {
        toast.error(
          "Conexão com a Pluggy ok, mas nenhuma conta foi encontrada — confira os Item IDs."
        )
        return
      }
      // mesma conta pode aparecer sob mais de um Item — dedupe por id
      const unique = Array.from(
        new Map(found.map((account) => [account.id, account])).values()
      )
      const credentials: PluggyCredentials = {
        clientId: clientId.trim(),
        clientSecret: clientSecret.trim(),
        itemIds,
      }
      savePluggyCredentials(credentials)
      setSaved(credentials)
      setApiKey(key)
      setAccounts(unique)
      setSelected(new Set(unique.map((account) => account.id)))
      setStep("accounts")
      if (failedItems.length > 0) {
        toast.warning(
          `${failedItems.length} Item ID(s) não retornaram contas e foram ignorados.`
        )
      }
    } catch (error) {
      failure(error)
    } finally {
      setBusy(false)
    }
  }

  async function handleImport() {
    if (!apiKey || selected.size === 0) return
    setBusy(true)
    try {
      const dateFrom = `${month}-01`
      const dateTo = `${month}-${String(daysInMonth(month)).padStart(2, "0")}`
      const imported: Transaction[] = []
      for (const account of accounts) {
        if (!selected.has(account.id)) continue
        const transactions = await fetchTransactions(
          apiKey,
          account.id,
          dateFrom,
          dateTo
        )
        for (const tx of transactions) {
          const local = toLocalTransaction(tx, account)
          if (local) imported.push(local)
        }
      }
      const { added, skipped } = onImport(imported)
      if (added === 0 && skipped === 0) {
        toast.info("Nenhum lançamento efetivado nesse mês nas contas escolhidas.")
      } else if (added === 0) {
        toast.info(`Nada novo: os ${skipped} lançamentos já estavam no extrato.`)
      } else {
        toast.success(
          skipped > 0
            ? `${added} lançamentos importados (${skipped} já existiam).`
            : `${added} lançamentos importados.`
        )
      }
      setOpen(false)
    } catch (error) {
      failure(error)
    } finally {
      setBusy(false)
    }
  }

  function handleRemove() {
    clearPluggyCredentials()
    setSaved(null)
    setApiKey(null)
    toast.success("Credenciais removidas deste aparelho")
  }

  function toggleAccount(id: string) {
    setSelected((previous) => {
      const next = new Set(previous)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-base">
          <Landmark className="h-4 w-4 text-brand" />
          Open finance (Pluggy)
        </CardTitle>
        <CardDescription>
          Importe o extrato direto do banco usando a <strong>sua</strong>{" "}
          própria conta da Pluggy (Meu Pluggy). O app fala direto com a API da
          Pluggy — suas credenciais e seus dados não passam por nenhum servidor
          do Meu Bolso.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-3 pb-5">
        {saved ? (
          <>
            <p className="text-xs text-muted-foreground">
              Credenciais salvas neste aparelho (Client ID final{" "}
              <span className="font-mono">…{saved.clientId.slice(-4)}</span>,{" "}
              {saved.itemIds.length}{" "}
              {saved.itemIds.length === 1 ? "conexão" : "conexões"}).
            </p>
            <div className="flex gap-3">
              <Button className="flex-1" onClick={openDialog}>
                Importar do banco
              </Button>
              <Button
                variant="outline"
                className="flex-1 text-destructive"
                onClick={handleRemove}
              >
                <Trash2 className="mr-2 h-4 w-4" />
                Remover credencial
              </Button>
            </div>
          </>
        ) : (
          <Button className="w-full" onClick={openDialog}>
            Conectar minha conta Pluggy
          </Button>
        )}
      </CardContent>

      <Dialog open={open} onOpenChange={(next) => !busy && setOpen(next)}>
        <DialogContent className="max-h-[85dvh] max-w-sm overflow-y-auto">
          {step === "form" ? (
            <>
              <DialogHeader className="text-left">
                <DialogTitle>Conectar à Pluggy</DialogTitle>
                <DialogDescription>
                  Use as credenciais da <strong>sua</strong> conta Pluggy (ou de
                  um familiar, com consentimento — cada pessoa conecta as
                  próprias contas na Pluggy).
                </DialogDescription>
              </DialogHeader>

              <div className="space-y-3">
                <div className="space-y-1.5">
                  <Label htmlFor="pluggy-client-id">Client ID</Label>
                  <Input
                    id="pluggy-client-id"
                    value={clientId}
                    onChange={(e) => setClientId(e.target.value)}
                    autoComplete="off"
                    spellCheck={false}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="pluggy-client-secret">Client Secret</Label>
                  <Input
                    id="pluggy-client-secret"
                    type="password"
                    value={clientSecret}
                    onChange={(e) => setClientSecret(e.target.value)}
                    autoComplete="off"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="pluggy-item-ids">
                    Item IDs (um por linha)
                  </Label>
                  <Textarea
                    id="pluggy-item-ids"
                    value={itemIdsRaw}
                    onChange={(e) => setItemIdsRaw(e.target.value)}
                    rows={3}
                    placeholder={"ex.: 5f2e…-…-…\numa conexão por linha"}
                    spellCheck={false}
                  />
                </div>

                <details className="rounded-md border px-3 py-2 text-xs text-muted-foreground">
                  <summary className="cursor-pointer font-medium text-foreground">
                    Onde encontro isso?
                  </summary>
                  <ol className="mt-2 list-decimal space-y-1 pl-4">
                    <li>
                      Crie a conta gratuita e conecte seus bancos em{" "}
                      <span className="font-mono">meu.pluggy.ai</span>.
                    </li>
                    <li>
                      Em <span className="font-mono">dashboard.pluggy.ai</span>,
                      crie um <em>Application</em> e copie o Client ID e o
                      Client Secret.
                    </li>
                    <li>
                      Ainda no dashboard, abra o app <em>Demo</em>, entre com o
                      Meu Pluggy e, no menu ⋮ de cada conexão, use{" "}
                      <em>&quot;Copiar Item ID&quot;</em>.
                    </li>
                  </ol>
                </details>

                <div className="rounded-md border border-amber-500/40 bg-amber-500/10 px-3 py-2 text-xs leading-relaxed text-muted-foreground">
                  <p className="font-medium text-foreground">
                    Sobre a sua credencial
                  </p>
                  <p>
                    Ao testar a conexão, ela fica salva{" "}
                    <strong>somente neste aparelho</strong> (armazenamento do
                    navegador) e é enviada <strong>apenas</strong> para{" "}
                    <span className="font-mono">api.pluggy.ai</span> — o Meu
                    Bolso não tem servidor. Ela dá acesso de leitura ao seu
                    extrato: <strong>não conecte em aparelho compartilhado</strong>{" "}
                    e remova quando quiser no botão &quot;Remover
                    credencial&quot;. O backup exportado nunca inclui a
                    credencial.
                  </p>
                </div>

                <Button
                  className="w-full"
                  onClick={() => void handleTest()}
                  disabled={busy}
                >
                  {busy && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  Testar conexão
                </Button>
              </div>
            </>
          ) : (
            <>
              <DialogHeader className="text-left">
                <DialogTitle>Contas encontradas</DialogTitle>
                <DialogDescription>
                  Escolha as contas e o mês. Só entram transações efetivadas;
                  reimportar não duplica lançamentos.
                </DialogDescription>
              </DialogHeader>

              <div className="space-y-3">
                <ul className="space-y-2">
                  {accounts.map((account) => (
                    <li key={account.id}>
                      <label className="flex cursor-pointer items-center gap-3 rounded-md border px-3 py-2">
                        <input
                          type="checkbox"
                          className="h-4 w-4 accent-brand"
                          checked={selected.has(account.id)}
                          onChange={() => toggleAccount(account.id)}
                        />
                        <span className="min-w-0 flex-1">
                          <span className="block truncate text-sm font-medium">
                            {account.marketingName || account.name}
                          </span>
                          <span className="block text-xs text-muted-foreground">
                            {account.type === "CREDIT"
                              ? "Cartão de crédito"
                              : "Conta"}
                            {typeof account.balance === "number" &&
                              Number.isFinite(account.balance) &&
                              ` · saldo ${centsToBRL(Math.round(account.balance * 100))}`}
                          </span>
                        </span>
                      </label>
                    </li>
                  ))}
                </ul>

                <div className="space-y-1.5">
                  <Label>Mês para importar</Label>
                  <Select
                    value={month}
                    onValueChange={(value) => setMonth(value)}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {monthOptions.map((option) => (
                        <SelectItem key={option} value={option}>
                          {monthLabel(option)}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="flex gap-3">
                  <Button
                    variant="outline"
                    className="flex-1"
                    onClick={() => setStep("form")}
                    disabled={busy}
                  >
                    Voltar
                  </Button>
                  <Button
                    className="flex-1"
                    onClick={() => void handleImport()}
                    disabled={busy || selected.size === 0}
                  >
                    {busy && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    Importar lançamentos
                  </Button>
                </div>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>
    </Card>
  )
}
