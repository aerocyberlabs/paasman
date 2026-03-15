import { describe, expect, it } from 'vitest'
import { AppSchema, ServerSchema, DatabaseSchema, DeploymentSchema, EnvVarSchema, LogLineSchema, HealthStatusSchema, CreateAppInputSchema, CreateDatabaseInputSchema } from '../types.js'

describe('Zod schemas', () => {
  it('validates a valid App', () => {
    const app = {
      id: 'abc-123',
      name: 'my-app',
      status: 'running',
      domains: ['app.example.com'],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      meta: { repository: 'https://github.com/test/repo' },
      raw: {},
    }
    expect(AppSchema.parse(app)).toBeDefined()
  })

  it('rejects an App with invalid status', () => {
    const app = {
      id: 'abc',
      name: 'x',
      status: 'banana',
      domains: [],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      meta: {},
      raw: null,
    }
    expect(() => AppSchema.parse(app)).toThrow()
  })

  it('validates a valid EnvVar', () => {
    const env = { key: 'DB_HOST', value: 'localhost', isSecret: false, scope: 'runtime' }
    expect(EnvVarSchema.parse(env)).toBeDefined()
  })

  it('validates CreateAppInput with git source', () => {
    const input = {
      name: 'new-app',
      source: { type: 'git', repository: 'https://github.com/test/repo', branch: 'main' },
    }
    expect(CreateAppInputSchema.parse(input)).toBeDefined()
  })

  it('validates CreateAppInput with image source', () => {
    const input = {
      name: 'new-app',
      source: { type: 'image', image: 'nginx:latest' },
    }
    expect(CreateAppInputSchema.parse(input)).toBeDefined()
  })

  it('validates CreateDatabaseInput', () => {
    const input = { name: 'mydb', engine: 'postgresql', version: '16' }
    expect(CreateDatabaseInputSchema.parse(input)).toBeDefined()
  })
})
