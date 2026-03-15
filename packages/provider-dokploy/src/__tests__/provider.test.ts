import { describe, expect, it, vi, beforeEach } from 'vitest'
import { DokployProvider } from '../provider.js'
import type { DokployProviderConfig } from '../provider.js'

const mockGet = vi.fn().mockResolvedValue([])
const mockPost = vi.fn().mockResolvedValue({})

// Mock the client module with a real class so `new DokployClient()` works
vi.mock('../client.js', () => ({
  DokployClient: class MockDokployClient {
    get = mockGet
    post = mockPost
  },
}))

const mockClient = { get: mockGet, post: mockPost }

describe('DokployProvider', () => {
  let provider: DokployProvider

  beforeEach(() => {
    vi.clearAllMocks()
    mockClient.get.mockResolvedValue([])
    mockClient.post.mockResolvedValue({})

    provider = new DokployProvider({
      baseUrl: 'https://dokploy.example.com',
      apiKey: 'test-api-key',
    })
  })

  it('has correct name and version', () => {
    expect(provider.name).toBe('dokploy')
    expect(provider.version).toBeDefined()
  })

  it('has full capabilities', () => {
    expect(provider.capabilities).toEqual({
      apps: { start: true, stop: true, restart: true, logs: true },
      servers: true,
      databases: true,
      deployments: { list: true, cancel: true },
    })
  })

  it('apps is defined with all methods', () => {
    expect(provider.apps).toBeDefined()
    expect(typeof provider.apps.list).toBe('function')
    expect(typeof provider.apps.get).toBe('function')
    expect(typeof provider.apps.create).toBe('function')
    expect(typeof provider.apps.delete).toBe('function')
    expect(typeof provider.apps.deploy).toBe('function')
    expect(typeof provider.apps.start).toBe('function')
    expect(typeof provider.apps.stop).toBe('function')
    expect(typeof provider.apps.restart).toBe('function')
    expect(typeof provider.apps.logs).toBe('function')
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

  it('databases is defined', () => {
    expect(provider.databases).toBeDefined()
    expect(typeof provider.databases!.list).toBe('function')
    expect(typeof provider.databases!.get).toBe('function')
    expect(typeof provider.databases!.create).toBe('function')
    expect(typeof provider.databases!.delete).toBe('function')
  })

  it('deployments is defined', () => {
    expect(provider.deployments).toBeDefined()
    expect(typeof provider.deployments!.list).toBe('function')
    expect(typeof provider.deployments!.get).toBe('function')
    expect(typeof provider.deployments!.cancel).toBe('function')
  })

  // apps.list fetches projects and flattens applications
  it('apps.list fetches from project.all and flattens apps', async () => {
    mockClient.get.mockResolvedValueOnce([
      {
        projectId: 'proj-1',
        applications: [
          {
            applicationId: 'app-1', name: 'web', applicationStatus: 'running',
            createdAt: '2026-01-01T00:00:00Z', updatedAt: '2026-01-01T00:00:00Z',
          },
          {
            applicationId: 'app-2', name: 'api', applicationStatus: 'idle',
            createdAt: '2026-01-01T00:00:00Z', updatedAt: '2026-01-01T00:00:00Z',
          },
        ],
      },
      {
        projectId: 'proj-2',
        applications: [
          {
            applicationId: 'app-3', name: 'worker', applicationStatus: 'running',
            createdAt: '2026-01-01T00:00:00Z', updatedAt: '2026-01-01T00:00:00Z',
          },
        ],
      },
    ])

    const apps = await provider.apps.list()
    expect(apps).toHaveLength(3)
    expect(apps[0].id).toBe('app-1')
    expect(apps[1].id).toBe('app-2')
    expect(apps[2].id).toBe('app-3')
    expect(mockClient.get).toHaveBeenCalledWith('/api/project.all')
  })

  it('apps.get fetches single application', async () => {
    mockClient.get.mockResolvedValueOnce({
      applicationId: 'app-1', name: 'my-app', applicationStatus: 'running',
      createdAt: '2026-01-01T00:00:00Z', updatedAt: '2026-01-01T00:00:00Z',
    })

    const app = await provider.apps.get('app-1')
    expect(app.id).toBe('app-1')
    expect(app.name).toBe('my-app')
    expect(mockClient.get).toHaveBeenCalledWith('/api/application.one', { applicationId: 'app-1' })
  })

  it('apps.create posts to application.create', async () => {
    mockClient.post.mockResolvedValueOnce({
      applicationId: 'new-app', name: 'test-app', applicationStatus: 'idle',
      createdAt: '2026-01-01T00:00:00Z', updatedAt: '2026-01-01T00:00:00Z',
    })

    const app = await provider.apps.create({
      name: 'test-app',
      source: { type: 'git', repository: 'https://github.com/test/repo', branch: 'main' },
    })

    expect(app.id).toBe('new-app')
    expect(mockClient.post).toHaveBeenCalledWith('/api/application.create', expect.objectContaining({
      name: 'test-app',
    }))
  })

  it('apps.delete posts to application.delete', async () => {
    await provider.apps.delete('app-1')
    expect(mockClient.post).toHaveBeenCalledWith('/api/application.delete', { applicationId: 'app-1' })
  })

  it('apps.deploy posts to application.deploy', async () => {
    mockClient.post.mockResolvedValueOnce({
      deploymentId: 'dep-1', applicationId: 'app-1', status: 'running',
      createdAt: '2026-01-01T00:00:00Z',
    })

    const dep = await provider.apps.deploy('app-1')
    expect(dep.id).toBe('dep-1')
    expect(mockClient.post).toHaveBeenCalledWith('/api/application.deploy', { applicationId: 'app-1' })
  })

  it('apps.start posts to application.start', async () => {
    await provider.apps.start!('app-1')
    expect(mockClient.post).toHaveBeenCalledWith('/api/application.start', { applicationId: 'app-1' })
  })

  it('apps.stop posts to application.stop', async () => {
    await provider.apps.stop!('app-1')
    expect(mockClient.post).toHaveBeenCalledWith('/api/application.stop', { applicationId: 'app-1' })
  })

  it('apps.restart posts to application.redeploy', async () => {
    await provider.apps.restart!('app-1')
    expect(mockClient.post).toHaveBeenCalledWith('/api/application.redeploy', { applicationId: 'app-1' })
  })

  // logs
  it('apps.logs yields log lines', async () => {
    mockClient.get.mockResolvedValue([
      { message: 'line 1', timestamp: '2026-01-01T00:00:00Z' },
      { message: 'line 2', timestamp: '2026-01-01T00:00:01Z' },
      { message: 'line 3', timestamp: '2026-01-01T00:00:02Z' },
    ])

    const lines: Array<{ message: string }> = []
    for await (const line of provider.apps.logs!('app-1')) {
      lines.push(line)
    }

    expect(lines).toHaveLength(3)
    expect(lines[0].message).toBe('line 1')
    expect(lines[1].message).toBe('line 2')
    expect(lines[2].message).toBe('line 3')
  })

  // env operations
  it('env.list fetches app and parses env string', async () => {
    mockClient.get.mockResolvedValueOnce({
      applicationId: 'app-1', name: 'my-app', applicationStatus: 'running',
      env: 'DB_HOST=localhost\nDB_PORT=5432',
      createdAt: '2026-01-01T00:00:00Z', updatedAt: '2026-01-01T00:00:00Z',
    })

    const vars = await provider.env.list('app-1')
    expect(vars).toHaveLength(2)
    expect(vars[0].key).toBe('DB_HOST')
    expect(vars[0].value).toBe('localhost')
    expect(vars[1].key).toBe('DB_PORT')
    expect(vars[1].value).toBe('5432')
  })

  it('env.list handles empty env', async () => {
    mockClient.get.mockResolvedValueOnce({
      applicationId: 'app-1', name: 'my-app', applicationStatus: 'running',
      env: '',
      createdAt: '2026-01-01T00:00:00Z', updatedAt: '2026-01-01T00:00:00Z',
    })

    const vars = await provider.env.list('app-1')
    expect(vars).toHaveLength(0)
  })

  it('env.set merges new vars with existing', async () => {
    // First get existing app with env
    mockClient.get.mockResolvedValueOnce({
      applicationId: 'app-1', name: 'my-app', applicationStatus: 'running',
      env: 'EXISTING=value',
      createdAt: '2026-01-01T00:00:00Z', updatedAt: '2026-01-01T00:00:00Z',
    })

    await provider.env.set('app-1', { NEW_VAR: 'new_value' })

    expect(mockClient.post).toHaveBeenCalledWith('/api/application.saveEnvironment', {
      applicationId: 'app-1',
      env: 'EXISTING=value\nNEW_VAR=new_value',
    })
  })

  it('env.set overwrites existing var with same key', async () => {
    mockClient.get.mockResolvedValueOnce({
      applicationId: 'app-1', name: 'my-app', applicationStatus: 'running',
      env: 'DB_HOST=old_host\nDB_PORT=5432',
      createdAt: '2026-01-01T00:00:00Z', updatedAt: '2026-01-01T00:00:00Z',
    })

    await provider.env.set('app-1', { DB_HOST: 'new_host' })

    expect(mockClient.post).toHaveBeenCalledWith('/api/application.saveEnvironment', {
      applicationId: 'app-1',
      env: 'DB_HOST=new_host\nDB_PORT=5432',
    })
  })

  it('env.push replaces all envs', async () => {
    await provider.env.push('app-1', { ONLY_VAR: 'only_value' })

    expect(mockClient.post).toHaveBeenCalledWith('/api/application.saveEnvironment', {
      applicationId: 'app-1',
      env: 'ONLY_VAR=only_value',
    })
  })

  it('env.delete removes a specific key', async () => {
    mockClient.get.mockResolvedValueOnce({
      applicationId: 'app-1', name: 'my-app', applicationStatus: 'running',
      env: 'KEEP=yes\nREMOVE=no\nALSO_KEEP=yep',
      createdAt: '2026-01-01T00:00:00Z', updatedAt: '2026-01-01T00:00:00Z',
    })

    await provider.env.delete('app-1', 'REMOVE')

    expect(mockClient.post).toHaveBeenCalledWith('/api/application.saveEnvironment', {
      applicationId: 'app-1',
      env: 'KEEP=yes\nALSO_KEEP=yep',
    })
  })

  it('env.pull returns key-value record', async () => {
    mockClient.get.mockResolvedValueOnce({
      applicationId: 'app-1', name: 'my-app', applicationStatus: 'running',
      env: 'A=1\nB=2',
      createdAt: '2026-01-01T00:00:00Z', updatedAt: '2026-01-01T00:00:00Z',
    })

    const result = await provider.env.pull('app-1')
    expect(result).toEqual({ A: '1', B: '2' })
  })

  // servers
  it('servers.list returns normalized servers', async () => {
    mockClient.get.mockResolvedValueOnce([
      {
        serverId: 'srv-1', name: 'server-1', ipAddress: '10.0.0.1',
        serverStatus: 'active',
      },
    ])

    const servers = await provider.servers!.list()
    expect(servers).toHaveLength(1)
    expect(servers[0].id).toBe('srv-1')
    expect(servers[0].status).toBe('reachable')
    expect(mockClient.get).toHaveBeenCalledWith('/api/server.all')
  })

  it('servers.get returns single server', async () => {
    mockClient.get.mockResolvedValueOnce({
      serverId: 'srv-1', name: 'server-1', ipAddress: '10.0.0.1',
      serverStatus: 'active',
    })

    const server = await provider.servers!.get('srv-1')
    expect(server.id).toBe('srv-1')
    expect(mockClient.get).toHaveBeenCalledWith('/api/server.one', { serverId: 'srv-1' })
  })

  // databases
  it('databases.list flattens databases from projects', async () => {
    mockClient.get.mockResolvedValueOnce([
      {
        projectId: 'proj-1',
        postgres: [
          { databaseId: 'db-1', name: 'pg-db', type: 'postgres', applicationStatus: 'running' },
        ],
        mysql: [
          { databaseId: 'db-2', name: 'mysql-db', type: 'mysql', applicationStatus: 'running' },
        ],
        mariadb: [],
        mongo: [],
        redis: [],
      },
    ])

    const dbs = await provider.databases!.list()
    expect(dbs).toHaveLength(2)
    expect(dbs[0].id).toBe('db-1')
    expect(dbs[1].id).toBe('db-2')
    expect(mockClient.get).toHaveBeenCalledWith('/api/project.all')
  })

  it('databases.create posts to engine-specific endpoint', async () => {
    mockClient.post.mockResolvedValueOnce({
      databaseId: 'db-new', name: 'my-pg', type: 'postgres',
      applicationStatus: 'idle',
    })

    const db = await provider.databases!.create({
      name: 'my-pg',
      engine: 'postgresql',
      version: '16',
    })

    expect(db.id).toBe('db-new')
    expect(mockClient.post).toHaveBeenCalledWith('/api/postgres.create', expect.objectContaining({
      name: 'my-pg',
    }))
  })

  it('databases.delete posts to engine-appropriate delete', async () => {
    // databases.delete calls databases.get which scans project.all
    mockClient.get.mockResolvedValueOnce([
      {
        projectId: 'proj-1',
        postgres: [
          { databaseId: 'db-1', name: 'my-pg', type: 'postgres', applicationStatus: 'running' },
        ],
        mysql: [],
        mariadb: [],
        mongo: [],
        redis: [],
      },
    ])

    await provider.databases!.delete('db-1')
    expect(mockClient.post).toHaveBeenCalledWith('/api/postgres.delete', { databaseId: 'db-1' })
  })

  // deployments
  it('deployments.list returns normalized deployments', async () => {
    mockClient.get.mockResolvedValueOnce([
      {
        deploymentId: 'dep-1', applicationId: 'app-1', status: 'done',
        createdAt: '2026-01-01T00:00:00Z',
      },
    ])

    const deps = await provider.deployments!.list('app-1')
    expect(deps).toHaveLength(1)
    expect(deps[0].id).toBe('dep-1')
    expect(deps[0].status).toBe('success')
    expect(mockClient.get).toHaveBeenCalledWith('/api/deployment.all', { applicationId: 'app-1' })
  })

  it('deployments.cancel posts to deployment.killProcess', async () => {
    await provider.deployments!.cancel!('dep-1')
    expect(mockClient.post).toHaveBeenCalledWith('/api/deployment.killProcess', { deploymentId: 'dep-1' })
  })

  // health check
  it('healthCheck returns ok status on success', async () => {
    mockClient.get.mockResolvedValueOnce({ version: '1.0.0' })

    const health = await provider.healthCheck()
    expect(health.ok).toBe(true)
    expect(health.provider).toBe('dokploy')
  })

  it('healthCheck returns not-ok on failure', async () => {
    mockClient.get.mockRejectedValueOnce(new Error('fail'))

    const health = await provider.healthCheck()
    expect(health.ok).toBe(false)
    expect(health.provider).toBe('dokploy')
  })
})
