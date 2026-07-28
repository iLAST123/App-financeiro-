"use client"

import { AlertCircle } from "lucide-react"

import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"

interface ErrorStateProps {
  title?: string
  message?: string
  onRetry?: () => void
  className?: string
}

export function ErrorState({
  title = "Algo deu errado",
  message = "Não conseguimos carregar essa seção agora.",
  onRetry,
  className,
}: ErrorStateProps) {
  return (
    <div
      className={cn(
        "flex flex-col items-center justify-center gap-3 rounded-lg border border-rose-200 bg-rose-50 px-6 py-12 text-center text-rose-900",
        className
      )}
    >
      <div className="grid h-12 w-12 place-items-center rounded-full bg-rose-100">
        <AlertCircle className="h-6 w-6" />
      </div>
      <h3 className="text-lg font-medium">{title}</h3>
      <p className="max-w-md text-sm opacity-80">{message}</p>
      {onRetry && (
        <Button variant="destructive" onClick={onRetry} className="mt-2">
          Tentar novamente
        </Button>
      )}
    </div>
  )
}
