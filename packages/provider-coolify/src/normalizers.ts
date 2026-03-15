import type { App, AppStatus, Server, Deployment, EnvVar, DeploymentStatus, Database, DatabaseEngine } from '@paasman/core'

export function toApp(raw: Record<string, unknown>): App {
  const fqdn = raw.fqdn as string | null
  const domains = fqdn ? fqdn.split(',').map((d) => d.trim()).filter(Boolean) : []

  const dest = raw.destination as Record<string, unknown> | undefined
  const server = dest?.server as Record<string, unknown> | undefined

  return {
    id: raw.uuid as string,
    name: raw.name as string,
    status: mapAppStatus(raw.status as string),
    domains,
    createdAt: new Date(raw.created_at as string),
    updatedAt: new Date(raw.updated_at as string),
    meta: {
      repository: raw.git_repository as string | undefined,
      branch: raw.git_branch as string | undefined,
      image: raw.docker_registry_image_name as string | undefined,
      buildPack: raw.build_pack as string | undefined,
      serverIds: server?.uuid ? [server.uuid as string] : undefined,
    },
    raw,
  }
}

function mapAppStatus(status: string): AppStatus {
  switch (status) {
    case 'running': return 'running'
    case 'stopped':
    case 'exited': return 'stopped'
    case 'starting':
    case 'restarting': return 'deploying'
    case 'error':
    case 'degraded': return 'failed'
    default: return 'unknown'
  }
}

export function toServer(raw: Record<string, unknown>): Server {
  const settings = raw.settings as Record<string, unknown> | undefined
  const isReachable = settings?.is_reachable as boolean | undefined

  return {
    id: raw.uuid as string,
    name: raw.name as string,
    status: isReachable === true ? 'reachable' : isReachable === false ? 'unreachable' : 'unknown',
    ip: raw.ip as string,
    meta: {
      provider: raw.provider as string | undefined,
    },
    raw,
  }
}

// Task 24 fix: use explicit checks instead of ?? to handle type casting precedence
export function toDeployment(raw: Record<string, unknown>): Deployment {
  const id = (raw.uuid !== undefined && raw.uuid !== null)
    ? String(raw.uuid)
    : String(raw.id ?? '')
  const appId = (raw.application_uuid !== undefined && raw.application_uuid !== null)
    ? String(raw.application_uuid)
    : String(raw.application_id ?? '')

  return {
    id,
    appId,
    status: mapDeploymentStatus(raw.status as string),
    triggeredAt: new Date(raw.created_at as string),
    finishedAt: raw.finished_at ? new Date(raw.finished_at as string) : undefined,
    meta: {
      commit: raw.commit as string | undefined,
      branch: raw.branch as string | undefined,
      trigger: raw.trigger as string | undefined,
    },
    raw,
  }
}

function mapDeploymentStatus(status: string): DeploymentStatus {
  switch (status) {
    case 'queued':
    case 'in_progress': return 'queued'
    case 'building': return 'building'
    case 'running': return 'running'
    case 'finished':
    case 'success': return 'success'
    case 'failed':
    case 'error': return 'failed'
    case 'cancelled': return 'cancelled'
    default: return 'queued'
  }
}

export function toEnvVar(raw: Record<string, unknown>): EnvVar {
  const isBuildTime = raw.is_build_time as boolean | undefined
  const isPreview = raw.is_preview as boolean | undefined

  let scope: 'runtime' | 'build' | 'both' | undefined
  if (isBuildTime === true) {
    scope = 'build'
  } else if (isBuildTime === false) {
    scope = 'runtime'
  }

  return {
    key: raw.key as string,
    value: raw.value as string,
    isSecret: (raw.is_hidden as boolean) ?? false,
    scope,
  }
}

// Task 25: toDatabase normalizer function
export function toDatabase(raw: Record<string, unknown>): Database {
  const status = (raw.status as string) === 'running' ? 'running' as const : 'stopped' as const
  const rawType = raw.type as string | undefined
  const engine = mapDatabaseEngine(rawType)

  return {
    id: raw.uuid as string,
    name: raw.name as string,
    engine,
    version: raw.version as string | undefined,
    status,
    meta: {
      serverId: raw.server_uuid as string | undefined,
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
