# Paasman

[![CI](https://github.com/aerocyberlabs/paasman/actions/workflows/ci.yml/badge.svg)](https://github.com/aerocyberlabs/paasman/actions/workflows/ci.yml)
[![npm](https://img.shields.io/npm/v/@paasman/core)](https://www.npmjs.com/package/@paasman/core)
[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)

A universal CLI and SDK for managing applications across self-hosted PaaS platforms.

One tool. Any platform. **Coolify, Dokploy, CapRover, Dokku** — and more.

[Documentation](https://aerocyberlabs.github.io/paasman/) | [npm](https://www.npmjs.com/org/paasman) | [GitHub](https://github.com/aerocyberlabs/paasman)

## The Problem

Every self-hosted PaaS has its own CLI, API, and mental model. Switch platforms? Learn new tools. Manage multiple platforms? Context-switch between different CLIs constantly.

## The Solution

Paasman provides a pluggable provider architecture:

- **`@paasman/core`** — Universal interface contract and shared types
- **`@paasman/cli`** — Terminal-native CLI built on top of core
- **`@paasman/provider-*`** — Platform-specific adapters (install only what you need)

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

# Declarative deployments
paasman sync                     # Dry-run from paasman.yaml
paasman sync --apply             # Apply changes

# Cross-provider migration
paasman migrate <app-id> --from prod --to staging --include-env --apply
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

## Packages

| Package | Version | Description |
|---------|---------|-------------|
| [`@paasman/core`](https://www.npmjs.com/package/@paasman/core) | [![npm](https://img.shields.io/npm/v/@paasman/core)](https://www.npmjs.com/package/@paasman/core) | Types, interfaces, errors |
| [`@paasman/cli`](https://www.npmjs.com/package/@paasman/cli) | [![npm](https://img.shields.io/npm/v/@paasman/cli)](https://www.npmjs.com/package/@paasman/cli) | Command-line interface |
| [`@paasman/provider-coolify`](https://www.npmjs.com/package/@paasman/provider-coolify) | [![npm](https://img.shields.io/npm/v/@paasman/provider-coolify)](https://www.npmjs.com/package/@paasman/provider-coolify) | Coolify provider |
| [`@paasman/provider-dokploy`](https://www.npmjs.com/package/@paasman/provider-dokploy) | [![npm](https://img.shields.io/npm/v/@paasman/provider-dokploy)](https://www.npmjs.com/package/@paasman/provider-dokploy) | Dokploy provider |
| [`@paasman/provider-caprover`](https://www.npmjs.com/package/@paasman/provider-caprover) | [![npm](https://img.shields.io/npm/v/@paasman/provider-caprover)](https://www.npmjs.com/package/@paasman/provider-caprover) | CapRover provider |
| [`@paasman/provider-dokku`](https://www.npmjs.com/package/@paasman/provider-dokku) | [![npm](https://img.shields.io/npm/v/@paasman/provider-dokku)](https://www.npmjs.com/package/@paasman/provider-dokku) | Dokku provider (SSH) |
| [`@paasman/webhooks`](https://www.npmjs.com/package/@paasman/webhooks) | [![npm](https://img.shields.io/npm/v/@paasman/webhooks)](https://www.npmjs.com/package/@paasman/webhooks) | Slack/Discord notifications |
| [`@paasman/action`](https://www.npmjs.com/package/@paasman/action) | [![npm](https://img.shields.io/npm/v/@paasman/action)](https://www.npmjs.com/package/@paasman/action) | GitHub Action for CI/CD |
| [`@paasman/create-provider`](https://www.npmjs.com/package/@paasman/create-provider) | [![npm](https://img.shields.io/npm/v/@paasman/create-provider)](https://www.npmjs.com/package/@paasman/create-provider) | Provider scaffolding tool |

## CLI Commands

| Command | Description |
|---------|-------------|
| `paasman init` | Interactive configuration setup |
| `paasman apps list/get/create/delete` | Application CRUD |
| `paasman apps deploy/stop/restart/logs` | Application lifecycle |
| `paasman env list/set/delete/pull/push/diff` | Environment variable management |
| `paasman servers list/get` | Server management |
| `paasman deploys list/cancel` | Deployment management |
| `paasman db list/create/delete` | Database management |
| `paasman profile list/add/switch` | Profile management |
| `paasman status` | Multi-platform dashboard |
| `paasman sync` | Declarative desired-state deployment |
| `paasman migrate` | Cross-provider app migration |

## SDK Usage

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
await pm.env.pull('my-app')
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

## GitHub Action

```yaml
- uses: aerocyberlabs/paasman@v1
  with:
    provider: coolify
    server-url: https://coolify.example.com
    token: ${{ secrets.COOLIFY_TOKEN }}
    app-id: my-app-uuid
    command: deploy
```

## Building a Provider

```bash
npm create @paasman/provider
```

Or implement the `PaasProvider` interface manually. See the [Provider Authoring Guide](https://aerocyberlabs.github.io/paasman/contributing/creating-a-provider).

## Contributing

Contributions are welcome! Whether it's adding a new provider, improving existing ones, enhancing the CLI, fixing bugs, or improving documentation.

See [CONTRIBUTING.md](CONTRIBUTING.md) for guidelines.

## Changelog

See [CHANGELOG.md](CHANGELOG.md) for release history, or check individual package changelogs in `packages/*/CHANGELOG.md`.

## License

MIT
