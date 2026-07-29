import {
  CURRENT_SCHEMA_VERSION,
  migrateStoredData,
  type StoredData,
} from "./migrations"
import type { BudgetMap, Transaction } from "./types"

/**
 * Camada de persistência do app (localStorage). Única parte do motor que toca
 * o DOM — mantida separada para os testes rodarem com um stub simples.
 *
 * A chave NÃO muda quando o schema evolui: `meu-bolso:v1` é namespace do app;
 * a versão do schema vive DENTRO do payload (`version`), lida pelo pipeline
 * de `migrations.ts`.
 */
export const STORAGE_KEY = "meu-bolso:v1"

/** chave do snapshot automático gravado antes de migrar para a versão `v` */
export function preMigrationBackupKey(v: number): string {
  return `meu-bolso:backup:pre-v${v}`
}

/**
 * Campos desconhecidos do payload (de versões futuras) capturados na última
 * leitura — reanexados em toda gravação para nunca serem descartados.
 */
let extraFields: Record<string, unknown> = {}

const KNOWN_FIELDS = new Set(["version", "transactions", "budgets"])

function captureExtras(data: StoredData) {
  const rest: Record<string, unknown> = {}
  for (const [key, value] of Object.entries(data)) {
    if (!KNOWN_FIELDS.has(key)) rest[key] = value
  }
  extraFields = rest
}

/**
 * Lê o payload do aparelho, migrando se necessário. Quando uma migração roda:
 * 1. o payload ORIGINAL é salvo em `meu-bolso:backup:pre-v{N}` (uma única vez —
 *    nunca sobrescrito, para o rollback manual apontar sempre ao dado pré-migração);
 * 2. o resultado migrado é persistido de volta.
 * Payload corrompido/irreconhecível NUNCA é sobrescrito na leitura.
 */
export function loadFromStorage(): {
  transactions: Transaction[]
  budgets: BudgetMap
} {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return { transactions: [], budgets: {} }
    const outcome = migrateStoredData(JSON.parse(raw))
    if (outcome.migrated) {
      try {
        const backupKey = preMigrationBackupKey(CURRENT_SCHEMA_VERSION)
        if (localStorage.getItem(backupKey) === null) {
          localStorage.setItem(backupKey, raw)
        }
      } catch {
        // sem espaço p/ o snapshot: segue com a migração mesmo assim
      }
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(outcome.data))
      } catch {
        // falhou persistir agora; a próxima escrita normal salva já migrado
      }
    }
    captureExtras(outcome.data)
    return {
      transactions: outcome.data.transactions,
      budgets: outcome.data.budgets,
    }
  } catch {
    return { transactions: [], budgets: {} }
  }
}

export function saveToStorage(transactions: Transaction[], budgets: BudgetMap) {
  const data: StoredData = {
    ...extraFields,
    version: CURRENT_SCHEMA_VERSION,
    transactions,
    budgets,
  }
  localStorage.setItem(STORAGE_KEY, JSON.stringify(data))
}

/** somente para testes: zera o estado interno entre casos */
export function __resetPersistenceForTests() {
  extraFields = {}
}
