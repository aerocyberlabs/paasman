export function vitestConfigTemplate(): string {
  return `import { defineConfig } from 'vitest/config'

export default defineConfig({
  test: {
    globals: true,
  },
})
`
}
