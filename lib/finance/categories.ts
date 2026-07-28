import {
  Banknote,
  Briefcase,
  Car,
  Gamepad2,
  Gift,
  GraduationCap,
  HeartPulse,
  Home,
  MoreHorizontal,
  Plane,
  Receipt,
  ShoppingBag,
  ShoppingCart,
  TrendingUp,
  Tv,
  UtensilsCrossed,
  type LucideIcon,
} from "lucide-react"
import type { TransactionType } from "./types"

export interface Category {
  id: string
  label: string
  type: TransactionType
  icon: LucideIcon
}

export const CATEGORIES: Category[] = [
  // despesas
  { id: "alimentacao", label: "Alimentação", type: "expense", icon: UtensilsCrossed },
  { id: "mercado", label: "Mercado", type: "expense", icon: ShoppingCart },
  { id: "transporte", label: "Transporte", type: "expense", icon: Car },
  { id: "moradia", label: "Moradia", type: "expense", icon: Home },
  { id: "contas", label: "Contas", type: "expense", icon: Receipt },
  { id: "saude", label: "Saúde", type: "expense", icon: HeartPulse },
  { id: "educacao", label: "Educação", type: "expense", icon: GraduationCap },
  { id: "lazer", label: "Lazer", type: "expense", icon: Gamepad2 },
  { id: "compras", label: "Compras", type: "expense", icon: ShoppingBag },
  { id: "assinaturas", label: "Assinaturas", type: "expense", icon: Tv },
  { id: "viagem", label: "Viagem", type: "expense", icon: Plane },
  { id: "outros-despesa", label: "Outros", type: "expense", icon: MoreHorizontal },
  // receitas
  { id: "salario", label: "Salário", type: "income", icon: Banknote },
  { id: "freelance", label: "Freelance", type: "income", icon: Briefcase },
  { id: "investimentos", label: "Investimentos", type: "income", icon: TrendingUp },
  { id: "presente", label: "Presente", type: "income", icon: Gift },
  { id: "outros-receita", label: "Outros", type: "income", icon: MoreHorizontal },
]

const byId = new Map(CATEGORIES.map((c) => [c.id, c]))

export function getCategory(id: string): Category {
  return byId.get(id) ?? CATEGORIES[CATEGORIES.length - 1]
}

export function categoriesOf(type: TransactionType): Category[] {
  return CATEGORIES.filter((c) => c.type === type)
}
