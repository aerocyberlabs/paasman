import type {
  PaasProvider, ProviderCapabilities, AppOperations, EnvOperations,
  ServerOperations, ProviderConfig, HealthStatus, App, CreateAppInput,
  DeployOpts, Deployment, EnvVar, Server,
} from '@paasman/core'
import { CapRoverClient } from './client.js'
import { toApp, toServer, toEnvVar } from './normalizers.js'

export interface CapRoverProviderConfig {
  baseUrl: string
  password: string
}

export class CapRoverProvider implements PaasProvider {
  readonly name = 'caprover'
  readonly version = '0.1.0'
  readonly capabilities: ProviderCapabilities = {
    apps: { start: false, stop: false, restart: false, logs: false },
    servers: true,
    databases: false,
    deployments: { list: false, cancel: false },
  }

  private client: CapRoverClient

  constructor(config: CapRoverProviderConfig) {
    this.client = new CapRoverClient({ baseUrl: config.baseUrl, password: config.password })
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
      await this.client.get<{ appDefinitions: unknown[] }>(
        '/api/v2/user/apps/appDefinitions',
      )
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

  apps: AppOperations = {
    list: async (): Promise<App[]> => {
      const data = await this.client.get<{ appDefinitions: Record<string, unknown>[] }>(
        '/api/v2/user/apps/appDefinitions',
      )
      return data.appDefinitions.map(toApp)
    },

    get: async (id: string): Promise<App> => {
      const data = await this.client.get<{ appDefinitions: Record<string, unknown>[] }>(
        '/api/v2/user/apps/appDefinitions',
      )
      const app = data.appDefinitions.find((a) => a.appName === id)
      if (!app) {
        throw new Error(`App '${id}' not found`)
      }
      return toApp(app)
    },

    create: async (input: CreateAppInput): Promise<App> => {
      await this.client.post('/api/v2/user/apps/appDefinitions/register', {
        appName: input.name,
        hasPersistentData: false,
      })

      if (input.env && Object.keys(input.env).length > 0) {
        await this.env.push(input.name, input.env)
      }

      return this.apps.get(input.name)
    },

    delete: async (id: string): Promise<void> => {
      await this.client.post('/api/v2/user/apps/appDefinitions/delete', {
        appName: id,
      })
    },

    deploy: async (id: string, _opts?: DeployOpts): Promise<Deployment> => {
      await this.client.post('/api/v2/user/apps/appDefinitions/deploy', {
        appName: id,
        captainDefinitionContent: JSON.stringify({
          schemaVersion: 2,
          imageName: '',
        }),
      })
      // CapRover has no deployment objects; return a synthetic one
      return {
        id: `deploy-${id}-${Date.now()}`,
        appId: id,
        status: 'queued',
        triggeredAt: new Date(),
        meta: {},
        raw: {},
      }
    },
  }

  env: EnvOperations = {
    list: async (appId: string): Promise<EnvVar[]> => {
      const app = await this.apps.get(appId)
      const raw = app.raw as Record<string, unknown>
      const envVars = raw.envVars as Array<{ key: string; value: string }> | undefined
      if (!envVars) return []
      return envVars.map(toEnvVar)
    },

    set: async (appId: string, vars: Record<string, string>): Promise<void> => {
      // Fetch current envVars, merge, and update
      const app = await this.apps.get(appId)
      const raw = app.raw as Record<string, unknown>
      const existing = (raw.envVars as Array<{ key: string; value: string }>) ?? []

      const envMap = new Map<string, string>()
      for (const e of existing) {
        envMap.set(e.key, e.value)
      }
      for (const [key, value] of Object.entries(vars)) {
        envMap.set(key, value)
      }

      const envVars = Array.from(envMap.entries()).map(([key, value]) => ({ key, value }))
      await this.client.post('/api/v2/user/apps/appDefinitions/update', {
        appName: appId,
        envVars,
      })
    },

    delete: async (appId: string, key: string): Promise<void> => {
      const app = await this.apps.get(appId)
      const raw = app.raw as Record<string, unknown>
      const existing = (raw.envVars as Array<{ key: string; value: string }>) ?? []
      const envVars = existing.filter((e) => e.key !== key)

      await this.client.post('/api/v2/user/apps/appDefinitions/update', {
        appName: appId,
        envVars,
      })
    },

    pull: async (appId: string): Promise<Record<string, string>> => {
      const envs = await this.env.list(appId)
      return Object.fromEntries(envs.map((e) => [e.key, e.value]))
    },

    push: async (appId: string, vars: Record<string, string>): Promise<void> => {
      const envVars = Object.entries(vars).map(([key, value]) => ({ key, value }))
      await this.client.post('/api/v2/user/apps/appDefinitions/update', {
        appName: appId,
        envVars,
      })
    },
  }

  servers: ServerOperations = {
    list: async (): Promise<Server[]> => {
      const data = await this.client.get<Array<Record<string, unknown>>>(
        '/api/v2/user/system/nodes',
      )
      return data.map(toServer)
    },

    get: async (id: string): Promise<Server> => {
      const data = await this.client.get<Array<Record<string, unknown>>>(
        '/api/v2/user/system/nodes',
      )
      const node = data.find((n) => (n.nodeId ?? n.hostname) === id)
      if (!node) {
        throw new Error(`Server '${id}' not found`)
      }
      return toServer(node)
    },
  }
}
