/**
 * Credenciais da Pluggy do PRÓPRIO usuário, guardadas SÓ neste aparelho.
 *
 * - Chave separada do `meu-bolso:v1` de propósito: o backup (export JSON)
 *   NUNCA inclui credenciais.
 * - O texto da UI explica onde a credencial fica e como removê-la; a remoção
 *   é imediata (clearPluggyCredentials).
 * - A apiKey (validade ~2h) NÃO é persistida — vive só em memória, na sessão.
 */

const CREDENTIALS_KEY = "meu-bolso:pluggy:v1"

export interface PluggyCredentials {
  clientId: string
  clientSecret: string
  /** conexões (Items) que o usuário informou — copiadas do dashboard da Pluggy */
  itemIds: string[]
}

export function loadPluggyCredentials(): PluggyCredentials | null {
  try {
    const raw = localStorage.getItem(CREDENTIALS_KEY)
    if (!raw) return null
    const parsed = JSON.parse(raw) as Partial<PluggyCredentials>
    if (
      typeof parsed.clientId !== "string" ||
      typeof parsed.clientSecret !== "string" ||
      !Array.isArray(parsed.itemIds)
    ) {
      return null
    }
    return {
      clientId: parsed.clientId,
      clientSecret: parsed.clientSecret,
      itemIds: parsed.itemIds.filter((id): id is string => typeof id === "string"),
    }
  } catch {
    return null
  }
}

export function savePluggyCredentials(credentials: PluggyCredentials): void {
  localStorage.setItem(CREDENTIALS_KEY, JSON.stringify(credentials))
}

export function clearPluggyCredentials(): void {
  localStorage.removeItem(CREDENTIALS_KEY)
}

/** aceita ids separados por vírgula, espaço ou quebra de linha; remove duplicados */
export function parseItemIds(raw: string): string[] {
  return Array.from(
    new Set(
      raw
        .split(/[\s,;]+/)
        .map((id) => id.trim())
        .filter(Boolean)
    )
  )
}
