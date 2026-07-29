import { describe, expect, it } from "vitest"
import { parseBRLInput, summarize, transactionsOfMonth } from "../summary"
import type { Transaction } from "../types"

const tx = (
  type: Transaction["type"],
  amountCents: number,
  date = "2026-07-10"
): Transaction => ({
  id: `${type}-${amountCents}-${date}`,
  type,
  amountCents,
  categoryId: "mercado",
  date,
})

describe("summarize — o número que aparece no topo do app", () => {
  it("soma receitas e despesas separadas e calcula o saldo", () => {
    const s = summarize([
      tx("income", 350000),
      tx("income", 50000),
      tx("expense", 4550),
      tx("expense", 120000),
    ])
    expect(s.incomeCents).toBe(400000)
    expect(s.expenseCents).toBe(124550)
    expect(s.balanceCents).toBe(275450)
  })

  it("mês sem lançamentos → tudo zero", () => {
    expect(summarize([])).toEqual({
      incomeCents: 0,
      expenseCents: 0,
      balanceCents: 0,
    })
  })

  it("saldo pode ser negativo (mês no vermelho)", () => {
    const s = summarize([tx("income", 1000), tx("expense", 2500)])
    expect(s.balanceCents).toBe(-1500)
  })
})

describe("transactionsOfMonth", () => {
  it("filtra pelo prefixo YYYY-MM da data", () => {
    const list = [tx("expense", 1, "2026-07-31"), tx("expense", 2, "2026-08-01")]
    expect(transactionsOfMonth(list, "2026-07")).toHaveLength(1)
    expect(transactionsOfMonth(list, "2026-08")[0].amountCents).toBe(2)
  })
})

describe("parseBRLInput — o que o usuário digita vira centavos", () => {
  it.each([
    ["1.234,56", 123456],
    ["1234,56", 123456],
    ["1234,5", 123450],
    ["1234.56", 123456],
    ["1.234", 123400], // ponto agrupando milhar
    ["12.34", 1234], // ponto decimal (não casa com padrão de milhar)
    ["1234", 123400],
    ["R$ 50", 5000],
    [" 1.000.000,00 ", 100000000],
    ["0,01", 1],
  ])("%s → %d centavos", (raw, cents) => {
    expect(parseBRLInput(raw)).toBe(cents)
  })

  it.each([[""], ["   "], ["abc"], ["0"], ["0,00"], ["-5"], [","], ["R$"]])(
    "entrada inválida %j → null",
    (raw) => {
      expect(parseBRLInput(raw)).toBeNull()
    }
  )
})
