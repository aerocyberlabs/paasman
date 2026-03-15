# Coolify

[Coolify](https://coolify.io) is an open-source, self-hostable platform for deploying applications, databases, and services.

## Installation

```bash
npm install -g @paasman/provider-coolify
```

## Configuration

Add a Coolify profile to `~/.paasman/config.yaml`:

```yaml
profiles:
  coolify:
    provider: coolify
    url: https://coolify.example.com
    token: ${COOLIFY_TOKEN}
default: coolify
```

### Getting Your API Token

1. Log in to your Coolify dashboard
2. Navigate to **Settings** > **API Tokens** (or **Keys & Tokens**)
3. Generate a new token
4. Store it in an environment variable:

```bash
export COOLIFY_TOKEN="your-token-here"
```

## Capabilities

The Coolify provider supports all Paasman operations:

| Capability | Supported |
|------------|:---------:|
| `apps.list` | Yes |
| `apps.get` | Yes |
| `apps.create` | Yes |
| `apps.delete` | Yes |
| `apps.deploy` | Yes |
| `apps.start` | Yes |
| `apps.stop` | Yes |
| `apps.restart` | Yes |
| `apps.logs` | Yes |
| `env.list` | Yes |
| `env.set` | Yes |
| `env.delete` | Yes |
| `env.pull` | Yes |
| `env.push` | Yes |
| `servers.list` | Yes |
| `servers.get` | Yes |
| `databases.list` | Yes |
| `databases.create` | Yes |
| `databases.delete` | Yes |
| `deployments.list` | Yes |
| `deployments.cancel` | Yes |

## App Source Types

Coolify supports creating applications from multiple source types:

```bash
# Git repository (public)
paasman apps create --name my-app --repo https://github.com/user/repo --branch main

# Docker image
paasman apps create --name my-app --image nginx:latest

# Dockerfile (via SDK)
```

## Environment Variable Behavior

- **`env set`** performs an additive merge using the Coolify bulk PATCH endpoint. Existing variables not included in the set call are preserved.
- **`env push`** performs a full replace -- all existing variables are deleted, then the new set is written.
- **`env delete`** resolves the Coolify-internal UUID for the environment variable and deletes it by UUID.

## SDK Usage

```typescript
import { Paasman } from '@paasman/core'
import { CoolifyProvider } from '@paasman/provider-coolify'

const pm = new Paasman({
  provider: new CoolifyProvider({
    baseUrl: 'https://coolify.example.com',
    token: process.env.COOLIFY_TOKEN!,
  })
})

// List all apps
const apps = await pm.apps.list()

// Deploy
await pm.apps.deploy('app-uuid')

// Manage env vars
const vars = await pm.env.pull('app-uuid')
await pm.env.set('app-uuid', { NODE_ENV: 'production' })
```

## API Mapping

The Coolify provider maps to the [Coolify API v1](https://coolify.io/docs/api):

| Paasman Operation | Coolify Endpoint |
|-------------------|-----------------|
| `apps.list` | `GET /api/v1/applications` |
| `apps.get` | `GET /api/v1/applications/:id` |
| `apps.deploy` | `POST /api/v1/applications/:id/start` |
| `apps.stop` | `POST /api/v1/applications/:id/stop` |
| `apps.restart` | `POST /api/v1/applications/:id/restart` |
| `env.list` | `GET /api/v1/applications/:id/envs` |
| `env.set` | `PATCH /api/v1/applications/:id/envs/bulk` |
| `servers.list` | `GET /api/v1/servers` |
| `databases.list` | `GET /api/v1/databases` |
| `deployments.list` | `GET /api/v1/deployments` |
