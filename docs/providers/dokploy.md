# Dokploy

[Dokploy](https://dokploy.com) is an open-source deployment platform that simplifies application management with a clean UI and tRPC-based API.

## Installation

```bash
npm install -g @paasman/provider-dokploy
```

## Configuration

Add a Dokploy profile to `~/.paasman/config.yaml`:

```yaml
profiles:
  dokploy:
    provider: dokploy
    url: https://dokploy.example.com
    token: ${DOKPLOY_TOKEN}
default: dokploy
```

### Getting Your API Key

1. Log in to your Dokploy dashboard
2. Navigate to your account settings
3. Generate an API key
4. Store it in an environment variable:

```bash
export DOKPLOY_TOKEN="your-api-key-here"
```

## Capabilities

The Dokploy provider supports all Paasman operations:

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

## Dokploy-Specific Behavior

### Application Listing

Dokploy organizes applications under projects. The provider fetches all projects via `project.all` and flattens the applications into a single list.

### Environment Variables

Dokploy stores environment variables as a newline-separated string on the application object (`env` field). The provider:

- **`env set`** fetches the current env string, parses it, merges in the new key-value pairs, and saves the result.
- **`env push`** writes the entire env string, fully replacing all existing variables.
- **`env delete`** parses the env string, removes the matching key, and saves the result.

### Database Engines

Dokploy uses separate API routers for each database engine:

| Paasman Engine | Dokploy Router |
|---------------|---------------|
| `postgresql` | `postgres` |
| `mysql` | `mysql` |
| `mariadb` | `mariadb` |
| `mongodb` | `mongo` |
| `redis` | `redis` |

### Deployment Listing

Dokploy requires an `applicationId` when listing deployments. Calling `deploys list` without an app ID returns an empty list.

## SDK Usage

```typescript
import { Paasman } from '@paasman/core'
import { DokployProvider } from '@paasman/provider-dokploy'

const pm = new Paasman({
  provider: new DokployProvider({
    baseUrl: 'https://dokploy.example.com',
    apiKey: process.env.DOKPLOY_TOKEN!,
  })
})

const apps = await pm.apps.list()
await pm.apps.deploy('app-id')
```

## API Mapping

The Dokploy provider maps to the Dokploy tRPC-style API:

| Paasman Operation | Dokploy Endpoint |
|-------------------|-----------------|
| `apps.list` | `GET /api/project.all` (flattened) |
| `apps.get` | `GET /api/application.one` |
| `apps.create` | `POST /api/application.create` |
| `apps.deploy` | `POST /api/application.deploy` |
| `apps.stop` | `POST /api/application.stop` |
| `apps.restart` | `POST /api/application.redeploy` |
| `env (all)` | `POST /api/application.saveEnvironment` |
| `servers.list` | `GET /api/server.all` |
| `databases.create` | `POST /api/<engine>.create` |
| `deployments.list` | `GET /api/deployment.all` |
| `deployments.cancel` | `POST /api/deployment.killProcess` |
