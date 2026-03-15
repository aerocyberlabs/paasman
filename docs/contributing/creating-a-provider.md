# Creating a Provider

This guide walks through building a Paasman provider package from scratch. A provider is an npm package that adapts a PaaS platform's API to the universal Paasman interface.

## Scaffold the Package

Use the scaffolding tool to create the boilerplate:

```bash
npm create paasman-provider my-platform
```

Or create it manually:

```
packages/provider-my-platform/
  src/
    client.ts       # HTTP/SSH client for the platform API
    normalizers.ts  # Functions that map API responses to Paasman types
    provider.ts     # PaasProvider implementation
    index.ts        # Public exports
  package.json
  tsconfig.json
  tsup.config.ts
```

### package.json

```json
{
  "name": "@paasman/provider-my-platform",
  "version": "0.1.0",
  "type": "module",
  "main": "dist/index.js",
  "types": "dist/index.d.ts",
  "exports": {
    ".": {
      "import": "./dist/index.js",
      "types": "./dist/index.d.ts"
    }
  },
  "peerDependencies": {
    "@paasman/core": "^0.1.0"
  },
  "devDependencies": {
    "@paasman/core": "workspace:*",
    "tsup": "^8.0.0",
    "typescript": "^5.5.0",
    "vitest": "^4.1.0"
  }
}
```

## Implement the `PaasProvider` Interface

The core interface your provider must implement:

```typescript
import type {
  PaasProvider,
  ProviderCapabilities,
  AppOperations,
  EnvOperations,
  ServerOperations,
  DatabaseOperations,
  DeploymentOperations,
  ProviderConfig,
  HealthStatus,
} from '@paasman/core'

export interface MyPlatformConfig {
  baseUrl: string
  token: string
}

export class MyPlatformProvider implements PaasProvider {
  readonly name = 'my-platform'
  readonly version = '0.1.0'

  readonly capabilities: ProviderCapabilities = {
    apps: { start: true, stop: true, restart: true, logs: false },
    servers: false,
    databases: false,
    deployments: { list: true, cancel: false },
  }

  constructor(private config: MyPlatformConfig) {}

  async connect(): Promise<void> {
    await this.healthCheck()
  }

  async disconnect(): Promise<void> {
    // Clean up any persistent connections
  }

  async healthCheck(): Promise<HealthStatus> {
    const start = Date.now()
    try {
      // Make a lightweight API call to verify connectivity
      // e.g. fetch version endpoint
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
    list: async () => { /* ... */ },
    get: async (id) => { /* ... */ },
    create: async (input) => { /* ... */ },
    delete: async (id) => { /* ... */ },
    deploy: async (id, opts) => { /* ... */ },
    // Optional: start, stop, restart, logs
  }

  env: EnvOperations = {
    list: async (appId) => { /* ... */ },
    set: async (appId, vars) => { /* ... */ },
    delete: async (appId, key) => { /* ... */ },
    pull: async (appId) => { /* ... */ },
    push: async (appId, vars) => { /* ... */ },
  }

  // Optional: implement if your platform supports these
  // servers?: ServerOperations
  // databases?: DatabaseOperations
  // deployments?: DeploymentOperations
}
```

## Write Normalizers

Normalizers convert platform-specific API responses into universal Paasman types. This is where most of the adaptation logic lives.

```typescript
import type { App, Server, Deployment, EnvVar, Database } from '@paasman/core'

export function toApp(raw: Record<string, unknown>): App {
  return {
    id: String(raw.id ?? raw.uuid ?? ''),
    name: String(raw.name ?? ''),
    status: mapStatus(raw.status),
    domains: parseDomains(raw),
    createdAt: new Date(raw.created_at as string),
    updatedAt: new Date(raw.updated_at as string),
    meta: {
      repository: raw.repository as string | undefined,
      branch: raw.branch as string | undefined,
      image: raw.image as string | undefined,
    },
    raw, // preserve the original data
  }
}

function mapStatus(status: unknown): App['status'] {
  // Map your platform's status values to Paasman's enum:
  // 'running' | 'stopped' | 'deploying' | 'failed' | 'unknown'
  switch (String(status)) {
    case 'active': return 'running'
    case 'inactive': return 'stopped'
    default: return 'unknown'
  }
}
```

### Key types to normalize

| Paasman Type | Fields | Notes |
|-------------|--------|-------|
| `App` | id, name, status, domains, createdAt, updatedAt, meta, raw | Status must be one of: `running`, `stopped`, `deploying`, `failed`, `unknown` |
| `Server` | id, name, status, ip, meta, raw | Status: `reachable`, `unreachable`, `unknown` |
| `Database` | id, name, engine, version, status, meta, raw | Engine: `postgresql`, `mysql`, `mariadb`, `mongodb`, `redis`, `other` |
| `Deployment` | id, appId, status, triggeredAt, finishedAt, meta, raw | Status: `queued`, `building`, `running`, `success`, `failed`, `cancelled` |
| `EnvVar` | key, value, isSecret, scope | Scope: `runtime`, `build`, `both` |

## Build an API Client

Create a thin HTTP client for your platform's API:

```typescript
export class MyPlatformClient {
  constructor(
    private baseUrl: string,
    private token: string,
  ) {}

  async get<T>(path: string): Promise<T> {
    const res = await fetch(`${this.baseUrl}${path}`, {
      headers: {
        Authorization: `Bearer ${this.token}`,
        Accept: 'application/json',
      },
    })
    if (!res.ok) {
      throw new Error(`API error: ${res.status} ${res.statusText}`)
    }
    return res.json() as Promise<T>
  }

  async post<T>(path: string, body?: unknown): Promise<T> {
    const res = await fetch(`${this.baseUrl}${path}`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${this.token}`,
        'Content-Type': 'application/json',
        Accept: 'application/json',
      },
      body: body ? JSON.stringify(body) : undefined,
    })
    if (!res.ok) {
      throw new Error(`API error: ${res.status} ${res.statusText}`)
    }
    return res.json() as Promise<T>
  }

  async del(path: string): Promise<void> {
    const res = await fetch(`${this.baseUrl}${path}`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${this.token}` },
    })
    if (!res.ok) {
      throw new Error(`API error: ${res.status} ${res.statusText}`)
    }
  }
}
```

Paasman uses native `fetch` -- no HTTP client libraries required.

## Export Your Provider

```typescript
// src/index.ts
export { MyPlatformProvider } from './provider.js'
export type { MyPlatformConfig } from './provider.js'
```

## Write Tests

Test your normalizers and provider logic using Vitest:

```typescript
import { describe, it, expect } from 'vitest'
import { toApp } from './normalizers.js'

describe('toApp', () => {
  it('normalizes a platform-specific app object', () => {
    const raw = {
      id: '123',
      name: 'my-app',
      status: 'active',
      domains: 'app.example.com',
      created_at: '2025-01-01T00:00:00Z',
      updated_at: '2025-01-02T00:00:00Z',
    }

    const app = toApp(raw)

    expect(app.id).toBe('123')
    expect(app.name).toBe('my-app')
    expect(app.status).toBe('running')
    expect(app.raw).toBe(raw)
  })
})
```

Test your provider against the compliance suite (if available) to verify it conforms to the `PaasProvider` contract.

## Capabilities Declaration

Be honest about what your platform supports. Set capabilities to `false` for operations you have not implemented:

```typescript
readonly capabilities: ProviderCapabilities = {
  apps: { start: true, stop: true, restart: false, logs: false },
  servers: false,
  databases: false,
  deployments: { list: true, cancel: false },
}
```

The CLI checks capabilities before invoking optional operations and gives the user a clear error message when something is unsupported.

## Publishing

1. Build the package: `pnpm build`
2. Test thoroughly: `pnpm test`
3. Publish to npm: `npm publish --access public`

The package name should follow the convention `@paasman/provider-<platform-name>` so the CLI can discover it via dynamic import.

## Reference Implementations

Study the existing providers for patterns and best practices:

- `packages/provider-coolify/` -- HTTP API with REST endpoints, full capability coverage
- `packages/provider-dokploy/` -- tRPC-style API, project-scoped resources
