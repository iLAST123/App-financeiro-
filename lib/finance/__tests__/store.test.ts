import { describe, expect, it } from "vitest"
import { CURRENT_SCHEMA_VERSION } from "../migrations"
import { buildBackup, mergeByPluggyId, parseBackup } from "../store"
import type { Transaction } from "../types"

const manual = (id: string): Transaction => ({
  id,
  type: "expense",
  amountCents: 1000,
  categoryId: "mercado",
  date: "2026-07-10",
})

const pluggy = (id: string, pluggyId: string): Transaction => ({
  id,
  type: "expense",
  amountCents: 2000,
  categoryId: "outros-despesa",
  date: "2026-07-11",
  pluggyId,
})

describe("mergeByPluggyId — import é MERGE, nunca replace", () => {
  it("não duplica quem já existe com o mesmo pluggyId", () => {
    const current = [manual("m1"), pluggy("p1", "px-1")]
    const incoming = [pluggy("p1x", "px-1"), pluggy("p2", "px-2")]
    const { merged, added, skipped } = mergeByPluggyId(current, incoming)
    expect(added).toBe(1)
    expect(skipped).toBe(1)
    expect(merged).toHaveLength(3)
    expect(merged.filter((t) => t.pluggyId === "px-1")).toHaveLength(1)
  })

  it("deduplica dentro do próprio lote importado (overlap de cursor da API)", () => {
    const incoming = [pluggy("a", "px-9"), pluggy("b", "px-9")]
    const { merged, added, skipped } = mergeByPluggyId([], incoming)
    expect(added).toBe(1)
    expect(skipped).toBe(1)
    expect(merged).toHaveLength(1)
  })

  it("lançamentos manuais (sem pluggyId) nunca são bloqueados pelo dedup", () => {
    const { merged, added, skipped } = mergeByPluggyId(
      [manual("m1")],
      [manual("m2"), manual("m3")]
    )
    expect(added).toBe(2)
    expect(skipped).toBe(0)
    expect(merged).toHaveLength(3)
  })

  it("preserva os existentes na frente e não muta os arrays de entrada", () => {
    const current = [manual("m1")]
    const incoming = [pluggy("p1", "px-1")]
    const { merged } = mergeByPluggyId(current, incoming)
    expect(merged[0]).toBe(current[0])
    expect(current).toHaveLength(1)
    expect(incoming).toHaveLength(1)
  })
})

describe("parseBackup — validação na fronteira (arquivo vindo de fora)", () => {
  const valid = {
    app: "meu-bolso",
    version: 1,
    exportedAt: "2026-07-01T12:00:00.000Z",
    transactions: [manual("m1"), pluggy("p1", "px-1")],
    budgets: { mercado: 50000 },
  }

  it("aceita backup válido com budgets", () => {
    const parsed = parseBackup(JSON.stringify(valid))
    expect(parsed.transactions).toHaveLength(2)
    expect(parsed.budgets).toEqual({ mercado: 50000 })
  })

  it("backup antigo sem budgets → budgets undefined (não sobrescreve os atuais com {})", () => {
    const old = { ...valid, budgets: undefined } // JSON.stringify omite o campo
    const parsed = parseBackup(JSON.stringify(old))
    expect(parsed.budgets).toBeUndefined()
  })

  it("rejeita arquivo de outro app ou sem lista de transações", () => {
    expect(() => parseBackup(JSON.stringify({ ...valid, app: "outro" }))).toThrow()
    expect(() =>
      parseBackup(JSON.stringify({ app: "meu-bolso", transactions: "x" }))
    ).toThrow()
    expect(() => parseBackup("{nem json")).toThrow()
  })

  it("filtra transações malformadas, mantendo as válidas", () => {
    const file = {
      ...valid,
      transactions: [
        manual("ok"),
        { ...manual("sem-valor"), amountCents: 0 },
        { ...manual("valor-negativo"), amountCents: -5 },
        { ...manual("data-quebrada"), date: "12/07/2026" },
        { ...manual("tipo-errado"), type: "transfer" },
        { id: 123, type: "expense", amountCents: 1, categoryId: "x", date: "2026-01-01" },
      ],
    }
    const parsed = parseBackup(JSON.stringify(file))
    expect(parsed.transactions.map((t) => t.id)).toEqual(["ok"])
  })

  it("pluggyId malformado: descarta o campo, mantém o lançamento", () => {
    const file = {
      ...valid,
      transactions: [
        { ...manual("m1"), pluggyId: 42 },
        { ...manual("m2"), pluggyId: "" },
        pluggy("p1", "px-ok"),
      ],
    }
    const parsed = parseBackup(JSON.stringify(file))
    expect(parsed.transactions).toHaveLength(3)
    expect(parsed.transactions[0].pluggyId).toBeUndefined()
    expect(parsed.transactions[1].pluggyId).toBeUndefined()
    expect(parsed.transactions[2].pluggyId).toBe("px-ok")
  })

  it("saneia budgets inválidos do arquivo", () => {
    const file = { ...valid, budgets: { mercado: 100, lixo: -1, x: "abc" } }
    expect(parseBackup(JSON.stringify(file)).budgets).toEqual({ mercado: 100 })
  })
})

describe("buildBackup", () => {
  it("carrega a versão atual do schema e só inclui budgets quando há algum", () => {
    const with_ = buildBackup([manual("m1")], { mercado: 100 })
    expect(with_.app).toBe("meu-bolso")
    expect(with_.version).toBe(CURRENT_SCHEMA_VERSION)
    expect(with_.budgets).toEqual({ mercado: 100 })

    const without = buildBackup([manual("m1")], {})
    expect(without.budgets).toBeUndefined()
    expect(new Date(without.exportedAt).getTime()).not.toBeNaN()
  })
})
