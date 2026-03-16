import { describe, expect, it, vi, beforeEach } from 'vitest'
import { CapRoverProvider } from '../provider.js'

const mockGet = vi.fn().mockResolvedValue({ appDefinitions: [] })
const mockPost = vi.fn().mockResolvedValue({})

vi.mock('../client.js', () => ({
  CapRoverClient: class MockCapRoverClient {
    get = mockGet
    post = mockPost
  },
}))

const mockClient = { get: mockGet, post: mockPost }

describe('CapRoverProvider', () => {
  let provider: CapRoverProvider

  beforeEach(() => {
    vi.clearAllMocks()
    mockClient.get.mockResolvedValue({ appDefinitions: [] })
    mockClient.post.mockResolvedValue({})

    provider = new CapRoverProvider({
      baseUrl: 'https://captain.example.com',
      password: 'test-pass',
    })
  })

  it('has correct name and version', () => {
    expect(provider.name).toBe('caprover')
    expect(provider.version).toBeDefined()
  })

  it('has limited capabilities', () => {
    expect(provider.capabilities).toEqual({
      apps: { start: false, stop: false, restart: false, logs: false },
      servers: true,
      databases: false,
      deployments: { list: false, cancel: false },
    })
  })

  it('apps is defined with required methods', () => {
    expect(provider.apps).toBeDefined()
    expect(typeof provider.apps.list).toBe('function')
    expect(typeof provider.apps.get).toBe('function')
    expect(typeof provider.apps.create).toBe('function')
    expect(typeof provider.apps.delete).toBe('function')
    expect(typeof provider.apps.deploy).toBe('function')
  })

  it('does not have start/stop/restart/logs', () => {
    expect(provider.apps.start).toBeUndefined()
    expect(provider.apps.stop).toBeUndefined()
    expect(provider.apps.restart).toBeUndefined()
    expect(provider.apps.logs).toBeUndefined()
  })

  it('env is defined with all methods', () => {
    expect(provider.env).toBeDefined()
    expect(typeof provider.env.list).toBe('function')
    expect(typeof provider.env.set).toBe('function')
    expect(typeof provider.env.delete).toBe('function')
    expect(typeof provider.env.pull).toBe('function')
    expect(typeof provider.env.push).toBe('function')
  })

  it('servers is defined', () => {
    expect(provider.servers).toBeDefined()
    expect(typeof provider.servers!.list).toBe('function')
    expect(typeof provider.servers!.get).toBe('function')
  })

  it('databases is not defined', () => {
    expect(provider.databases).toBeUndefined()
  })

  it('deployments is not defined', () => {
    expect(provider.deployments).toBeUndefined()
  })

  // --- App operations ---

  it('apps.list returns normalized apps', async () => {
    mockClient.get.mockResolvedValueOnce({
      appDefinitions: [
        { appName: 'my-app', instanceCount: 1, customDomain: [] },
        { appName: 'other-app', instanceCount: 0, customDomain: [] },
      ],
    })

    const apps = await provider.apps.list()
    expect(apps).toHaveLength(2)
    expect(apps[0].id).toBe('my-app')
    expect(apps[0].status).toBe('running')
    expect(apps[1].id).toBe('other-app')
    expect(apps[1].status).toBe('stopped')
    expect(mockClient.get).toHaveBeenCalledWith('/api/v2/user/apps/appDefinitions')
  })

  it('apps.get finds app by appName', async () => {
    mockClient.get.mockResolvedValueOnce({
      appDefinitions: [
        { appName: 'target-app', instanceCount: 1, customDomain: [] },
        { appName: 'other-app', instanceCount: 0, customDomain: [] },
      ],
    })

    const app = await provider.apps.get('target-app')
    expect(app.id).toBe('target-app')
    expect(app.status).toBe('running')
  })

  it('apps.get throws when app not found', async () => {
    mockClient.get.mockResolvedValueOnce({ appDefinitions: [] })

    await expect(provider.apps.get('nonexistent')).rejects.toThrow("application 'nonexistent' not found")
  })

  it('apps.create registers app and returns it', async () => {
    mockClient.post.mockResolvedValueOnce({})
    mockClient.get.mockResolvedValueOnce({
      appDefinitions: [{ appName: 'new-app', instanceCount: 0, customDomain: [] }],
    })

    const app = await provider.apps.create({
      name: 'new-app',
      source: { type: 'image', image: 'nginx:latest' },
    })

    expect(mockClient.post).toHaveBeenCalledWith(
      '/api/v2/user/apps/appDefinitions/register',
      { appName: 'new-app', hasPersistentData: false },
    )
    expect(app.id).toBe('new-app')
  })

  it('apps.create sets env vars if provided', async () => {
    mockClient.post.mockResolvedValue({})
    // First get for push (full replace), second get for the final apps.get
    mockClient.get
      .mockResolvedValueOnce({
        appDefinitions: [{ appName: 'new-app', instanceCount: 0, customDomain: [] }],
      })

    await provider.apps.create({
      name: 'new-app',
      source: { type: 'image', image: 'nginx:latest' },
      env: { NODE_ENV: 'production' },
    })

    // register + push (update with envVars)
    expect(mockClient.post).toHaveBeenCalledWith(
      '/api/v2/user/apps/appDefinitions/register',
      { appName: 'new-app', hasPersistentData: false },
    )
    expect(mockClient.post).toHaveBeenCalledWith(
      '/api/v2/user/apps/appDefinitions/update',
      { appName: 'new-app', envVars: [{ key: 'NODE_ENV', value: 'production' }] },
    )
  })

  it('apps.delete sends delete request', async () => {
    await provider.apps.delete('my-app')

    expect(mockClient.post).toHaveBeenCalledWith(
      '/api/v2/user/apps/appDefinitions/delete',
      { appName: 'my-app' },
    )
  })

  it('apps.deploy returns a synthetic deployment', async () => {
    const dep = await provider.apps.deploy('my-app')

    expect(dep.appId).toBe('my-app')
    expect(dep.status).toBe('queued')
    expect(mockClient.post).toHaveBeenCalledWith(
      '/api/v2/user/apps/appDefinitions/deploy',
      expect.objectContaining({ appName: 'my-app' }),
    )
  })

  // --- Env operations ---

  it('env.list returns env vars from app definition', async () => {
    mockClient.get.mockResolvedValueOnce({
      appDefinitions: [{
        appName: 'my-app',
        instanceCount: 1,
        envVars: [
          { key: 'DB_HOST', value: 'localhost' },
          { key: 'DB_PORT', value: '5432' },
        ],
        customDomain: [],
      }],
    })

    const envs = await provider.env.list('my-app')
    expect(envs).toHaveLength(2)
    expect(envs[0].key).toBe('DB_HOST')
    expect(envs[1].key).toBe('DB_PORT')
  })

  it('env.list returns empty array when no envVars', async () => {
    mockClient.get.mockResolvedValueOnce({
      appDefinitions: [{
        appName: 'my-app',
        instanceCount: 1,
        customDomain: [],
      }],
    })

    const envs = await provider.env.list('my-app')
    expect(envs).toEqual([])
  })

  it('env.set merges new vars with existing', async () => {
    mockClient.get.mockResolvedValueOnce({
      appDefinitions: [{
        appName: 'my-app',
        instanceCount: 1,
        envVars: [{ key: 'EXISTING', value: 'old' }],
        customDomain: [],
      }],
    })

    await provider.env.set('my-app', { NEW_VAR: 'new', EXISTING: 'updated' })

    expect(mockClient.post).toHaveBeenCalledWith(
      '/api/v2/user/apps/appDefinitions/update',
      {
        appName: 'my-app',
        envVars: expect.arrayContaining([
          { key: 'EXISTING', value: 'updated' },
          { key: 'NEW_VAR', value: 'new' },
        ]),
      },
    )
  })

  it('env.delete removes a specific key', async () => {
    mockClient.get.mockResolvedValueOnce({
      appDefinitions: [{
        appName: 'my-app',
        instanceCount: 1,
        envVars: [
          { key: 'KEEP', value: 'yes' },
          { key: 'DELETE_ME', value: 'bye' },
        ],
        customDomain: [],
      }],
    })

    await provider.env.delete('my-app', 'DELETE_ME')

    expect(mockClient.post).toHaveBeenCalledWith(
      '/api/v2/user/apps/appDefinitions/update',
      {
        appName: 'my-app',
        envVars: [{ key: 'KEEP', value: 'yes' }],
      },
    )
  })

  it('env.pull returns key-value record', async () => {
    mockClient.get.mockResolvedValueOnce({
      appDefinitions: [{
        appName: 'my-app',
        instanceCount: 1,
        envVars: [
          { key: 'A', value: '1' },
          { key: 'B', value: '2' },
        ],
        customDomain: [],
      }],
    })

    const result = await provider.env.pull('my-app')
    expect(result).toEqual({ A: '1', B: '2' })
  })

  it('env.push replaces all env vars', async () => {
    await provider.env.push('my-app', { ONLY: 'this' })

    expect(mockClient.post).toHaveBeenCalledWith(
      '/api/v2/user/apps/appDefinitions/update',
      {
        appName: 'my-app',
        envVars: [{ key: 'ONLY', value: 'this' }],
      },
    )
  })

  // --- Server operations ---

  it('servers.list returns normalized servers', async () => {
    mockClient.get.mockResolvedValueOnce([
      {
        nodeId: 'node-1',
        hostname: 'captain-01',
        ip: '10.0.0.1',
        isLeader: true,
        state: 'ready',
      },
    ])

    const servers = await provider.servers!.list()
    expect(servers).toHaveLength(1)
    expect(servers[0].id).toBe('node-1')
    expect(servers[0].status).toBe('reachable')
    expect(mockClient.get).toHaveBeenCalledWith('/api/v2/user/system/nodes')
  })

  it('servers.get finds server by id', async () => {
    mockClient.get.mockResolvedValueOnce([
      { nodeId: 'node-1', hostname: 'captain-01', ip: '10.0.0.1', state: 'ready' },
      { nodeId: 'node-2', hostname: 'worker-01', ip: '10.0.0.2', state: 'ready' },
    ])

    const server = await provider.servers!.get('node-2')
    expect(server.id).toBe('node-2')
    expect(server.name).toBe('worker-01')
  })

  it('servers.get throws when server not found', async () => {
    mockClient.get.mockResolvedValueOnce([])

    await expect(provider.servers!.get('nonexistent')).rejects.toThrow("server 'nonexistent' not found")
  })

  // --- Health check ---

  it('healthCheck returns ok on success', async () => {
    mockClient.get.mockResolvedValueOnce({ appDefinitions: [] })

    const health = await provider.healthCheck()
    expect(health.ok).toBe(true)
    expect(health.provider).toBe('caprover')
    expect(health.latencyMs).toBeGreaterThanOrEqual(0)
  })

  it('healthCheck returns not ok on failure', async () => {
    mockClient.get.mockRejectedValueOnce(new Error('fail'))

    const health = await provider.healthCheck()
    expect(health.ok).toBe(false)
    expect(health.message).toBe('Health check failed')
  })
})
