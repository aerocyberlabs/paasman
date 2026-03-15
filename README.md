# Paasman

A universal CLI and SDK for managing applications across self-hosted PaaS platforms.

One tool. Any platform. **Coolify, Dokploy, CapRover, Dokku** - and more.

## The Problem

Every self-hosted PaaS has its own CLI, API, and mental model. Switch platforms? Learn new tools. Manage multiple platforms? Context-switch between different CLIs constantly.

## The Solution

Paasman provides a pluggable provider architecture:

- **`@paasman/core`** - Universal interface contract and shared types
- **`@paasman/cli`** - Terminal-native CLI built on top of core
- **`@paasman/provider-*`** - Platform-specific adapters (install only what you need)

## Quick Start

```bash
# Install CLI + a provider
npm install -g @paasman/cli @paasman/provider-coolify

# Setup
paasman init

# Manage your apps
paasman apps list
paasman apps deploy <app-id>
paasman apps logs <app-id>

# Sync environment variables
paasman env pull <app-id>        # Download to .env
paasman env push <app-id>        # Upload from .env
paasman env diff <app-id>        # Diff local vs remote
```

## Multi-Platform Support

Manage multiple PaaS platforms from a single tool:

```yaml
# ~/.paasman/config.yaml
profiles:
  prod:
    provider: coolify
    url: https://coolify.example.com
    token: ${COOLIFY_TOKEN}
  staging:
    provider: dokploy
    url: https://dokploy.example.com
    token: ${DOKPLOY_TOKEN}
default: prod
```

```bash
paasman apps list                     # Default profile (prod)
paasman apps list --profile staging   # Specific profile
paasman apps list --all-profiles      # Everything, everywhere
paasman status                        # Dashboard across all platforms
```

## Available Providers

| Provider | Package | Status |
|----------|---------|--------|
| Coolify | `@paasman/provider-coolify` | In Development |
| Dokploy | `@paasman/provider-dokploy` | Planned |
| CapRover | `@paasman/provider-caprover` | Planned |
| Dokku | `@paasman/provider-dokku` | Planned |

## SDK Usage

Use Paasman programmatically in your scripts and CI/CD pipelines:

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

const envVars = await pm.env.pull('my-app')
console.log(envVars)
```

### Multi-Provider

```typescript
const pm = new Paasman({
  providers: {
    prod: new CoolifyProvider({ baseUrl: '...', token: '...' }),
    staging: new DokployProvider({ baseUrl: '...', token: '...' }),
  }
})

await pm.use('prod').apps.list()
await pm.use('staging').apps.deploy('my-app')
```

## Project Structure

```
paasman/
├── packages/
│   ├── core/              # @paasman/core
│   ├── cli/               # @paasman/cli
│   ├── provider-coolify/  # @paasman/provider-coolify
│   ├── provider-dokploy/  # @paasman/provider-dokploy
│   ├── provider-caprover/ # @paasman/provider-caprover
│   └── provider-dokku/    # @paasman/provider-dokku
├── examples/
└── docs/
```

## Tech Stack

- **TypeScript** - Strict mode, full type safety
- **Turborepo + pnpm** - Monorepo management
- **Zod** - Runtime validation
- **Commander.js** - CLI framework
- **Vitest** - Testing
- **Biome** - Linting & formatting
- **Native fetch** - Zero HTTP dependencies

## Building a Provider

Want to add support for a new PaaS platform? Providers implement the `PaasProvider` interface:

```typescript
import { PaasProvider } from '@paasman/core'

export class MyProvider implements PaasProvider {
  readonly name = 'my-platform'
  readonly version = '1.0.0'

  apps = {
    list: async () => { /* map your API to Paasman types */ },
    deploy: async (id) => { /* trigger deployment */ },
    // ...
  }
}
```

See the [Provider Authoring Guide](docs/provider-guide.md) for details.

## Contributing

Contributions are welcome! Whether it's:

- Adding a new provider
- Improving existing providers
- Enhancing the CLI
- Fixing bugs
- Improving documentation

See [CONTRIBUTING.md](CONTRIBUTING.md) for guidelines.

## License

MIT
