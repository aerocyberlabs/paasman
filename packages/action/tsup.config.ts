import { defineConfig } from 'tsup'

export default defineConfig({
  entry: ['src/index.ts'],
  format: ['esm'],
  noExternal: [/.*/],
  platform: 'node',
  target: 'node20',
  clean: true,
})
