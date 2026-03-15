export function providerTemplate(vars: { name: string }): string {
  const Name = vars.name.charAt(0).toUpperCase() + vars.name.slice(1)
  return `import type {
  PaasProvider, ProviderCapabilities, AppOperations, EnvOperations,
  ServerOperations, DatabaseOperations, DeploymentOperations,
  HealthStatus, App, CreateAppInput, DeployOpts,
  Deployment, LogOpts, LogLine, EnvVar, Server, Database,
  CreateDatabaseInput,
} from '@paasman/core'
import { ${Name}Client } from './client.js'

export interface ${Name}ProviderConfig {
  baseUrl: string
  token: string
}

export class ${Name}Provider implements PaasProvider {
  readonly name = '${vars.name}'
  readonly version = '0.1.0'
  readonly capabilities: ProviderCapabilities = {
    apps: { start: false, stop: false, restart: false, logs: false },
    servers: false,
    databases: false,
    deployments: { list: false, cancel: false },
  }

  private client: ${Name}Client

  constructor(config: ${Name}ProviderConfig) {
    this.client = new ${Name}Client(config.baseUrl, config.token)
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
      // TODO: Update this endpoint to match the ${vars.name} API health/version endpoint
      await this.client.get('/api/v1/health')
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

  // TODO: Implement PaasProvider interface
  // See https://github.com/aerocyberlabs/paasman for examples
  //
  // You need to implement the following operation groups:
  // - apps: AppOperations (list, get, create, delete, deploy, start, stop, restart, logs)
  // - env: EnvOperations (list, set, delete, pull, push)
  // - servers: ServerOperations (list, get)
  // - databases: DatabaseOperations (list, get, create, delete)
  // - deployments: DeploymentOperations (list, get, cancel)
  //
  // Enable capabilities as you implement each operation.

  apps: AppOperations = {
    list: async (): Promise<App[]> => {
      throw new Error('TODO: Implement apps.list')
    },
    get: async (_id: string): Promise<App> => {
      throw new Error('TODO: Implement apps.get')
    },
    create: async (_input: CreateAppInput): Promise<App> => {
      throw new Error('TODO: Implement apps.create')
    },
    delete: async (_id: string): Promise<void> => {
      throw new Error('TODO: Implement apps.delete')
    },
    deploy: async (_id: string, _opts?: DeployOpts): Promise<Deployment> => {
      throw new Error('TODO: Implement apps.deploy')
    },
    start: async (_id: string): Promise<void> => {
      throw new Error('TODO: Implement apps.start')
    },
    stop: async (_id: string): Promise<void> => {
      throw new Error('TODO: Implement apps.stop')
    },
    restart: async (_id: string): Promise<void> => {
      throw new Error('TODO: Implement apps.restart')
    },
    logs: async function* (_id: string, _opts?: LogOpts): AsyncGenerator<LogLine> {
      throw new Error('TODO: Implement apps.logs')
    },
  }

  env: EnvOperations = {
    list: async (_appId: string): Promise<EnvVar[]> => {
      throw new Error('TODO: Implement env.list')
    },
    set: async (_appId: string, _vars: Record<string, string>): Promise<void> => {
      throw new Error('TODO: Implement env.set')
    },
    delete: async (_appId: string, _key: string): Promise<void> => {
      throw new Error('TODO: Implement env.delete')
    },
    pull: async (_appId: string): Promise<Record<string, string>> => {
      throw new Error('TODO: Implement env.pull')
    },
    push: async (_appId: string, _vars: Record<string, string>): Promise<void> => {
      throw new Error('TODO: Implement env.push')
    },
  }

  servers: ServerOperations = {
    list: async (): Promise<Server[]> => {
      throw new Error('TODO: Implement servers.list')
    },
    get: async (_id: string): Promise<Server> => {
      throw new Error('TODO: Implement servers.get')
    },
  }

  databases: DatabaseOperations = {
    list: async (): Promise<Database[]> => {
      throw new Error('TODO: Implement databases.list')
    },
    get: async (_id: string): Promise<Database> => {
      throw new Error('TODO: Implement databases.get')
    },
    create: async (_input: CreateDatabaseInput): Promise<Database> => {
      throw new Error('TODO: Implement databases.create')
    },
    delete: async (_id: string): Promise<void> => {
      throw new Error('TODO: Implement databases.delete')
    },
  }

  deployments: DeploymentOperations = {
    list: async (_appId?: string): Promise<Deployment[]> => {
      throw new Error('TODO: Implement deployments.list')
    },
    get: async (_id: string): Promise<Deployment> => {
      throw new Error('TODO: Implement deployments.get')
    },
    cancel: async (_id: string): Promise<void> => {
      throw new Error('TODO: Implement deployments.cancel')
    },
  }
}
`
}
