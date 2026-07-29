"use client"

import { useEffect } from "react"

export function SwRegister() {
  useEffect(() => {
    // pede armazenamento persistente: reduz a chance de o navegador despejar
    // o localStorage sob pressão de espaço (crítico num app local-first).
    // Sem prompt na prática (Chrome decide por heurística; PWA instalada ganha).
    if (navigator.storage?.persist) {
      navigator.storage
        .persisted()
        .then((ok) => (ok ? true : navigator.storage.persist()))
        .catch(() => {
          // indisponível (ex.: navegação privada) — app segue normal
        })
    }

    if (!("serviceWorker" in navigator)) return
    if (process.env.NODE_ENV !== "production") return
    const basePath = process.env.NEXT_PUBLIC_BASE_PATH ?? ""
    navigator.serviceWorker.register(`${basePath}/sw.js`).catch(() => {
      // sem service worker o app continua funcionando, só perde o offline
    })
  }, [])
  return null
}
