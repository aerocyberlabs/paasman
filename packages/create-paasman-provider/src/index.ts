#!/usr/bin/env node
import { input } from '@inquirer/prompts'
import { mkdirSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'

import { packageJsonTemplate } from './templates/package.json.js'
import { tsconfigTemplate } from './templates/tsconfig.json.js'
import { tsupConfigTemplate } from './templates/tsup.config.ts.js'
import { vitestConfigTemplate } from './templates/vitest.config.ts.js'
import { readmeTemplate } from './templates/README.md.js'
import { indexTemplate } from './templates/src/index.ts.js'
import { clientTemplate } from './templates/src/client.ts.js'
import { normalizersTemplate } from './templates/src/normalizers.ts.js'
import { providerTemplate } from './templates/src/provider.ts.js'
import { providerTestTemplate } from './templates/src/__tests__/provider.test.ts.js'

export interface TemplateVars {
  name: string
  author: string
  description: string
}

export function generateFiles(vars: TemplateVars): Array<{ path: string; content: string }> {
  return [
    { path: 'package.json', content: packageJsonTemplate(vars) },
    { path: 'tsconfig.json', content: tsconfigTemplate() },
    { path: 'tsup.config.ts', content: tsupConfigTemplate() },
    { path: 'vitest.config.ts', content: vitestConfigTemplate() },
    { path: 'README.md', content: readmeTemplate(vars) },
    { path: 'src/index.ts', content: indexTemplate(vars) },
    { path: 'src/client.ts', content: clientTemplate(vars) },
    { path: 'src/normalizers.ts', content: normalizersTemplate(vars) },
    { path: 'src/provider.ts', content: providerTemplate(vars) },
    { path: 'src/__tests__/client.test.ts', content: generateClientTest(vars) },
    { path: 'src/__tests__/normalizers.test.ts', content: generateNormalizersTest(vars) },
    { path: 'src/__tests__/provider.test.ts', content: providerTestTemplate(vars) },
  ]
}

function generateClientTest(vars: TemplateVars): string {
  const Name = vars.name.charAt(0).toUpperCase() + vars.name.slice(1)
  return `import { describe, it, expect } from 'vitest'
import { ${Name}Client } from '../client.js'

describe('${Name}Client', () => {
  it('should be constructable', () => {
    const client = new ${Name}Client('http://localhost:3000', 'test-token')
    expect(client).toBeDefined()
  })

  // TODO: Add tests with mocked fetch responses
})
`
}

function generateNormalizersTest(vars: TemplateVars): string {
  return `import { describe, it, expect } from 'vitest'
import { toApp, toServer, toDeployment, toEnvVar } from '../normalizers.js'

describe('normalizers', () => {
  describe('toApp', () => {
    it('should normalize a raw app object', () => {
      const raw = {
        id: 'app-1',
        name: 'my-app',
        status: 'running',
        created_at: '2024-01-01T00:00:00Z',
        updated_at: '2024-01-01T00:00:00Z',
      }
      const app = toApp(raw)
      expect(app.id).toBe('app-1')
      expect(app.name).toBe('my-app')
      expect(app.status).toBe('running')
    })
  })

  describe('toServer', () => {
    it('should normalize a raw server object', () => {
      const raw = { id: 'srv-1', name: 'server-1', ip: '10.0.0.1' }
      const server = toServer(raw)
      expect(server.id).toBe('srv-1')
      expect(server.name).toBe('server-1')
      expect(server.ip).toBe('10.0.0.1')
    })
  })

  describe('toDeployment', () => {
    it('should normalize a raw deployment object', () => {
      const raw = {
        id: 'dep-1',
        app_id: 'app-1',
        status: 'success',
        created_at: '2024-01-01T00:00:00Z',
      }
      const deployment = toDeployment(raw)
      expect(deployment.id).toBe('dep-1')
      expect(deployment.appId).toBe('app-1')
      expect(deployment.status).toBe('success')
    })
  })

  describe('toEnvVar', () => {
    it('should normalize a raw env var object', () => {
      const raw = { key: 'NODE_ENV', value: 'production', is_secret: false }
      const envVar = toEnvVar(raw)
      expect(envVar.key).toBe('NODE_ENV')
      expect(envVar.value).toBe('production')
    })
  })
})
`
}

export function scaffold(vars: TemplateVars, baseDir: string = process.cwd()): string {
  const dir = join(baseDir, `paasman-provider-${vars.name}`)
  const files = generateFiles(vars)

  for (const file of files) {
    const filePath = join(dir, file.path)
    const fileDir = join(filePath, '..')
    mkdirSync(fileDir, { recursive: true })
    writeFileSync(filePath, file.content, 'utf-8')
  }

  return dir
}

async function main() {
  console.log('\nCreate Paasman Provider\n')

  const name = await input({ message: 'Provider name (e.g., portainer)' })
  const author = await input({ message: 'Author name' })
  const description = await input({
    message: 'Description',
    default: `${name} provider for Paasman`,
  })

  const dir = scaffold({ name, author, description })

  console.log(`\nProvider scaffolded at ${dir}\n`)
  console.log('Next steps:')
  console.log(`  cd paasman-provider-${name}`)
  console.log('  npm install')
  console.log('  npm run build')
  console.log('  npm test')
  console.log('')
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
