import type {
  PaasProvider, ProviderCapabilities, AppOperations, EnvOperations,
  DatabaseOperations, ProviderConfig, HealthStatus, App, CreateAppInput,
  DeployOpts, Deployment, LogOpts, LogLine, EnvVar, Database,
  CreateDatabaseInput,
} from '@paasman/core'
import { UnsupportedError, NotFoundError, ValidationError } from '@paasman/core'
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

function validateDokkuName(name: string, label: string): string {
  if (!/^[a-z0-9][a-z0-9-]*$/.test(name)) {
    throw new ValidationError(`Invalid ${label}: '${name}'. Only lowercase letters, digits, and hyphens allowed.`)
  }
  return name
}

function validateEnvKey(key: string): string {
  if (!/^[A-Za-z_][A-Za-z0-9_]*$/.test(key)) {
    throw new ValidationError(`Invalid env key: '${key}'. Only letters, digits, and underscores allowed.`)
  }
  return key
}

function validateDomain(domain: string): string {
  if (!/^[a-zA-Z0-9][a-zA-Z0-9.-]*\.[a-zA-Z]{2,}$/.test(domain)) {
    throw new ValidationError(`Invalid domain: '${domain}'.`)
  }
  return domain
}

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
      const name = validateDokkuName(input.name, 'app name')
      await this.sshClient.run(`apps:create ${name}`)

      if (input.env && Object.keys(input.env).length > 0) {
        await this.env.set(name, input.env)
      }

      if (input.domains && input.domains.length > 0) {
        for (const domain of input.domains) {
          await this.sshClient.run(`domains:add ${name} ${validateDomain(domain)}`)
        }
      }

      return this.apps.get(name)
    },

    delete: async (id: string): Promise<void> => {
      const name = validateDokkuName(id, 'app name')
      await this.sshClient.run(`apps:destroy ${name} --force`)
    },

    deploy: async (id: string, _opts?: DeployOpts): Promise<Deployment> => {
      const name = validateDokkuName(id, 'app name')
      await this.sshClient.run(`ps:rebuild ${name}`)
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
      await this.sshClient.run(`ps:start ${validateDokkuName(id, 'app name')}`)
    },

    stop: async (id: string): Promise<void> => {
      await this.sshClient.run(`ps:stop ${validateDokkuName(id, 'app name')}`)
    },

    restart: async (id: string): Promise<void> => {
      await this.sshClient.run(`ps:restart ${validateDokkuName(id, 'app name')}`)
    },

    logs: (id: string, opts?: LogOpts) => this.getLogs(id, opts),
  }

  env: EnvOperations = {
    list: async (appId: string): Promise<EnvVar[]> => {
      const name = validateDokkuName(appId, 'app name')
      const output = await this.sshClient.run(`config:show ${name}`)
      const parsed = parseConfigShow(output)
      return Object.entries(parsed).map(([key, value]) => toEnvVar(key, value))
    },

    set: async (appId: string, vars: Record<string, string>): Promise<void> => {
      const name = validateDokkuName(appId, 'app name')
      const pairs = Object.entries(vars)
        .map(([key, value]) => `${validateEnvKey(key)}=${escapeShellValue(value)}`)
        .join(' ')
      await this.sshClient.run(`config:set ${name} ${pairs}`)
    },

    delete: async (appId: string, key: string): Promise<void> => {
      await this.sshClient.run(`config:unset ${validateDokkuName(appId, 'app name')} ${validateEnvKey(key)}`)
    },

    pull: async (appId: string): Promise<Record<string, string>> => {
      const output = await this.sshClient.run(`config:export ${validateDokkuName(appId, 'app name')}`)
      return parseConfigExport(output)
    },

    push: async (appId: string, vars: Record<string, string>): Promise<void> => {
      const name = validateDokkuName(appId, 'app name')
      const current = await this.env.pull(name)
      const currentKeys = Object.keys(current)

      // Unset all existing keys without restarting
      if (currentKeys.length > 0) {
        const keysStr = currentKeys.map(k => validateEnvKey(k)).join(' ')
        await this.sshClient.run(`config:unset --no-restart ${name} ${keysStr}`)
      }

      // Set new vars (triggers single restart)
      if (Object.keys(vars).length > 0) {
        await this.env.set(name, vars)
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
      const name = validateDokkuName(id, 'database name')
      for (const engine of SUPPORTED_DB_ENGINES) {
        try {
          const output = await this.sshClient.run(`${engine}:info ${name}`)
          const info = parseDatabaseInfo(output)
          return toDatabase(name, engine, info)
        } catch {
          // Not this engine, try next
        }
      }
      throw new NotFoundError('database', id, 'dokku')
    },

    create: async (input: CreateDatabaseInput): Promise<Database> => {
      const name = validateDokkuName(input.name, 'database name')
      const engineCmd = mapEngineToCommand(input.engine)
      await this.sshClient.run(`${engineCmd}:create ${name}`)

      const infoOutput = await this.sshClient.run(`${engineCmd}:info ${name}`)
      const info = parseDatabaseInfo(infoOutput)
      return toDatabase(name, engineCmd, info)
    },

    delete: async (id: string): Promise<void> => {
      const name = validateDokkuName(id, 'database name')
      for (const engine of SUPPORTED_DB_ENGINES) {
        try {
          await this.sshClient.run(`${engine}:info ${name}`)
          await this.sshClient.run(`${engine}:destroy ${name} --force`)
          return
        } catch {
          // Not this engine, try next
        }
      }
      throw new NotFoundError('database', id, 'dokku')
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
  // Always wrap in single quotes and escape any single quotes within
  return `'${value.replace(/'/g, "'\\''")}'`
}
