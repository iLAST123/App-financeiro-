const brl = new Intl.NumberFormat("pt-BR", {
  style: "currency",
  currency: "BRL",
  maximumFractionDigits: 2,
})

const intFmt = new Intl.NumberFormat("pt-BR")

export function formatBRL(value: number): string {
  return brl.format(value)
}

export function formatNumber(value: number): string {
  return intFmt.format(value)
}

export function formatPercent(value: number, fractionDigits = 1): string {
  const sign = value > 0 ? "+" : ""
  return `${sign}${value.toFixed(fractionDigits).replace(".", ",")}%`
}

export function formatDate(input: string | Date): string {
  const d = typeof input === "string" ? new Date(input) : input
  return d.toLocaleDateString("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  })
}

export function formatDateLong(input: string | Date): string {
  const d = typeof input === "string" ? new Date(input) : input
  return d.toLocaleDateString("pt-BR", {
    day: "2-digit",
    month: "long",
    year: "numeric",
  })
}

export function formatWeekRange(start: string | Date, end: string | Date): string {
  return `${formatDate(start)} – ${formatDate(end)}`
}
