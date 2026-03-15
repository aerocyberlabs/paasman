import type {
  PaasProvider, ProviderCapabilities, AppOperations, EnvOperations,
  DatabaseOperations, ProviderConfig, HealthStatus, App, CreateAppInput,
  DeployOpts, Deployment, LogOpts, LogLine, EnvVar, Database,
  CreateDatabaseInput,
} from '@paasman/core'
import { UnsupportedError } from '@paasman/core'
import { DokkuSshClient } from './ssh-client.js'
import type { DokkuSshConfig } from './ssh-client.js'
import {
  parseAppsList, parseAppReport, parseConfigShow, parseConfigExport,
  parseDatabaseList, parseDatabaseInfo, parseLogLines,
} from './parsers.js'
import { toApp, toEnvVar, toDatabase, toLogLine } from './normalizers.js'

export interface DokkuProviderConfig {
  host: string
  port?: number
  username?: string
  privateKeyPath?: string
  privateKey?: string
}

const SUPPORTED_DB_ENGINES = ['postgres', 'mysql', 'redis', 'mongo', 'mariadb'] as const

export class DokkuProvider implements PaasProvider {
  readonly name = 'dokku'
  readonly version = '0.1.0'
  readonly capabilities: ProviderCapabilities = {
    apps: { start: true, stop: true, restart: true, logs: true },
    servers: false,
    databases: true,
    deployments: { list: false, cancel: false },
  }

  private sshClient: DokkuSshClient

  constructor(config: DokkuProviderConfig) {
    this.sshClient = new DokkuSshClient({
      host: config.host,
      port: config.port,
      username: config.username,
      privateKeyPath: config.privateKeyPath,
      privateKey: config.privateKey,
    })
  }

  async connect(): Promise<void> {
    await this.sshClient.connect()
  }

  async disconnect(): Promise<void> {
    await this.sshClient.disconnect()
  }

  async healthCheck(): Promise<HealthStatus> {
    const start = Date.now()
    try {
      const output = await this.sshClient.run('version')
      const version = output.trim()
      return {
        ok: true,
        provider: this.name,
        version,
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
    const n = opts?.lines ?? 100
    const output = await this.sshClient.run(`logs ${id} -n ${n}`)
    const parsed = parseLogLines(output)
    for (const line of parsed) {
      yield toLogLine(line)
    }
  }

  apps: AppOperations = {
    list: async (): Promise<App[]> => {
      const output = await this.sshClient.run('apps:list')
      const names = parseAppsList(output)
      const apps: App[] = []
      for (const name of names) {
        const reportOutput = await this.sshClient.run(`apps:report ${name}`)
        const report = parseAppReport(reportOutput)
        apps.push(toApp(name, report))
      }
      return apps
    },

    get: async (id: string): Promise<App> => {
      const output = await this.sshClient.run(`apps:report ${id}`)
      const report = parseAppReport(output)
      return toApp(id, report)
    },

    create: async (input: CreateAppInput): Promise<App> => {
      await this.sshClient.run(`apps:create ${input.name}`)

      if (input.env && Object.keys(input.env).length > 0) {
        await this.env.set(input.name, input.env)
      }

      if (input.domains && input.domains.length > 0) {
        for (const domain of input.domains) {
          await this.sshClient.run(`domains:add ${input.name} ${domain}`)
        }
      }

      return this.apps.get(input.name)
    },

    delete: async (id: string): Promise<void> => {
      await this.sshClient.run(`apps:destroy ${id} --force`)
    },

    deploy: async (id: string, _opts?: DeployOpts): Promise<Deployment> => {
      await this.sshClient.run(`ps:rebuild ${id}`)
      return {
        id: `${id}-rebuild-${Date.now()}`,
        appId: id,
        status: 'running',
        triggeredAt: new Date(),
        meta: {
          trigger: 'rebuild',
        },
        raw: {},
      }
    },

    start: async (id: string): Promise<void> => {
      await this.sshClient.run(`ps:start ${id}`)
    },

    stop: async (id: string): Promise<void> => {
      await this.sshClient.run(`ps:stop ${id}`)
    },

    restart: async (id: string): Promise<void> => {
      await this.sshClient.run(`ps:restart ${id}`)
    },

    logs: (id: string, opts?: LogOpts) => this.getLogs(id, opts),
  }

  env: EnvOperations = {
    list: async (appId: string): Promise<EnvVar[]> => {
      const output = await this.sshClient.run(`config:show ${appId}`)
      const parsed = parseConfigShow(output)
      return Object.entries(parsed).map(([key, value]) => toEnvVar(key, value))
    },

    set: async (appId: string, vars: Record<string, string>): Promise<void> => {
      const pairs = Object.entries(vars)
        .map(([key, value]) => `${key}=${escapeShellValue(value)}`)
        .join(' ')
      await this.sshClient.run(`config:set ${appId} ${pairs}`)
    },

    delete: async (appId: string, key: string): Promise<void> => {
      await this.sshClient.run(`config:unset ${appId} ${key}`)
    },

    pull: async (appId: string): Promise<Record<string, string>> => {
      const output = await this.sshClient.run(`config:export ${appId}`)
      return parseConfigExport(output)
    },

    push: async (appId: string, vars: Record<string, string>): Promise<void> => {
      // Full replace: get current config, unset all keys, then set new ones
      const current = await this.env.pull(appId)
      const currentKeys = Object.keys(current)

      // Unset all existing keys
      for (const key of currentKeys) {
        await this.sshClient.run(`config:unset ${appId} ${key}`)
      }

      // Set new vars (if any)
      if (Object.keys(vars).length > 0) {
        await this.env.set(appId, vars)
      }
    },
  }

  databases: DatabaseOperations = {
    list: async (): Promise<Database[]> => {
      const databases: Database[] = []

      for (const engine of SUPPORTED_DB_ENGINES) {
        try {
          const output = await this.sshClient.run(`${engine}:list`)
          const names = parseDatabaseList(output)
          for (const name of names) {
            try {
              const infoOutput = await this.sshClient.run(`${engine}:info ${name}`)
              const info = parseDatabaseInfo(infoOutput)
              databases.push(toDatabase(name, engine, info))
            } catch {
              // If info fails, still include the database with minimal info
              databases.push(toDatabase(name, engine, {}))
            }
          }
        } catch {
          // Plugin not installed, skip this engine
        }
      }

      return databases
    },

    get: async (id: string): Promise<Database> => {
      // Try each engine to find the database
      for (const engine of SUPPORTED_DB_ENGINES) {
        try {
          const output = await this.sshClient.run(`${engine}:info ${id}`)
          const info = parseDatabaseInfo(output)
          return toDatabase(id, engine, info)
        } catch {
          // Not this engine, try next
        }
      }
      throw new Error(`Database '${id}' not found`)
    },

    create: async (input: CreateDatabaseInput): Promise<Database> => {
      const engineCmd = mapEngineToCommand(input.engine)
      await this.sshClient.run(`${engineCmd}:create ${input.name}`)

      const infoOutput = await this.sshClient.run(`${engineCmd}:info ${input.name}`)
      const info = parseDatabaseInfo(infoOutput)
      return toDatabase(input.name, engineCmd, info)
    },

    delete: async (id: string): Promise<void> => {
      // Try each engine to find and delete the database
      for (const engine of SUPPORTED_DB_ENGINES) {
        try {
          await this.sshClient.run(`${engine}:info ${id}`)
          await this.sshClient.run(`${engine}:destroy ${id} --force`)
          return
        } catch {
          // Not this engine, try next
        }
      }
      throw new Error(`Database '${id}' not found`)
    },
  }

  // Dokku does not have deployment tracking
  deployments = undefined
  // Dokku is single-server, no multi-server concept
  servers = undefined
}

function mapEngineToCommand(engine: string): string {
  switch (engine) {
    case 'postgresql': return 'postgres'
    case 'mysql': return 'mysql'
    case 'mariadb': return 'mariadb'
    case 'mongodb': return 'mongo'
    case 'redis': return 'redis'
    default: return engine
  }
}

function escapeShellValue(value: string): string {
  // Wrap in single quotes and escape any single quotes within
  if (value.includes("'")) {
    return `'${value.replace(/'/g, "'\\''")}'`
  }
  if (value.includes(' ') || value.includes('"') || value.includes('$') || value.includes('\\')) {
    return `'${value}'`
  }
  return value
}
