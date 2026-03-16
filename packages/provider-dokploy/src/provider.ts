import type {
  PaasProvider, ProviderCapabilities, AppOperations, EnvOperations,
  ServerOperations, DatabaseOperations, DeploymentOperations,
  ProviderConfig, HealthStatus, App, CreateAppInput, DeployOpts,
  Deployment, LogOpts, LogLine, EnvVar, Server, Database,
  CreateDatabaseInput,
} from '@paasman/core'
import { DokployClient } from './client.js'
import { toApp, toServer, toDeployment, toEnvVar, toDatabase } from './normalizers.js'

export interface DokployProviderConfig {
  baseUrl: string
  apiKey: string
}

/** Map from DatabaseEngine to Dokploy router name */
const ENGINE_TO_ROUTER: Record<string, string> = {
  postgresql: 'postgres',
  mysql: 'mysql',
  mariadb: 'mariadb',
  mongodb: 'mongo',
  redis: 'redis',
}

export class DokployProvider implements PaasProvider {
  readonly name = 'dokploy'
  readonly version = '0.1.0'
  readonly capabilities: ProviderCapabilities = {
    apps: { start: true, stop: true, restart: true, logs: true },
    servers: true,
    databases: true,
    deployments: { list: true, cancel: true },
  }

  private client: DokployClient

  constructor(config: DokployProviderConfig) {
    this.client = new DokployClient(config.baseUrl, config.apiKey)
  }

  async connect(): Promise<void> {
    await this.healthCheck()
  }

  async disconnect(): Promise<void> {
    // No persistent connections to clean up
  }

  async healthCheck(): Promise<HealthStatus> {
    const start = Date.now()
    try {
      // Use project.all as a lightweight health check
      await this.client.get<unknown>('/api/project.all')
      return {
        ok: true,
        provider: this.name,
        latencyMs: Date.now() - start,
      }
    } catch {
      return {
        ok: false,
        provider: this.name,
        latencyMs: Date.now() - start,
        message: 'Health check failed',
      }
    }
  }

  private async *getLogs(id: string, opts?: LogOpts): AsyncGenerator<LogLine> {
    const data = await this.client.post<{ logs: string[] | string }>(
      '/api/application.readLogs', { applicationId: id, lines: opts?.lines ?? 100 },
    )
    const lines = Array.isArray(data.logs) ? data.logs : (data.logs ?? '').split('\n')
    for (const line of lines) {
      if (line.trim()) {
        yield { message: line, stream: 'stdout' as const }
      }
    }
  }

  apps: AppOperations = {
    list: async (): Promise<App[]> => {
      const projects = await this.client.get<Array<Record<string, unknown>>>('/api/project.all')
      const apps: App[] = []
      for (const project of projects) {
        const applications = project.applications as Array<Record<string, unknown>> | undefined
        if (applications) {
          for (const app of applications) {
            apps.push(toApp(app))
          }
        }
      }
      return apps
    },

    get: async (id: string): Promise<App> => {
      const data = await this.client.get<Record<string, unknown>>(
        '/api/application.one', { applicationId: id },
      )
      return toApp(data)
    },

    create: async (input: CreateAppInput): Promise<App> => {
      const body: Record<string, unknown> = {
        name: input.name,
      }

      switch (input.source.type) {
        case 'git':
          body.repository = input.source.repository
          body.branch = input.source.branch ?? 'main'
          break
        case 'image':
          body.dockerImage = input.source.image
          break
        case 'dockerfile':
          body.dockerfile = input.source.content
          break
      }

      if (input.serverId) body.serverId = input.serverId
      if (input.domains) body.domains = input.domains

      const data = await this.client.post<Record<string, unknown>>('/api/application.create', body)
      const app = toApp(data)

      if (input.env && Object.keys(input.env).length > 0) {
        await this.env.push(app.id, input.env)
      }

      return app
    },

    delete: async (id: string): Promise<void> => {
      await this.client.post('/api/application.delete', { applicationId: id })
    },

    deploy: async (id: string, _opts?: DeployOpts): Promise<Deployment> => {
      const data = await this.client.post<Record<string, unknown>>(
        '/api/application.deploy', { applicationId: id },
      )
      return toDeployment(data)
    },

    start: async (id: string): Promise<void> => {
      await this.client.post('/api/application.start', { applicationId: id })
    },

    stop: async (id: string): Promise<void> => {
      await this.client.post('/api/application.stop', { applicationId: id })
    },

    restart: async (id: string): Promise<void> => {
      await this.client.post('/api/application.redeploy', { applicationId: id })
    },

    logs: (id: string, opts?: LogOpts) => this.getLogs(id, opts),
  }

  env: EnvOperations = {
    list: async (appId: string): Promise<EnvVar[]> => {
      const data = await this.client.get<Record<string, unknown>>(
        '/api/application.one', { applicationId: appId },
      )
      const envStr = (data.env as string) ?? ''
      if (!envStr.trim()) return []
      return envStr.split('\n').filter(Boolean).map(toEnvVar)
    },

    set: async (appId: string, vars: Record<string, string>): Promise<void> => {
      // Fetch existing env, merge, and save
      const data = await this.client.get<Record<string, unknown>>(
        '/api/application.one', { applicationId: appId },
      )
      const existing = (data.env as string) ?? ''
      const parsed = new Map<string, string>()

      // Parse existing
      if (existing.trim()) {
        for (const line of existing.split('\n').filter(Boolean)) {
          const idx = line.indexOf('=')
          if (idx >= 0) {
            parsed.set(line.slice(0, idx), line.slice(idx + 1))
          }
        }
      }

      // Merge new vars
      for (const [key, value] of Object.entries(vars)) {
        parsed.set(key, value)
      }

      const envStr = Array.from(parsed.entries())
        .map(([k, v]) => `${k}=${v}`)
        .join('\n')

      await this.client.post('/api/application.saveEnvironment', {
        applicationId: appId,
        env: envStr,
      })
    },

    delete: async (appId: string, key: string): Promise<void> => {
      const data = await this.client.get<Record<string, unknown>>(
        '/api/application.one', { applicationId: appId },
      )
      const existing = (data.env as string) ?? ''
      const lines = existing.split('\n').filter(Boolean).filter((line) => {
        const idx = line.indexOf('=')
        const lineKey = idx >= 0 ? line.slice(0, idx) : line
        return lineKey !== key
      })

      await this.client.post('/api/application.saveEnvironment', {
        applicationId: appId,
        env: lines.join('\n'),
      })
    },

    pull: async (appId: string): Promise<Record<string, string>> => {
      const envs = await this.env.list(appId)
      return Object.fromEntries(envs.map((e) => [e.key, e.value]))
    },

    push: async (appId: string, vars: Record<string, string>): Promise<void> => {
      const envStr = Object.entries(vars)
        .map(([k, v]) => `${k}=${v}`)
        .join('\n')

      await this.client.post('/api/application.saveEnvironment', {
        applicationId: appId,
        env: envStr,
      })
    },
  }

  servers: ServerOperations = {
    list: async (): Promise<Server[]> => {
      const data = await this.client.get<Record<string, unknown>[]>('/api/server.all')
      return data.map(toServer)
    },

    get: async (id: string): Promise<Server> => {
      const data = await this.client.get<Record<string, unknown>>(
        '/api/server.one', { serverId: id },
      )
      return toServer(data)
    },
  }

  databases: DatabaseOperations = {
    list: async (): Promise<Database[]> => {
      const projects = await this.client.get<Array<Record<string, unknown>>>('/api/project.all')
      const dbs: Database[] = []
      for (const project of projects) {
        for (const engine of ['postgres', 'mysql', 'mariadb', 'mongo', 'redis']) {
          const items = project[engine] as Array<Record<string, unknown>> | undefined
          if (items) {
            for (const item of items) {
              dbs.push(toDatabase(item))
            }
          }
        }
      }
      return dbs
    },

    get: async (id: string): Promise<Database> => {
      // Dokploy doesn't have a generic database.one endpoint;
      // we need to search through projects. For simplicity, we look up
      // by scanning all projects.
      const projects = await this.client.get<Array<Record<string, unknown>>>('/api/project.all')
      for (const project of projects) {
        for (const engine of ['postgres', 'mysql', 'mariadb', 'mongo', 'redis']) {
          const items = project[engine] as Array<Record<string, unknown>> | undefined
          if (items) {
            const found = items.find((item) => item.databaseId === id)
            if (found) return toDatabase(found)
          }
        }
      }
      // If not found in projects, try a direct get on postgres.one as fallback
      const data = await this.client.get<Record<string, unknown>>(
        '/api/postgres.one', { databaseId: id },
      )
      return toDatabase(data)
    },

    create: async (input: CreateDatabaseInput): Promise<Database> => {
      const router = ENGINE_TO_ROUTER[input.engine] ?? 'postgres'
      const body: Record<string, unknown> = {
        name: input.name,
      }
      if (input.version) body.version = input.version
      if (input.serverId) body.serverId = input.serverId

      const data = await this.client.post<Record<string, unknown>>(
        `/api/${router}.create`, body,
      )
      return toDatabase({
        ...data,
        name: data.name ?? input.name,
        type: data.type ?? router,
        version: data.version ?? input.version,
        serverId: data.serverId ?? input.serverId,
      })
    },

    delete: async (id: string): Promise<void> => {
      // Need to know the engine type to call the right router
      // Fetch the database first to determine its type
      const db = await this.databases!.get(id)
      const router = ENGINE_TO_ROUTER[db.engine] ?? 'postgres'
      await this.client.post(`/api/${router}.delete`, { databaseId: id })
    },
  }

  deployments: DeploymentOperations = {
    list: async (appId?: string): Promise<Deployment[]> => {
      if (!appId) {
        // Dokploy requires an applicationId for deployment listing
        // Return empty if no appId provided
        return []
      }
      const data = await this.client.get<Record<string, unknown>[]>(
        '/api/deployment.all', { applicationId: appId },
      )
      return data.map(toDeployment)
    },

    get: async (id: string): Promise<Deployment> => {
      // Dokploy doesn't have a deployment.one; scan through apps
      // This is a simplified implementation
      const data = await this.client.get<Record<string, unknown>>(
        '/api/deployment.one', { deploymentId: id },
      )
      return toDeployment(data)
    },

    cancel: async (id: string): Promise<void> => {
      await this.client.post('/api/deployment.killProcess', { deploymentId: id })
    },
  }
}
