# Providers

Paasman uses a pluggable provider architecture. Each PaaS platform is supported through a separate npm package that implements the `PaasProvider` interface from `@paasman/core`.

## How Providers Work

When you run a CLI command, Paasman:

1. Reads your `~/.paasman/config.yaml` to determine the active profile
2. Dynamically imports the provider package (`@paasman/provider-<name>`)
3. Creates an instance of the provider with your URL and token
4. Delegates the operation (e.g. list apps, deploy) to the provider
5. The provider translates between the Paasman universal types and the platform-specific API

This means the CLI itself has zero knowledge of any specific PaaS platform. All platform logic lives in provider packages.

## Available Providers

| Provider | Package | Apps | Servers | Databases | Deployments | Logs |
|----------|---------|:----:|:-------:|:---------:|:-----------:|:----:|
| [Coolify](/providers/coolify) | `@paasman/provider-coolify` | Yes | Yes | Yes | Yes | Yes |
| [Dokploy](/providers/dokploy) | `@paasman/provider-dokploy` | Yes | Yes | Yes | Yes | Yes |
| [CapRover](/providers/caprover) | `@paasman/provider-caprover` | Planned | -- | -- | -- | -- |
| [Dokku](/providers/dokku) | `@paasman/provider-dokku` | Planned | -- | -- | -- | -- |

## Installing a Provider

Providers are installed as global npm packages alongside the CLI:

```bash
# Install one or more providers
npm install -g @paasman/provider-coolify
npm install -g @paasman/provider-dokploy
```

The CLI discovers providers at runtime via dynamic `import()`. No additional configuration is needed beyond specifying the provider name in your profile.

## Capabilities

Each provider declares a `capabilities` object that describes what operations it supports:

```typescript
interface ProviderCapabilities {
  apps: { start: boolean; stop: boolean; restart: boolean; logs: boolean }
  servers: boolean
  databases: boolean
  deployments: { list: boolean; cancel: boolean }
}
```

When you run a command that the active provider does not support, the CLI throws an `UnsupportedError` with a clear message indicating which operation is not available for that provider.

You can check capabilities programmatically via the SDK:

```typescript
import { Paasman } from '@paasman/core'
import { CoolifyProvider } from '@paasman/provider-coolify'

const pm = new Paasman({
  provider: new CoolifyProvider({ baseUrl: '...', token: '...' })
})

console.log(pm.capabilities)
// { apps: { start: true, stop: true, restart: true, logs: true },
//   servers: true, databases: true,
//   deployments: { list: true, cancel: true } }
```

## Universal Types

All providers normalize their platform-specific data into shared Paasman types. This means an `App` object looks the same whether it comes from Coolify or Dokploy:

```typescript
interface App {
  id: string
  name: string
  status: 'running' | 'stopped' | 'deploying' | 'failed' | 'unknown'
  domains: string[]
  createdAt: Date
  updatedAt: Date
  meta: {
    repository?: string
    branch?: string
    image?: string
    buildPack?: string
    serverIds?: string[]
  }
  raw: unknown  // original platform-specific data
}
```

The `raw` field preserves the original API response for cases where you need platform-specific details.

## Creating Your Own Provider

See [Creating a Provider](/contributing/creating-a-provider) for a step-by-step guide.
