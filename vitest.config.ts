import path from "node:path"
import { defineConfig } from "vitest/config"

export default defineConfig({
  resolve: {
    alias: { "@": path.resolve(__dirname, ".") },
  },
  test: {
    // motor financeiro é função pura — ambiente node basta (sem jsdom);
    // o que precisa de localStorage usa um stub próprio (ver test-utils)
    environment: "node",
    include: ["lib/**/*.test.ts"],
  },
})
