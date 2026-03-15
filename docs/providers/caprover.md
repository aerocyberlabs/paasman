# CapRover

[CapRover](https://caprover.com) is a free and open-source PaaS that makes deploying web apps and databases easy using Docker and Nginx.

::: warning Status: Planned
The CapRover provider is not yet implemented. This page documents the planned integration.
:::

## Planned Installation

```bash
npm install -g @paasman/provider-caprover
```

## Planned Configuration

```yaml
profiles:
  caprover:
    provider: caprover
    url: https://captain.example.com
    token: ${CAPROVER_TOKEN}
default: caprover
```

### Getting Your API Token

1. Log in to your CapRover dashboard
2. The API token is typically your CapRover password or a token retrieved via the login endpoint
3. Store it in an environment variable:

```bash
export CAPROVER_TOKEN="your-token-here"
```

## Planned Capabilities

| Capability | Planned |
|------------|:-------:|
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
| `servers` | No (single-server architecture) |
| `databases` | Possible |
| `deployments.list` | Possible |
| `deployments.cancel` | Possible |

## CapRover API

CapRover exposes a REST API at `/api/v2/`. Key endpoints include:

- `POST /api/v2/login` -- authenticate and receive a token
- `GET /api/v2/user/apps/appDefinitions` -- list all apps
- `POST /api/v2/user/apps/appData/<appName>` -- deploy an app
- `POST /api/v2/user/apps/appDefinitions/update` -- update app settings (including env vars)

## Contributing

Want to help implement the CapRover provider? See [Creating a Provider](/contributing/creating-a-provider) for guidance, and check the existing `provider-coolify` package as a reference.
