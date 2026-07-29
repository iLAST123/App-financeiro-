/**
 * Cliente mínimo da API da Pluggy (https://docs.pluggy.ai), chamado DIRETO do
 * navegador — modelo BYOK ("bring your own key"): as credenciais são do próprio
 * usuário e falam direto com a Pluggy. Não existe (nem passa por) servidor nosso.
 *
 * Endpoints usados — todos com CORS liberado pela Pluggy
 * (`access-control-allow-origin: *`, verificado em 2026-07-29, inclusive nas
 * respostas de erro):
 *   POST /auth                          → apiKey (validade ~2h; fica só em memória)
 *   GET  /accounts?itemId=…             → contas de uma conexão (Item)
 *   GET  /v2/transactions?accountId=…   → transações por conta (cursor `after`/`next`)
 *
 * Não existe endpoint de LISTAGEM de items na API (decisão da Pluggy, por
 * segurança) — por isso o usuário informa o(s) Item ID(s) copiados do
 * dashboard da Pluggy.
 */

const BASE_URL = "https://api.pluggy.ai"

/** Quantas páginas de 500 transações aceitamos por conta antes de parar. */
const MAX_PAGES = 20

export interface PluggyAccount {
  id: string
  itemId: string
  /** "BANK" (conta corrente/poupança) ou "CREDIT" (cartão de crédito) */
  type: string
  subtype?: string | null
  name: string
  marketingName?: string | null
  number?: string | null
  balance: number
  currencyCode: string
}

export interface PluggyTransaction {
  id: string
  description: string
  descriptionRaw?: string | null
  /** valor em reais (float, com sinal — convenção varia entre BANK e CREDIT) */
  amount: number
  /** ISO8601; usamos só a parte YYYY-MM-DD */
  date: string
  /** categoria em inglês do categorizador da Pluggy (pode vir null) */
  category?: string | null
  categoryId?: string | null
  /** "DEBIT" (saída) ou "CREDIT" (entrada) */
  type?: string | null
  /** "POSTED" ou "PENDING" */
  status?: string | null
}

export class PluggyError extends Error {
  constructor(
    message: string,
    readonly status?: number
  ) {
    super(message)
    this.name = "PluggyError"
  }
}

function friendlyMessage(status: number, codeDescription?: string): string {
  if (status === 401 || codeDescription === "CLIENT_KEYS_UNAUTHORIZED") {
    return "Client ID ou Client Secret inválidos. Confira no dashboard da Pluggy."
  }
  if (status === 403) {
    return "Sessão com a Pluggy expirou ou é inválida. Teste a conexão novamente."
  }
  if (status === 404) {
    return "Não encontrado na Pluggy — confira se o Item ID está correto e a conexão ainda existe."
  }
  if (status === 429) {
    return "Muitas chamadas à Pluggy em sequência. Aguarde um minuto e tente de novo."
  }
  return `Erro na API da Pluggy (HTTP ${status}).`
}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  let response: Response
  try {
    response = await fetch(`${BASE_URL}${path}`, init)
  } catch {
    throw new PluggyError(
      "Não deu para falar com a Pluggy. Verifique sua conexão com a internet."
    )
  }
  if (!response.ok) {
    let codeDescription: string | undefined
    try {
      const body = (await response.json()) as { codeDescription?: string }
      codeDescription = body.codeDescription
    } catch {
      // corpo não-JSON: segue só com o status
    }
    throw new PluggyError(
      friendlyMessage(response.status, codeDescription),
      response.status
    )
  }
  return (await response.json()) as T
}

/** POST /auth — troca clientId+clientSecret por uma apiKey (validade ~2h). */
export async function createApiKey(
  clientId: string,
  clientSecret: string
): Promise<string> {
  const data = await request<{ apiKey: string }>("/auth", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ clientId, clientSecret }),
  })
  return data.apiKey
}

/** GET /accounts?itemId=… — contas de uma conexão. */
export async function fetchAccounts(
  apiKey: string,
  itemId: string
): Promise<PluggyAccount[]> {
  const data = await request<{ results: PluggyAccount[] }>(
    `/accounts?itemId=${encodeURIComponent(itemId)}`,
    { headers: { "X-API-KEY": apiKey } }
  )
  return data.results
}

/**
 * GET /v2/transactions — todas as transações da conta no intervalo de datas
 * (YYYY-MM-DD, inclusivo), seguindo o cursor `next` até o fim.
 */
export async function fetchTransactions(
  apiKey: string,
  accountId: string,
  dateFrom: string,
  dateTo: string
): Promise<PluggyTransaction[]> {
  const results: PluggyTransaction[] = []
  let after: string | null = null
  for (let page = 0; page < MAX_PAGES; page++) {
    const params = new URLSearchParams({ accountId, dateFrom, dateTo })
    if (after) params.set("after", after)
    const data: { results: PluggyTransaction[]; next?: string | null } =
      await request(`/v2/transactions?${params.toString()}`, {
        headers: { "X-API-KEY": apiKey },
      })
    results.push(...data.results)
    if (!data.next) return results
    after = data.next
  }
  return results
}
