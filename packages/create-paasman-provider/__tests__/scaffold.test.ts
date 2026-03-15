import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { mkdtempSync, rmSync, readFileSync, existsSync } from 'node:fs'
import { join } from 'node:path'
import { tmpdir } from 'node:os'
import { scaffold, generateFiles } from '../src/index.js'

const vars = {
  name: 'portainer',
  author: 'Test Author',
  description: 'Portainer provider for Paasman',
}

describe('generateFiles', () => {
  it('should return all expected files', () => {
    const files = generateFiles(vars)
    const paths = files.map((f) => f.path)

    expect(paths).toContain('package.json')
    expect(paths).toContain('tsconfig.json')
    expect(paths).toContain('tsup.config.ts')
    expect(paths).toContain('vitest.config.ts')
    expect(paths).toContain('README.md')
    expect(paths).toContain('src/index.ts')
    expect(paths).toContain('src/client.ts')
    expect(paths).toContain('src/normalizers.ts')
    expect(paths).toContain('src/provider.ts')
    expect(paths).toContain('src/__tests__/client.test.ts')
    expect(paths).toContain('src/__tests__/normalizers.test.ts')
    expect(paths).toContain('src/__tests__/provider.test.ts')
  })

  describe('package.json template', () => {
    it('should contain the provider name', () => {
      const files = generateFiles(vars)
      const pkgFile = files.find((f) => f.path === 'package.json')!
      const pkg = JSON.parse(pkgFile.content)

      expect(pkg.name).toBe('@paasman/provider-portainer')
      expect(pkg.description).toBe('Portainer provider for Paasman')
      expect(pkg.author).toBe('Test Author')
      expect(pkg.dependencies['@paasman/core']).toBeDefined()
      expect(pkg.type).toBe('module')
    })
  })

  describe('provider.ts template', () => {
    it('should contain PascalCase class name', () => {
      const files = generateFiles(vars)
      const providerFile = files.find((f) => f.path === 'src/provider.ts')!

      expect(providerFile.content).toContain('class PortainerProvider')
      expect(providerFile.content).toContain("readonly name = 'portainer'")
      expect(providerFile.content).toContain('implements PaasProvider')
      expect(providerFile.content).toContain('ProviderCapabilities')
    })

    it('should have all capability groups set to false by default', () => {
      const files = generateFiles(vars)
      const providerFile = files.find((f) => f.path === 'src/provider.ts')!

      expect(providerFile.content).toContain('start: false')
      expect(providerFile.content).toContain('stop: false')
      expect(providerFile.content).toContain('restart: false')
      expect(providerFile.content).toContain('logs: false')
      expect(providerFile.content).toContain('servers: false')
      expect(providerFile.content).toContain('databases: false')
    })

    it('should contain TODO comments', () => {
      const files = generateFiles(vars)
      const providerFile = files.find((f) => f.path === 'src/provider.ts')!

      expect(providerFile.content).toContain('TODO: Implement PaasProvider interface')
    })
  })

  describe('client.ts template', () => {
    it('should contain the client class with correct name', () => {
      const files = generateFiles(vars)
      const clientFile = files.find((f) => f.path === 'src/client.ts')!

      expect(clientFile.content).toContain('class PortainerClient')
      expect(clientFile.content).toContain('AuthError')
      expect(clientFile.content).toContain('ConnectionError')
      expect(clientFile.content).toContain("'portainer'")
    })
  })

  describe('normalizers.ts template', () => {
    it('should contain normalizer functions with TODO comments', () => {
      const files = generateFiles(vars)
      const normFile = files.find((f) => f.path === 'src/normalizers.ts')!

      expect(normFile.content).toContain('export function toApp')
      expect(normFile.content).toContain('export function toServer')
      expect(normFile.content).toContain('export function toDeployment')
      expect(normFile.content).toContain('export function toEnvVar')
      expect(normFile.content).toContain('TODO')
    })
  })

  describe('index.ts template', () => {
    it('should barrel export provider and client', () => {
      const files = generateFiles(vars)
      const indexFile = files.find((f) => f.path === 'src/index.ts')!

      expect(indexFile.content).toContain('PortainerProvider')
      expect(indexFile.content).toContain('PortainerClient')
      expect(indexFile.content).toContain('PortainerProviderConfig')
      expect(indexFile.content).toContain('toApp')
    })
  })

  describe('README.md template', () => {
    it('should contain usage instructions', () => {
      const files = generateFiles(vars)
      const readme = files.find((f) => f.path === 'README.md')!

      expect(readme.content).toContain('@paasman/provider-portainer')
      expect(readme.content).toContain('npm install')
      expect(readme.content).toContain('PortainerProvider')
    })
  })

  describe('test templates', () => {
    it('should generate provider test with correct class name', () => {
      const files = generateFiles(vars)
      const testFile = files.find((f) => f.path === 'src/__tests__/provider.test.ts')!

      expect(testFile.content).toContain('PortainerProvider')
      expect(testFile.content).toContain("provider.name).toBe('portainer')")
    })

    it('should generate client test', () => {
      const files = generateFiles(vars)
      const testFile = files.find((f) => f.path === 'src/__tests__/client.test.ts')!

      expect(testFile.content).toContain('PortainerClient')
    })

    it('should generate normalizers test', () => {
      const files = generateFiles(vars)
      const testFile = files.find((f) => f.path === 'src/__tests__/normalizers.test.ts')!

      expect(testFile.content).toContain('toApp')
      expect(testFile.content).toContain('toServer')
      expect(testFile.content).toContain('toDeployment')
      expect(testFile.content).toContain('toEnvVar')
    })
  })
})

describe('scaffold', () => {
  let tmpDir: string

  beforeEach(() => {
    tmpDir = mkdtempSync(join(tmpdir(), 'paasman-scaffold-test-'))
  })

  afterEach(() => {
    rmSync(tmpDir, { recursive: true, force: true })
  })

  it('should create the project directory', () => {
    const dir = scaffold(vars, tmpDir)
    expect(existsSync(dir)).toBe(true)
    expect(dir).toContain('paasman-provider-portainer')
  })

  it('should write all expected files', () => {
    const dir = scaffold(vars, tmpDir)

    expect(existsSync(join(dir, 'package.json'))).toBe(true)
    expect(existsSync(join(dir, 'tsconfig.json'))).toBe(true)
    expect(existsSync(join(dir, 'tsup.config.ts'))).toBe(true)
    expect(existsSync(join(dir, 'vitest.config.ts'))).toBe(true)
    expect(existsSync(join(dir, 'README.md'))).toBe(true)
    expect(existsSync(join(dir, 'src/index.ts'))).toBe(true)
    expect(existsSync(join(dir, 'src/client.ts'))).toBe(true)
    expect(existsSync(join(dir, 'src/normalizers.ts'))).toBe(true)
    expect(existsSync(join(dir, 'src/provider.ts'))).toBe(true)
    expect(existsSync(join(dir, 'src/__tests__/client.test.ts'))).toBe(true)
    expect(existsSync(join(dir, 'src/__tests__/normalizers.test.ts'))).toBe(true)
    expect(existsSync(join(dir, 'src/__tests__/provider.test.ts'))).toBe(true)
  })

  it('should write valid package.json', () => {
    const dir = scaffold(vars, tmpDir)
    const content = readFileSync(join(dir, 'package.json'), 'utf-8')
    const pkg = JSON.parse(content)

    expect(pkg.name).toBe('@paasman/provider-portainer')
    expect(pkg.author).toBe('Test Author')
  })

  it('should write provider with correct class', () => {
    const dir = scaffold(vars, tmpDir)
    const content = readFileSync(join(dir, 'src/provider.ts'), 'utf-8')

    expect(content).toContain('class PortainerProvider')
    expect(content).toContain('implements PaasProvider')
  })
})
