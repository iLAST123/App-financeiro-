import { describe, expect, it } from "vitest"
import {
  CURRENT_SCHEMA_VERSION,
  migrateStoredData,
  sanitizeBudgets,
} from "../migrations"
import type { Transaction } from "../types"

/**
 * Payloads v1 REAIS — os três formatos que existem em aparelhos hoje:
 * lançamentos manuais, com/sem `budgets`, e importados da Pluggy (`pluggyId`).
 */
const MANUAL_TXS: Transaction[] = [
  {
    id: "9f8e7d6c-1a2b-4c3d-8e9f-000000000001",
    type: "expense",
    amountCents: 4550,
    categoryId: "mercado",
    date: "2026-07-12",
    note: "feira da semana",
  },
  {
    id: "9f8e7d6c-1a2b-4c3d-8e9f-000000000002",
    type: "income",
    amountCents: 350000,
    categoryId: "salario",
    date: "2026-07-05",
  },
]

const PLUGGY_TXS: Transaction[] = [
  {
    id: "9f8e7d6c-1a2b-4c3d-8e9f-000000000003",
    type: "expense",
    amountCents: 1290,
    categoryId: "outros-despesa",
    date: "2026-07-20",
    note: "PIX PADARIA DO ZE",
    pluggyId: "px-6f1a2b3c-0001",
  },
]

const V1_COMPLETO = {
  version: 1,
  transactions: [...MANUAL_TXS, ...PLUGGY_TXS],
  budgets: { mercado: 80000, transporte: 30000 },
}

const V1_SEM_BUDGETS = {
  version: 1,
  transactions: MANUAL_TXS,
}

describe("migrateStoredData — v1 → v2", () => {
  it("migra payload v1 completo (manuais + pluggy + budgets) sem perder nada", () => {
    const { data, storedVersion, migrated } = migrateStoredData(V1_COMPLETO)
    expect(migrated).toBe(true)
    expect(storedVersion).toBe(1)
    expect(data.version).toBe(2)
    expect(data.transactions).toEqual([...MANUAL_TXS, ...PLUGGY_TXS])
    expect(data.budgets).toEqual({ mercado: 80000, transporte: 30000 })
  })

  it("v1 sem budgets (campo opcional ausente) → v2 com budgets {}", () => {
    const { data, migrated } = migrateStoredData(V1_SEM_BUDGETS)
    expect(migrated).toBe(true)
    expect(data.version).toBe(2)
    expect(data.transactions).toEqual(MANUAL_TXS)
    expect(data.budgets).toEqual({})
  })

  it("preserva pluggyId byte a byte (chave de dedup do open finance)", () => {
    const { data } = migrateStoredData(V1_COMPLETO)
    const pluggy = data.transactions.find((t) => t.pluggyId !== undefined)
    expect(pluggy).toEqual(PLUGGY_TXS[0])
  })

  it("é idempotente: migrar o resultado de novo é no-op", () => {
    const first = migrateStoredData(V1_COMPLETO)
    const second = migrateStoredData(first.data)
    expect(second.migrated).toBe(false)
    expect(second.data).toEqual(first.data)
    const third = migrateStoredData(second.data)
    expect(third.data).toEqual(first.data)
  })

  it("payload sem campo version é tratado como v1", () => {
    const { data, storedVersion, migrated } = migrateStoredData({
      transactions: MANUAL_TXS,
    })
    expect(storedVersion).toBe(1)
    expect(migrated).toBe(true)
    expect(data.version).toBe(2)
    expect(data.transactions).toEqual(MANUAL_TXS)
  })

  it("NUNCA descarta campo desconhecido no topo do payload", () => {
    const { data } = migrateStoredData({
      ...V1_COMPLETO,
      campoDeUmForkFuturo: { qualquer: "coisa" },
    })
    expect(data.campoDeUmForkFuturo).toEqual({ qualquer: "coisa" })
  })

  it("NUNCA descarta campo desconhecido dentro de uma transação", () => {
    const txFutura = { ...MANUAL_TXS[0], accountId: "conta-nubank" }
    const { data } = migrateStoredData({ version: 1, transactions: [txFutura] })
    expect(data.transactions[0]).toEqual(txFutura)
  })

  it("migração não filtra lançamentos — mesmo estranhos, ficam (validação é do parseBackup)", () => {
    const estranha = { id: "x", type: "expense", amountCents: -1, categoryId: "?", date: "???" }
    const { data } = migrateStoredData({ version: 1, transactions: [estranha] })
    expect(data.transactions).toEqual([estranha])
  })

  it("saneia budgets inválidos na passagem v1→v2 (mesma régua da leitura antiga)", () => {
    const { data } = migrateStoredData({
      version: 1,
      transactions: [],
      budgets: { mercado: 80000, lixo: -5, texto: "abc", zero: 0, quebrado: NaN },
    })
    expect(data.budgets).toEqual({ mercado: 80000 })
  })

  it("payload irreconhecível → vazio e migrated=false (nada será sobrescrito)", () => {
    for (const input of [null, undefined, 42, "texto", [1, 2, 3], true]) {
      const { data, storedVersion, migrated } = migrateStoredData(input)
      expect(migrated).toBe(false)
      expect(storedVersion).toBe(0)
      expect(data.transactions).toEqual([])
      expect(data.budgets).toEqual({})
    }
  })

  it("transactions não-array em v1 vira lista vazia (sem explodir)", () => {
    const { data, migrated } = migrateStoredData({ version: 1, transactions: "corrompido" })
    expect(migrated).toBe(true)
    expect(data.transactions).toEqual([])
  })

  it("versão FUTURA (app mais novo): lê best-effort, não migra, não descarta", () => {
    const doFuturo = {
      version: 99,
      transactions: MANUAL_TXS,
      budgets: { mercado: 1000 },
      contas: [{ id: "c1", nome: "Corrente" }],
    }
    const { data, storedVersion, migrated } = migrateStoredData(doFuturo)
    expect(migrated).toBe(false)
    expect(storedVersion).toBe(99)
    expect(data.version).toBe(99)
    expect(data.transactions).toEqual(MANUAL_TXS)
    expect(data.contas).toEqual(doFuturo.contas)
  })

  it("CURRENT_SCHEMA_VERSION está em 2 (bump consciente: exige nova migração + testes)", () => {
    expect(CURRENT_SCHEMA_VERSION).toBe(2)
  })
})

describe("sanitizeBudgets", () => {
  it("mantém só valores numéricos finitos e positivos, arredondados", () => {
    expect(
      sanitizeBudgets({ a: 100, b: 99.6, c: -1, d: 0, e: "50", f: Infinity, g: NaN })
    ).toEqual({ a: 100, b: 100 })
  })

  it("entrada não-objeto (ou array) vira {}", () => {
    expect(sanitizeBudgets(null)).toEqual({})
    expect(sanitizeBudgets("x")).toEqual({})
    expect(sanitizeBudgets([1])).toEqual({})
    expect(sanitizeBudgets(undefined)).toEqual({})
  })
})
