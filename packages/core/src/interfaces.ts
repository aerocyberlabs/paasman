import type { App, CreateAppInput, CreateDatabaseInput, Database, Deployment, DeployOpts, EnvVar, HealthStatus, LogLine, LogOpts, ProviderConfig, Server } from './types.js'

export interface ProviderCapabilities {
  apps: { start: boolean; stop: boolean; restart: boolean; logs: boolean }
  servers: boolean
  databases: boolean
  deployments: { list: boolean; cancel: boolean }
}

export interface AppOperations {
  list(): Promise<App[]>
  get(id: string): Promise<App>
  create(input: CreateAppInput): Promise<App>
  delete(id: string): Promise<void>
  deploy(id: string, opts?: DeployOpts): Promise<Deployment>
  start?(id: string): Promise<void>
  stop?(id: string): Promise<void>
  restart?(id: string): Promise<void>
  logs?(id: string, opts?: LogOpts): AsyncIterable<LogLine>
}

export interface EnvOperations {
  list(appId: string): Promise<EnvVar[]>
  set(appId: string, vars: Record<string, string>): Promise<void>
  delete(appId: string, key: string): Promise<void>
  pull(appId: string): Promise<Record<string, string>>
  push(appId: string, vars: Record<string, string>): Promise<void>
}

export interface ServerOperations {
  list(): Promise<Server[]>
  get(id: string): Promise<Server>
}

export interface DatabaseOperations {
  list(): Promise<Database[]>
  get(id: string): Promise<Database>
  create(input: CreateDatabaseInput): Promise<Database>
  delete(id: string): Promise<void>
}

export interface DeploymentOperations {
  list(appId?: string): Promise<Deployment[]>
  get(id: string): Promise<Deployment>
  cancel?(id: string): Promise<void>
}

export interface PaasProvider {
  readonly name: string
  readonly version: string
  readonly capabilities: ProviderCapabilities

  connect(config: ProviderConfig): Promise<void>
  disconnect(): Promise<void>
  healthCheck(): Promise<HealthStatus>

  apps: AppOperations
  env: EnvOperations

  servers?: ServerOperations
  databases?: DatabaseOperations
  deployments?: DeploymentOperations
}

export function validateCapabilities(caps: ProviderCapabilities): boolean {
  return (
    typeof caps.apps.start === 'boolean' &&
    typeof caps.apps.stop === 'boolean' &&
    typeof caps.apps.restart === 'boolean' &&
    typeof caps.apps.logs === 'boolean' &&
    typeof caps.servers === 'boolean' &&
    typeof caps.databases === 'boolean' &&
    typeof caps.deployments.list === 'boolean' &&
    typeof caps.deployments.cancel === 'boolean'
  )
}
