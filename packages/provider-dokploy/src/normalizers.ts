import type { App, AppStatus, Server, Deployment, EnvVar, DeploymentStatus, Database, DatabaseEngine } from '@paasman/core'

export function toApp(raw: Record<string, unknown>): App {
  const rawDomains = raw.domains as Array<Record<string, unknown>> | undefined
  const domains = rawDomains
    ? rawDomains.map((d) => d.host as string).filter(Boolean)
    : []

  const serverId = raw.serverId as string | undefined

  return {
    id: raw.applicationId as string,
    name: raw.name as string,
    status: mapAppStatus(raw.applicationStatus as string),
    domains,
    createdAt: new Date(raw.createdAt as string),
    updatedAt: new Date(raw.updatedAt as string),
    meta: {
      repository: raw.repository as string | undefined,
      branch: raw.branch as string | undefined,
      image: raw.dockerImage as string | undefined,
      buildPack: raw.buildType as string | undefined,
      serverIds: serverId ? [serverId] : undefined,
    },
    raw,
  }
}

function mapAppStatus(status: string): AppStatus {
  switch (status) {
    case 'running': return 'running'
    case 'idle':
    case 'done':
    case 'stopped': return 'stopped'
    case 'deploying':
    case 'restarting': return 'deploying'
    case 'error': return 'failed'
    default: return 'unknown'
  }
}

export function toServer(raw: Record<string, unknown>): Server {
  const serverStatus = raw.serverStatus as string | undefined

  return {
    id: raw.serverId as string,
    name: raw.name as string,
    status: serverStatus === 'active' ? 'reachable' : serverStatus === 'inactive' ? 'unreachable' : 'unknown',
    ip: raw.ipAddress as string,
    meta: {
      provider: raw.provider as string | undefined,
    },
    raw,
  }
}

export function toDeployment(raw: Record<string, unknown>): Deployment {
  return {
    id: raw.deploymentId as string,
    appId: raw.applicationId as string,
    status: mapDeploymentStatus(raw.status as string),
    triggeredAt: new Date(raw.createdAt as string),
    finishedAt: raw.endedAt ? new Date(raw.endedAt as string) : undefined,
    meta: {
      commit: raw.title as string | undefined,
    },
    raw,
  }
}

function mapDeploymentStatus(status: string): DeploymentStatus {
  switch (status) {
    case 'queued': return 'queued'
    case 'building': return 'building'
    case 'running': return 'running'
    case 'done': return 'success'
    case 'error': return 'failed'
    case 'cancelled': return 'cancelled'
    default: return 'queued'
  }
}

export function toEnvVar(line: string): EnvVar {
  const idx = line.indexOf('=')
  const key = idx >= 0 ? line.slice(0, idx) : line
  const value = idx >= 0 ? line.slice(idx + 1) : ''

  return {
    key,
    value,
    isSecret: false,
  }
}

export function toDatabase(raw: Record<string, unknown>): Database {
  const status = mapAppStatus(raw.applicationStatus as string)
  const rawType = raw.type as string | undefined
  const engine = mapDatabaseEngine(rawType)

  return {
    id: raw.databaseId as string,
    name: raw.name as string,
    engine,
    version: raw.version as string | undefined,
    status,
    meta: {
      serverId: raw.serverId as string | undefined,
    },
    raw,
  }
}

function mapDatabaseEngine(type: string | undefined): DatabaseEngine {
  if (!type) return 'other'
  const lower = type.toLowerCase()
  if (lower.includes('postgres')) return 'postgresql'
  if (lower.includes('mysql')) return 'mysql'
  if (lower.includes('maria')) return 'mariadb'
  if (lower.includes('mongo')) return 'mongodb'
  if (lower.includes('redis')) return 'redis'
  return 'other'
}
