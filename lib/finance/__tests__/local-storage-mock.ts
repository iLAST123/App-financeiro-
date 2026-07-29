import { vi } from "vitest"

/**
 * Stub mínimo de localStorage para os testes da camada de persistência
 * (ambiente node, sem jsdom). `failKeyPrefix` simula quota estourada
 * em chaves específicas (ex.: o snapshot pré-migração).
 */
export function installLocalStorageMock(options?: { failKeyPrefix?: string }) {
  const map = new Map<string, string>()
  const mock = {
    getItem: (key: string) => (map.has(key) ? map.get(key)! : null),
    setItem: (key: string, value: string) => {
      if (options?.failKeyPrefix && key.startsWith(options.failKeyPrefix)) {
        throw new Error("QuotaExceededError (simulado)")
      }
      map.set(key, String(value))
    },
    removeItem: (key: string) => {
      map.delete(key)
    },
    clear: () => {
      map.clear()
    },
    key: (index: number) => Array.from(map.keys())[index] ?? null,
    get length() {
      return map.size
    },
  }
  vi.stubGlobal("localStorage", mock)
  return mock
}
