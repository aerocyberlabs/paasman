export function normalizersTemplate(vars: { name: string }): string {
  return `import type { App, AppStatus, Server, Deployment, EnvVar, DeploymentStatus } from '@paasman/core'

// TODO: Adapt these normalizers to match the ${vars.name} API response format.
// The functions below are skeleton implementations that assume a generic REST API shape.
// You will need to update field mappings based on the actual API responses.

export function toApp(raw: Record<string, unknown>): App {
  return {
    id: String(raw.id ?? ''),
    name: String(raw.name ?? ''),
    status: mapAppStatus(String(raw.status ?? '')),
    domains: [],
    createdAt: new Date(raw.created_at as string),
    updatedAt: new Date(raw.updated_at as string),
    meta: {},
    raw,
  }
}

function mapAppStatus(status: string): AppStatus {
  // TODO: Map ${vars.name}-specific status values
  switch (status) {
    case 'running': return 'running'
    case 'stopped': return 'stopped'
    case 'deploying': return 'deploying'
    case 'failed': return 'failed'
    default: return 'unknown'
  }
}

export function toServer(raw: Record<string, unknown>): Server {
  return {
    id: String(raw.id ?? ''),
    name: String(raw.name ?? ''),
    status: 'unknown',
    ip: String(raw.ip ?? ''),
    meta: {},
    raw,
  }
}

export function toDeployment(raw: Record<string, unknown>): Deployment {
  return {
    id: String(raw.id ?? ''),
    appId: String(raw.app_id ?? ''),
    status: mapDeploymentStatus(String(raw.status ?? '')),
    triggeredAt: new Date(raw.created_at as string),
    finishedAt: raw.finished_at ? new Date(raw.finished_at as string) : undefined,
    meta: {},
    raw,
  }
}

function mapDeploymentStatus(status: string): DeploymentStatus {
  // TODO: Map ${vars.name}-specific deployment status values
  switch (status) {
    case 'queued': return 'queued'
    case 'building': return 'building'
    case 'running': return 'running'
    case 'success': return 'success'
    case 'failed': return 'failed'
    case 'cancelled': return 'cancelled'
    default: return 'queued'
  }
}

export function toEnvVar(raw: Record<string, unknown>): EnvVar {
  return {
    key: String(raw.key ?? ''),
    value: String(raw.value ?? ''),
    isSecret: (raw.is_secret as boolean) ?? false,
  }
}
`
}
