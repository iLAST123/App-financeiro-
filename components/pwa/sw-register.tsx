"use client"

import { useEffect } from "react"

export function SwRegister() {
  useEffect(() => {
    if (!("serviceWorker" in navigator)) return
    if (process.env.NODE_ENV !== "production") return
    const basePath = process.env.NEXT_PUBLIC_BASE_PATH ?? ""
    navigator.serviceWorker.register(`${basePath}/sw.js`).catch(() => {
      // sem service worker o app continua funcionando, só perde o offline
    })
  }, [])
  return null
}
