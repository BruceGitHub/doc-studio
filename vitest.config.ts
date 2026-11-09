import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { defineConfig } from 'vitest/config'

const here = path.dirname(fileURLToPath(import.meta.url))

export default defineConfig({
  resolve: {
    alias: {
      '@docstudio/core': path.join(here, 'packages/core/src/index.ts'),
      '@docstudio/server': path.join(here, 'packages/server/src/index.ts'),
    },
  },
  test: {
    environment: 'node',
    include: ['packages/*/test/**/*.test.{ts,tsx}'],
  },
})
