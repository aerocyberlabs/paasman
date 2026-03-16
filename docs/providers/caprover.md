# CapRover

[CapRover](https://caprover.com) is a free and open-source PaaS that makes deploying web apps and databases easy using Docker and Nginx.

## Installation

```bash
npm install @paasman/provider-caprover @paasman/core
```

## Configuration

```yaml
profiles:
  caprover:
    provider: caprover
    url: https://captain.example.com
    token: ${CAPROVER_PASSWORD}
default: caprover
```

::: tip Authentication
CapRover uses password-based login. The `token` field in your config should contain your CapRover dashboard password. Paasman handles the login flow automatically and caches the session token.
:::

### Getting Your Credentials

1. Log in to your CapRover dashboard
2. Your API password is the same as your dashboard password
3. Store it in an environment variable:

```bash
export CAPROVER_PASSWORD="your-dashboard-password"
```

## Capabilities

| Capability | Supported |
|------------|:---------:|
| `apps.list` | Yes |
| `apps.get` | Yes |
| `apps.create` | Yes |
| `apps.delete` | Yes |
| `apps.deploy` | Yes |
| `apps.start` | No |
| `apps.stop` | No |
| `apps.restart` | No |
| `apps.logs` | No |
| `env.list` | Yes |
| `env.set` | Yes |
| `env.delete` | Yes |
| `env.pull` | Yes |
| `env.push` | Yes |
| `servers.list` | Yes (cluster nodes) |
| `servers.get` | Yes |
| `databases` | No (deploy as one-click apps) |
| `deployments` | No |

::: info Limited Lifecycle Control
CapRover does not expose discrete start/stop/restart APIs. Apps are managed via deploy/undeploy. Log streaming is also not available through the API.
:::

## SDK Usage

```typescript
import { Paasman } from '@paasman/core'
import { CapRoverProvider } from '@paasman/provider-caprover'

const pm = new Paasman({
  provider: new CapRoverProvider({
    baseUrl: 'https://captain.example.com',
    password: 'your-password',
  })
})

const apps = await pm.apps.list()
await pm.apps.deploy('my-app')
```

## API Mapping

| Paasman Operation | CapRover API |
|-------------------|-------------|
| `apps.list` | `GET /api/v2/user/apps/appDefinitions` |
| `apps.create` | `POST /api/v2/user/apps/appDefinitions/register` |
| `apps.delete` | `POST /api/v2/user/apps/appDefinitions/delete` |
| `apps.deploy` | `POST /api/v2/user/apps/appDefinitions/deploy` |
| `env.set` | `POST /api/v2/user/apps/appDefinitions/update` (merge) |
| `env.push` | `POST /api/v2/user/apps/appDefinitions/update` (replace) |
| `servers.list` | `GET /api/v2/user/system/nodes` |
