import type {
  PaasProvider, ProviderCapabilities, AppOperations, EnvOperations,
  ServerOperations, DatabaseOperations, DeploymentOperations,
  ProviderConfig, HealthStatus, App, CreateAppInput, DeployOpts,
  Deployment, LogOpts, LogLine, EnvVar, Server, Database,
  CreateDatabaseInput,
} from '@paasman/core'
import { CoolifyClient } from './client.js'
import { toApp, toServer, toDeployment, toEnvVar, toDatabase } from './normalizers.js'

export interface CoolifyProviderConfig {
  baseUrl: string
  token: string
}

export class CoolifyProvider implements PaasProvider {
  readonly name = 'coolify'
  readonly version = '0.1.0'
  readonly capabilities: ProviderCapabilities = {
    apps: { start: true, stop: true, restart: true, logs: true },
    servers: true,
    databases: true,
    deployments: { list: true, cancel: true },
  }

  private client: CoolifyClient
  // Task 22: internal envUuidMap to cache Coolify env UUIDs
  private envUuidMap = new Map<string, string>()

  constructor(config: CoolifyProviderConfig) {
    this.client = new CoolifyClient(config.baseUrl, config.token)
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
      const data = await this.client.get<{ version?: string }>('/api/v1/version')
      return {
        ok: true,
        provider: this.name,
        version: data.version,
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

  // Task 19: private getLogs method to fix `this` binding in async generator
  private async *getLogs(id: string, opts?: LogOpts): AsyncGenerator<LogLine> {
    const params = new URLSearchParams()
    if (opts?.lines) params.set('limit', String(opts.lines))
    const query = params.toString() ? `?${params.toString()}` : ''
    const data = await this.client.get<string[]>(`/api/v1/applications/${id}/logs${query}`)
    for (const line of data) {
      yield { message: line, stream: 'stdout' as const }
    }
  }

  apps: AppOperations = {
    list: async (): Promise<App[]> => {
      const data = await this.client.get<Record<string, unknown>[]>('/api/v1/applications')
      return data.map(toApp)
    },

    get: async (id: string): Promise<App> => {
      const data = await this.client.get<Record<string, unknown>>(`/api/v1/applications/${id}`)
      return toApp(data)
    },

    create: async (input: CreateAppInput): Promise<App> => {
      let endpoint: string
      let body: Record<string, unknown>

      switch (input.source.type) {
        case 'git':
          endpoint = '/api/v1/applications/public'
          body = {
            name: input.name,
            git_repository: input.source.repository,
            git_branch: input.source.branch ?? 'main',
            server_uuid: input.serverId,
            domains: input.domains?.join(','),
          }
          break
        case 'image':
          endpoint = '/api/v1/applications/dockerimage'
          body = {
            name: input.name,
            docker_registry_image_name: input.source.image,
            server_uuid: input.serverId,
            domains: input.domains?.join(','),
          }
          break
        case 'dockerfile':
          endpoint = '/api/v1/applications/dockerfile'
          body = {
            name: input.name,
            dockerfile: input.source.content,
            server_uuid: input.serverId,
            domains: input.domains?.join(','),
          }
          break
      }

      const data = await this.client.post<Record<string, unknown>>(endpoint, body)
      const app = toApp(data)

      if (input.env && Object.keys(input.env).length > 0) {
        await this.env.push(app.id, input.env)
      }

      return app
    },

    delete: async (id: string): Promise<void> => {
      await this.client.del(`/api/v1/applications/${id}`)
    },

    deploy: async (id: string, opts?: DeployOpts): Promise<Deployment> => {
      const params = new URLSearchParams()
      if (opts?.force) params.set('force', 'true')
      const query = params.toString() ? `?${params.toString()}` : ''
      const data = await this.client.post<Record<string, unknown>>(
        `/api/v1/applications/${id}/restart${query}`,
      )
      return toDeployment(data)
    },

    start: async (id: string): Promise<void> => {
      await this.client.post(`/api/v1/applications/${id}/start`)
    },

    stop: async (id: string): Promise<void> => {
      await this.client.post(`/api/v1/applications/${id}/stop`)
    },

    restart: async (id: string): Promise<void> => {
      await this.client.post(`/api/v1/applications/${id}/restart`)
    },

    // Task 19: reference getLogs method for proper this binding
    logs: (id: string, opts?: LogOpts) => this.getLogs(id, opts),
  }

  env: EnvOperations = {
    // Task 22: list populates envUuidMap
    list: async (appId: string): Promise<EnvVar[]> => {
      const data = await this.client.get<Record<string, unknown>[]>(
        `/api/v1/applications/${appId}/envs`,
      )
      // Cache UUIDs for later deletion
      for (const item of data) {
        if (item.uuid && item.key) {
          this.envUuidMap.set(`${appId}:${item.key}`, item.uuid as string)
        }
      }
      return data.map(toEnvVar)
    },

    // Task 21: set = additive merge (PATCH bulk)
    set: async (appId: string, vars: Record<string, string>): Promise<void> => {
      const entries = Object.entries(vars).map(([key, value]) => ({
        key,
        value,
        is_build_time: false,
        is_preview: false,
      }))
      await this.client.patch(`/api/v1/applications/${appId}/envs/bulk`, entries)
    },

    // Task 22: delete uses envUuidMap
    delete: async (appId: string, key: string): Promise<void> => {
      let uuid = this.envUuidMap.get(`${appId}:${key}`)
      if (!uuid) {
        // Fetch to populate cache
        await this.env.list(appId)
        uuid = this.envUuidMap.get(`${appId}:${key}`)
      }
      if (uuid) {
        await this.client.del(`/api/v1/applications/${appId}/envs/${uuid}`)
        this.envUuidMap.delete(`${appId}:${key}`)
      }
    },

    pull: async (appId: string): Promise<Record<string, string>> => {
      const envs = await this.env.list(appId)
      return Object.fromEntries(envs.map((e) => [e.key, e.value]))
    },

    // Task 21: push = full replace (delete all existing, then set new)
    push: async (appId: string, vars: Record<string, string>): Promise<void> => {
      // First get existing envs to delete them
      const existing = await this.env.list(appId)
      for (const env of existing) {
        await this.env.delete(appId, env.key)
      }
      // Then set the new vars
      if (Object.keys(vars).length > 0) {
        await this.env.set(appId, vars)
      }
    },
  }

  servers: ServerOperations = {
    list: async (): Promise<Server[]> => {
      const data = await this.client.get<Record<string, unknown>[]>('/api/v1/servers')
      return data.map(toServer)
    },

    get: async (id: string): Promise<Server> => {
      const data = await this.client.get<Record<string, unknown>>(`/api/v1/servers/${id}`)
      return toServer(data)
    },
  }

  // Task 25: use toDatabase normalizer instead of inline normalization
  databases: DatabaseOperations = {
    list: async (): Promise<Database[]> => {
      const data = await this.client.get<Record<string, unknown>[]>('/api/v1/databases')
      return data.map(toDatabase)
    },

    get: async (id: string): Promise<Database> => {
      const data = await this.client.get<Record<string, unknown>>(`/api/v1/databases/${id}`)
      return toDatabase(data)
    },

    create: async (input: CreateDatabaseInput): Promise<Database> => {
      const data = await this.client.post<Record<string, unknown>>(
        `/api/v1/databases/${input.engine}`,
        {
          name: input.name,
          version: input.version,
          server_uuid: input.serverId,
        },
      )
      return toDatabase({
        ...data,
        // Ensure we have fallback values for the normalizer
        name: data.name ?? input.name,
        type: data.type ?? input.engine,
        version: data.version ?? input.version,
        server_uuid: data.server_uuid ?? input.serverId,
      })
    },

    delete: async (id: string): Promise<void> => {
      await this.client.del(`/api/v1/databases/${id}`)
    },
  }

  deployments: DeploymentOperations = {
    list: async (appId?: string): Promise<Deployment[]> => {
      const path = appId
        ? `/api/v1/applications/${appId}/deployments`
        : '/api/v1/deployments'
      const data = await this.client.get<Record<string, unknown>[]>(path)
      return data.map(toDeployment)
    },

    get: async (id: string): Promise<Deployment> => {
      const data = await this.client.get<Record<string, unknown>>(`/api/v1/deployments/${id}`)
      return toDeployment(data)
    },

    cancel: async (id: string): Promise<void> => {
      await this.client.del(`/api/v1/deployments/${id}`)
    },
  }
}
