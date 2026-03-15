import { describe, expect, it, vi } from 'vitest'
import { Paasman } from '../paasman.js'
import type { PaasProvider } from '../interfaces.js'

function createMockProvider(name = 'mock'): PaasProvider {
  return {
    name,
    version: '1.0.0',
    capabilities: {
      apps: { start: true, stop: true, restart: true, logs: true },
      servers: true,
      databases: true,
      deployments: { list: true, cancel: true },
    },
    connect: vi.fn(),
    disconnect: vi.fn(),
    healthCheck: vi.fn().mockResolvedValue({ ok: true, provider: name, latencyMs: 10 }),
    apps: {
      list: vi.fn().mockResolvedValue([]),
      get: vi.fn(),
      create: vi.fn(),
      delete: vi.fn(),
      deploy: vi.fn(),
      start: vi.fn(),
      stop: vi.fn(),
      restart: vi.fn(),
    },
    env: {
      list: vi.fn().mockResolvedValue([]),
      set: vi.fn(),
      delete: vi.fn(),
      pull: vi.fn().mockResolvedValue({}),
      push: vi.fn(),
    },
    servers: {
      list: vi.fn().mockResolvedValue([]),
      get: vi.fn(),
    },
    databases: {
      list: vi.fn().mockResolvedValue([]),
      get: vi.fn(),
      create: vi.fn(),
      delete: vi.fn(),
    },
    deployments: {
      list: vi.fn().mockResolvedValue([]),
      get: vi.fn(),
      cancel: vi.fn(),
    },
  }
}

describe('Paasman', () => {
  it('single provider: delegates apps.list to provider', async () => {
    const provider = createMockProvider()
    const pm = new Paasman({ provider })
    await pm.apps.list()
    expect(provider.apps.list).toHaveBeenCalled()
  })

  it('single provider: delegates env.pull to provider', async () => {
    const provider = createMockProvider()
    const pm = new Paasman({ provider })
    await pm.env.pull('app-1')
    expect(provider.env.pull).toHaveBeenCalledWith('app-1')
  })

  it('multi-provider: use() selects correct provider', async () => {
    const prod = createMockProvider('prod')
    const staging = createMockProvider('staging')
    const pm = new Paasman({ providers: { prod, staging } })
    await pm.use('prod').apps.list()
    expect(prod.apps.list).toHaveBeenCalled()
    expect(staging.apps.list).not.toHaveBeenCalled()
  })

  it('multi-provider: throws on unknown profile', () => {
    const prod = createMockProvider('prod')
    const pm = new Paasman({ providers: { prod } })
    expect(() => pm.use('unknown')).toThrow()
  })

  it('multi-provider: default uses first provider', async () => {
    const first = createMockProvider('first')
    const second = createMockProvider('second')
    const pm = new Paasman({ providers: { first, second } })
    await pm.apps.list()
    expect(first.apps.list).toHaveBeenCalled()
  })
})
