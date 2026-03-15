import { z } from 'zod'

// ── Status Enums ──────────────────────────────────────────

export const AppStatusSchema = z.enum(['running', 'stopped', 'deploying', 'failed', 'unknown'])
export type AppStatus = z.infer<typeof AppStatusSchema>

export const DatabaseEngineSchema = z.enum(['postgresql', 'mysql', 'mariadb', 'mongodb', 'redis', 'other'])
export type DatabaseEngine = z.infer<typeof DatabaseEngineSchema>

export const DeploymentStatusSchema = z.enum(['queued', 'building', 'running', 'success', 'failed', 'cancelled'])
export type DeploymentStatus = z.infer<typeof DeploymentStatusSchema>

export const ServerStatusSchema = z.enum(['reachable', 'unreachable', 'unknown'])
export type ServerStatus = z.infer<typeof ServerStatusSchema>

// ── Core Resources ────────────────────────────────────────

export const AppSchema = z.object({
  id: z.string(),
  name: z.string(),
  status: AppStatusSchema,
  domains: z.array(z.string()),
  createdAt: z.coerce.date(),
  updatedAt: z.coerce.date(),
  meta: z.object({
    repository: z.string().optional(),
    branch: z.string().optional(),
    image: z.string().optional(),
    buildPack: z.string().optional(),
    serverIds: z.array(z.string()).optional(),
  }),
  raw: z.unknown(),
})
export type App = z.infer<typeof AppSchema>

export const ServerSchema = z.object({
  id: z.string(),
  name: z.string(),
  status: ServerStatusSchema,
  ip: z.string(),
  meta: z.object({
    os: z.string().optional(),
    cpu: z.number().optional(),
    memory: z.number().optional(),
    disk: z.number().optional(),
    provider: z.string().optional(),
  }),
  raw: z.unknown(),
})
export type Server = z.infer<typeof ServerSchema>

export const DatabaseSchema = z.object({
  id: z.string(),
  name: z.string(),
  engine: DatabaseEngineSchema,
  version: z.string().optional(),
  status: AppStatusSchema,
  meta: z.object({
    serverId: z.string().optional(),
    port: z.number().optional(),
    size: z.number().optional(),
  }),
  raw: z.unknown(),
})
export type Database = z.infer<typeof DatabaseSchema>

export const DeploymentSchema = z.object({
  id: z.string(),
  appId: z.string(),
  status: DeploymentStatusSchema,
  triggeredAt: z.coerce.date(),
  finishedAt: z.coerce.date().optional(),
  meta: z.object({
    commit: z.string().optional(),
    branch: z.string().optional(),
    duration: z.number().optional(),
    trigger: z.string().optional(),
  }),
  raw: z.unknown(),
})
export type Deployment = z.infer<typeof DeploymentSchema>

export const EnvVarSchema = z.object({
  key: z.string(),
  value: z.string(),
  isSecret: z.boolean(),
  scope: z.enum(['runtime', 'build', 'both']).optional(),
})
export type EnvVar = z.infer<typeof EnvVarSchema>

export const LogLineSchema = z.object({
  timestamp: z.coerce.date().optional(),
  message: z.string(),
  stream: z.enum(['stdout', 'stderr']).optional(),
})
export type LogLine = z.infer<typeof LogLineSchema>

export const HealthStatusSchema = z.object({
  ok: z.boolean(),
  provider: z.string(),
  version: z.string().optional(),
  latencyMs: z.number(),
  message: z.string().optional(),
})
export type HealthStatus = z.infer<typeof HealthStatusSchema>

// ── Inputs ────────────────────────────────────────────────

export const CreateAppInputSchema = z.object({
  name: z.string(),
  source: z.discriminatedUnion('type', [
    z.object({ type: z.literal('git'), repository: z.string(), branch: z.string().optional() }),
    z.object({ type: z.literal('image'), image: z.string() }),
    z.object({ type: z.literal('dockerfile'), content: z.string() }),
  ]),
  serverId: z.string().optional(),
  env: z.record(z.string()).optional(),
  domains: z.array(z.string()).optional(),
})
export type CreateAppInput = z.infer<typeof CreateAppInputSchema>

export const CreateDatabaseInputSchema = z.object({
  name: z.string(),
  engine: DatabaseEngineSchema,
  version: z.string().optional(),
  serverId: z.string().optional(),
})
export type CreateDatabaseInput = z.infer<typeof CreateDatabaseInputSchema>

export const DeployOptsSchema = z.object({
  branch: z.string().optional(),
  commit: z.string().optional(),
  force: z.boolean().optional(),
})
export type DeployOpts = z.infer<typeof DeployOptsSchema>

export const LogOptsSchema = z.object({
  lines: z.number().optional(),
  follow: z.boolean().optional(),
  since: z.coerce.date().optional(),
})
export type LogOpts = z.infer<typeof LogOptsSchema>

// ── Provider Config ───────────────────────────────────────

export const HttpProviderConfigSchema = z.object({
  type: z.literal('http'),
  baseUrl: z.string().url(),
  token: z.string().min(1),
})

export const SshProviderConfigSchema = z.object({
  type: z.literal('ssh'),
  host: z.string(),
  port: z.number().optional(),
  username: z.string().optional(),
  privateKey: z.string().optional(),
})

export const ProviderConfigSchema = z.discriminatedUnion('type', [
  HttpProviderConfigSchema,
  SshProviderConfigSchema,
])
export type ProviderConfig = z.infer<typeof ProviderConfigSchema>
