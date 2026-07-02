import { defineConfig } from 'vitest/config'

// Testes do engine (código puro, sem DOM) — rodam em node.
// Usa o transform do Vite, então `import.meta.glob` (escudos) resolve normalmente.
export default defineConfig({
  test: {
    environment: 'node',
    include: ['src/**/*.test.ts']
  }
})
