import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import { CURRENT_SCHEMA_VERSION } from "../migrations"
import {
  __resetPersistenceForTests,
  loadFromStorage,
  preMigrationBackupKey,
  saveToStorage,
  STORAGE_KEY,
} from "../persistence"
import type { Transaction } from "../types"
import { installLocalStorageMock } from "./local-storage-mock"

const TX: Transaction = {
  id: "t-1",
  type: "expense",
  amountCents: 4550,
  categoryId: "mercado",
  date: "2026-07-12",
  note: "feira",
}

const PLUGGY_TX: Transaction = {
  id: "t-2",
  type: "expense",
  amountCents: 1290,
  categoryId: "outros-despesa",
  date: "2026-07-20",
  pluggyId: "px-0001",
}

const V1_RAW = JSON.stringify({
  version: 1,
  transactions: [TX, PLUGGY_TX],
  budgets: { mercado: 80000 },
})

const BACKUP_KEY = preMigrationBackupKey(CURRENT_SCHEMA_VERSION)

describe("persistence — migração na leitura, com backup pré-migração", () => {
  beforeEach(() => {
    __resetPersistenceForTests()
  })
  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it("storage vazio → estado vazio, sem escrever nada", () => {
    const storage = installLocalStorageMock()
    expect(loadFromStorage()).toEqual({ transactions: [], budgets: {} })
    expect(storage.getItem(STORAGE_KEY)).toBeNull()
  })

  it("payload v1 real: carrega os dados, grava o payload migrado (v2) e o snapshot do original", () => {
    const storage = installLocalStorageMock()
    storage.setItem(STORAGE_KEY, V1_RAW)

    const { transactions, budgets } = loadFromStorage()
    expect(transactions).toEqual([TX, PLUGGY_TX])
    expect(budgets).toEqual({ mercado: 80000 })

    // payload principal agora está no schema v2
    const stored = JSON.parse(storage.getItem(STORAGE_KEY)!)
    expect(stored.version).toBe(CURRENT_SCHEMA_VERSION)
    expect(stored.transactions).toEqual([TX, PLUGGY_TX])
    expect(stored.budgets).toEqual({ mercado: 80000 })

    // snapshot pré-migração = o raw ORIGINAL, byte a byte
    expect(storage.getItem(BACKUP_KEY)).toBe(V1_RAW)
  })

  it("recarregar depois de migrado é no-op e NUNCA sobrescreve o snapshot", () => {
    const storage = installLocalStorageMock()
    storage.setItem(STORAGE_KEY, V1_RAW)
    loadFromStorage()
    const migratedPayload = storage.getItem(STORAGE_KEY)

    const second = loadFromStorage()
    expect(second.transactions).toEqual([TX, PLUGGY_TX])
    expect(storage.getItem(STORAGE_KEY)).toBe(migratedPayload)
    expect(storage.getItem(BACKUP_KEY)).toBe(V1_RAW)
  })

  it("JSON corrompido → estado vazio e o storage fica INTACTO (nada é destruído na leitura)", () => {
    const storage = installLocalStorageMock()
    storage.setItem(STORAGE_KEY, "{corrompido⚠")
    expect(loadFromStorage()).toEqual({ transactions: [], budgets: {} })
    expect(storage.getItem(STORAGE_KEY)).toBe("{corrompido⚠")
    expect(storage.getItem(BACKUP_KEY)).toBeNull()
  })

  it("se o snapshot falhar (quota), a migração segue mesmo assim", () => {
    const storage = installLocalStorageMock({ failKeyPrefix: "meu-bolso:backup:" })
    storage.setItem(STORAGE_KEY, V1_RAW)
    const { transactions } = loadFromStorage()
    expect(transactions).toEqual([TX, PLUGGY_TX])
    expect(JSON.parse(storage.getItem(STORAGE_KEY)!).version).toBe(CURRENT_SCHEMA_VERSION)
    expect(storage.getItem(BACKUP_KEY)).toBeNull()
  })

  it("saveToStorage escreve o schema atual e faz roundtrip com loadFromStorage", () => {
    installLocalStorageMock()
    saveToStorage([TX], { mercado: 5000 })
    const { transactions, budgets } = loadFromStorage()
    expect(transactions).toEqual([TX])
    expect(budgets).toEqual({ mercado: 5000 })
    expect(JSON.parse(localStorage.getItem(STORAGE_KEY)!).version).toBe(
      CURRENT_SCHEMA_VERSION
    )
  })

  it("campos desconhecidos (de versão futura) sobrevivem ao ciclo load → save", () => {
    const storage = installLocalStorageMock()
    storage.setItem(
      STORAGE_KEY,
      JSON.stringify({
        version: CURRENT_SCHEMA_VERSION,
        transactions: [TX],
        budgets: {},
        contas: [{ id: "c1", nome: "Corrente" }],
      })
    )
    loadFromStorage()
    saveToStorage([TX, PLUGGY_TX], {})
    const stored = JSON.parse(storage.getItem(STORAGE_KEY)!)
    expect(stored.contas).toEqual([{ id: "c1", nome: "Corrente" }])
    expect(stored.transactions).toEqual([TX, PLUGGY_TX])
  })
})
