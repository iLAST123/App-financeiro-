import type { BudgetMap, Transaction } from "./types"

/**
 * Pipeline de migração versionada do schema local (`meu-bolso:v1`).
 *
 * Regras inegociáveis (regra 2 do produto: nunca perder dados):
 * - Toda migração é PURA (sem DOM/localStorage) e testada em `migrations.test.ts`.
 * - Migração nunca descarta campo desconhecido: sempre `...data` primeiro e só
 *   então sobrescrever o que aquela versão muda. Campos de versões futuras (ou
 *   de forks antigos) atravessam o pipeline intactos.
 * - Idempotente por construção: cada passo só roda quando `version` casa, e
 *   rodar o pipeline sobre um payload já migrado é um no-op.
 * - Nunca editar uma migração já publicada — para mudar o schema de novo,
 *   criar a PRÓXIMA versão (ver "Como adicionar a v3" no CLAUDE.md).
 *
 * Histórico:
 * - v1: { version: 1, transactions, budgets? } — budgets opcional
 * - v2: { version: 2, transactions, budgets } — budgets sempre presente (canônico)
 */
export const CURRENT_SCHEMA_VERSION = 2

/** shape canônico do payload salvo no aparelho (schema atual) */
export interface StoredData {
  version: number
  transactions: Transaction[]
  budgets: BudgetMap
  /** campos de versões futuras são preservados, nunca descartados */
  [extra: string]: unknown
}

export interface MigrationOutcome {
  data: StoredData
  /** versão encontrada no aparelho antes de migrar (0 = payload irreconhecível) */
  storedVersion: number
  /** true ⇔ o pipeline rodou e o resultado DEVE ser persistido (com backup antes) */
  migrated: boolean
}

/** orçamentos: só entradas com valor numérico finito e positivo, arredondado p/ centavos */
export function sanitizeBudgets(raw: unknown): BudgetMap {
  if (typeof raw !== "object" || raw === null || Array.isArray(raw)) return {}
  const out: BudgetMap = {}
  for (const [categoryId, value] of Object.entries(raw as Record<string, unknown>)) {
    if (typeof value === "number" && Number.isFinite(value) && value > 0) {
      out[categoryId] = Math.round(value)
    }
  }
  return out
}

type RawData = Record<string, unknown>
type MigrationFn = (data: RawData) => RawData

/**
 * v1 → v2: `budgets` passa a existir sempre (objeto canônico, saneado).
 * Não toca nas transações — migração NUNCA filtra lançamentos do usuário.
 */
function v1ToV2(data: RawData): RawData {
  return {
    ...data, // preserva campos desconhecidos
    version: 2,
    transactions: Array.isArray(data.transactions) ? data.transactions : [],
    budgets: sanitizeBudgets(data.budgets),
  }
}

/** mapa versão-de-origem → função que leva à versão seguinte */
const MIGRATIONS: Record<number, MigrationFn> = {
  1: v1ToV2,
}

function emptyData(): StoredData {
  return { version: CURRENT_SCHEMA_VERSION, transactions: [], budgets: {} }
}

/** extração best-effort dos campos conhecidos, sem perder os desconhecidos */
function normalizeKnownFields(data: RawData, version: number): StoredData {
  return {
    ...data,
    version,
    transactions: Array.isArray(data.transactions)
      ? (data.transactions as Transaction[])
      : [],
    budgets: sanitizeBudgets(data.budgets),
  }
}

/**
 * Recebe o payload JÁ parseado do localStorage e devolve o dado no schema
 * atual + a instrução de persistir ou não. Nunca lança; nunca toca o DOM.
 *
 * - payload irreconhecível (não-objeto) → vazio, `migrated: false` (o storage
 *   NÃO é reescrito na leitura; nada é destruído por engano)
 * - `version` ausente/inválida → tratado como v1 (payloads antigos)
 * - `version` < atual → migra em cadeia (1→2→…), `migrated: true`
 * - `version` === atual → normaliza campos conhecidos, sem persistir
 * - `version` > atual (dado de um app mais novo) → lê best-effort os campos
 *   que conhece, `migrated: false`; nada é descartado na leitura
 */
export function migrateStoredData(input: unknown): MigrationOutcome {
  if (typeof input !== "object" || input === null || Array.isArray(input)) {
    return { data: emptyData(), storedVersion: 0, migrated: false }
  }
  let data = input as RawData
  const rawVersion = data.version
  const storedVersion =
    typeof rawVersion === "number" && Number.isInteger(rawVersion) && rawVersion >= 1
      ? rawVersion
      : 1

  if (storedVersion >= CURRENT_SCHEMA_VERSION) {
    return {
      data: normalizeKnownFields(data, storedVersion),
      storedVersion,
      migrated: false,
    }
  }

  let version = storedVersion
  while (version < CURRENT_SCHEMA_VERSION) {
    const step = MIGRATIONS[version]
    if (!step) break // defensivo: cadeia incompleta → persiste até onde chegou
    data = step(data)
    // garante o avanço mesmo se uma migração esquecer de gravar a versão
    if (typeof data.version !== "number" || data.version <= version) {
      data = { ...data, version: version + 1 }
    }
    version = data.version as number
  }

  return {
    data: normalizeKnownFields(data, version),
    storedVersion,
    migrated: true,
  }
}
