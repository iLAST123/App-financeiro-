import { describe, expect, it } from "vitest"
import { centsToCSVNumber, CSV_BOM, transactionsToCSV } from "../csv"
import type { Transaction } from "../types"

const TXS: Transaction[] = [
  {
    id: "1",
    type: "expense",
    amountCents: 4550,
    categoryId: "mercado",
    date: "2026-07-12",
    note: "feira; com \"aspas\"",
  },
  {
    id: "2",
    type: "income",
    amountCents: 350000,
    categoryId: "salario",
    date: "2026-07-05",
  },
]

describe("transactionsToCSV", () => {
  it("gera BOM + cabeçalho + linhas CRLF no formato pt-BR (; e vírgula)", () => {
    const csv = transactionsToCSV(TXS)
    expect(csv.startsWith(CSV_BOM)).toBe(true)
    const lines = csv.slice(CSV_BOM.length).split("\r\n")
    expect(lines[0]).toBe("data;tipo;categoria;valor;observacao")
    expect(lines[1]).toBe('2026-07-12;despesa;Mercado;45,50;"feira; com ""aspas"""')
    expect(lines[2]).toBe("2026-07-05;receita;Salário;3500,00;")
    expect(lines[3]).toBe("")
  })

  it("categoria desconhecida cai no rótulo de fallback (nunca quebra o export)", () => {
    const csv = transactionsToCSV([
      { id: "x", type: "expense", amountCents: 100, categoryId: "nao-existe", date: "2026-01-01" },
    ])
    expect(csv).toContain("2026-01-01;despesa;Outros;1,00;")
  })

  it("extrato vazio → só o cabeçalho", () => {
    const csv = transactionsToCSV([])
    expect(csv).toBe(`${CSV_BOM}data;tipo;categoria;valor;observacao\r\n`)
  })
})

describe("centsToCSVNumber", () => {
  it.each([
    [0, "0,00"],
    [5, "0,05"],
    [100, "1,00"],
    [123456, "1234,56"],
    [100000000, "1000000,00"],
    [-4550, "-45,50"],
  ])("%d centavos → %s", (cents, out) => {
    expect(centsToCSVNumber(cents)).toBe(out)
  })
})
