"use client"

import {
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { centsToBRL, type MonthPoint } from "@/lib/finance/summary"

const INCOME_COLOR = "#2a78d6"
const EXPENSE_COLOR = "#eb6834"

function compactBRL(cents: number): string {
  const value = cents / 100
  if (value >= 1000) {
    return `${(value / 1000).toLocaleString("pt-BR", { maximumFractionDigits: 1 })}k`
  }
  return value.toLocaleString("pt-BR", { maximumFractionDigits: 0 })
}

export function HistoryChart({ points }: { points: MonthPoint[] }) {
  const hasData = points.some((p) => p.incomeCents > 0 || p.expenseCents > 0)
  if (!hasData) return null
  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-base">Últimos 6 meses</CardTitle>
      </CardHeader>
      <CardContent className="pb-4 pl-0 pr-3">
        <div className="h-48">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={points} barGap={2} margin={{ top: 4, right: 0, left: 0, bottom: 0 }}>
              <CartesianGrid vertical={false} stroke="#e1e0d9" strokeWidth={1} />
              <XAxis
                dataKey="label"
                tickLine={false}
                axisLine={{ stroke: "#c3c2b7" }}
                tick={{ fill: "#898781", fontSize: 11 }}
              />
              <YAxis
                width={44}
                tickLine={false}
                axisLine={false}
                tick={{ fill: "#898781", fontSize: 11 }}
                tickFormatter={compactBRL}
              />
              <Tooltip
                cursor={{ fill: "rgba(11,11,11,0.04)" }}
                formatter={(value, name) => [
                  centsToBRL(Number(value)),
                  name === "incomeCents" ? "Receitas" : "Despesas",
                ]}
                labelStyle={{ fontWeight: 600 }}
                contentStyle={{
                  borderRadius: 8,
                  border: "1px solid rgba(11,11,11,0.10)",
                  fontSize: 12,
                }}
              />
              <Bar
                dataKey="incomeCents"
                fill={INCOME_COLOR}
                radius={[4, 4, 0, 0]}
                maxBarSize={18}
              />
              <Bar
                dataKey="expenseCents"
                fill={EXPENSE_COLOR}
                radius={[4, 4, 0, 0]}
                maxBarSize={18}
              />
            </BarChart>
          </ResponsiveContainer>
        </div>
        <div className="mt-2 flex justify-center gap-5 text-xs text-muted-foreground">
          <span className="flex items-center gap-1.5">
            <span
              className="h-2.5 w-2.5 rounded-sm"
              style={{ backgroundColor: INCOME_COLOR }}
            />
            Receitas
          </span>
          <span className="flex items-center gap-1.5">
            <span
              className="h-2.5 w-2.5 rounded-sm"
              style={{ backgroundColor: EXPENSE_COLOR }}
            />
            Despesas
          </span>
        </div>
      </CardContent>
    </Card>
  )
}
