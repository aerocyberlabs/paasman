# @paasman/core

Universal interface for self-hosted PaaS platforms. This is the core package that defines types, interfaces, and errors used by all Paasman providers.

## Install

```bash
npm install @paasman/core
```

## Usage

```typescript
import { Paasman } from '@paasman/core'
import { CoolifyProvider } from '@paasman/provider-coolify'

const pm = new Paasman({
  provider: new CoolifyProvider({
    baseUrl: 'https://coolify.example.com',
    token: process.env.COOLIFY_TOKEN,
  })
})

const apps = await pm.apps.list()
await pm.apps.deploy('my-app')
```

## What's included

- **Types**: `App`, `Server`, `Database`, `Deployment`, `EnvVar`, `LogLine` with Zod schemas
- **Interfaces**: `PaasProvider`, `AppOperations`, `EnvOperations`, `ServerOperations`, `DatabaseOperations`, `DeploymentOperations`
- **Errors**: `PaasmanError`, `AuthError`, `ConnectionError`, `NotFoundError`, `UnsupportedError`, and more
- **Paasman class**: Wrapper supporting single and multi-provider configurations

## Building a Provider

Implement the `PaasProvider` interface:

```typescript
import type { PaasProvider } from '@paasman/core'

class MyProvider implements PaasProvider {
  readonly name = 'my-platform'
  readonly version = '1.0.0'
  readonly capabilities = { /* ... */ }
  // implement apps, env, etc.
}
```

## License

MIT
