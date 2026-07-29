import path from "node:path"
import { defineConfig } from "vitest/config"

export default defineConfig({
  resolve: {
    alias: { "@": path.resolve(__dirname, ".") },
  },
  test: {
    // motor financeiro é função pura — ambiente node basta (sem jsdom);
    // o que precisa de localStorage usa um stub próprio (local-storage-mock)
    environment: "node",
    include: ["lib/**/*.test.ts"],
    // O pool padrão ("forks", child processes) mostrou spawn de worker
    // não-determinístico no macOS + Node 24 ("Failed to start forks worker",
    // timeout — agravado quando a máquina está sob carga). A suíte é minúscula
    // e pura: um único worker thread executa em <1s e se comporta igual no
    // macOS e no Linux do CI. Não voltar para forks sem validar nos dois.
    // (Vitest 4: opções de pool são top-level; `poolOptions` foi removido.)
    pool: "threads",
    maxWorkers: 1,
  },
})
