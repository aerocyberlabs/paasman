# Dokku

[Dokku](https://dokku.com) is an open-source, Docker-powered PaaS that implements a Heroku-like workflow via SSH and Git.

::: warning Status: Planned
The Dokku provider is not yet implemented. This page documents the planned integration.
:::

## Planned Installation

```bash
npm install -g @paasman/provider-dokku
```

## Planned Configuration

Dokku uses SSH instead of an HTTP API, so the configuration differs from other providers:

```yaml
profiles:
  dokku:
    provider: dokku
    url: ssh://dokku@example.com:22
    token: unused
default: dokku
```

::: tip
Dokku authenticates via SSH keys rather than API tokens. Ensure your SSH key is added to the Dokku server (`dokku ssh-keys:add`).
:::

## Planned Capabilities

| Capability | Planned |
|------------|:-------:|
| `apps.list` | Yes |
| `apps.get` | Yes |
| `apps.create` | Yes |
| `apps.delete` | Yes |
| `apps.deploy` | Partial (Git push based) |
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
| `databases` | Yes (via plugins) |
| `deployments.list` | No |
| `deployments.cancel` | No |

## How Dokku Differs

Unlike other providers that use HTTP APIs, Dokku operations are performed by executing commands over SSH:

```bash
# These are the underlying Dokku commands that the provider would translate to
ssh dokku@example.com apps:list
ssh dokku@example.com apps:create my-app
ssh dokku@example.com config:show my-app
ssh dokku@example.com config:set my-app KEY=value
```

The Paasman Dokku provider would use the `SshProviderConfig` connection type from `@paasman/core`:

```typescript
import type { ProviderConfig } from '@paasman/core'

const config: ProviderConfig = {
  type: 'ssh',
  host: 'example.com',
  port: 22,
  username: 'dokku',
}
```

## Database Support

Dokku supports databases through community plugins:

- `dokku-postgres` -- PostgreSQL
- `dokku-mysql` -- MySQL
- `dokku-redis` -- Redis
- `dokku-mongo` -- MongoDB

The provider would map these plugin commands to the Paasman `DatabaseOperations` interface.

## Contributing

Want to help implement the Dokku provider? See [Creating a Provider](/contributing/creating-a-provider) for guidance. The Dokku provider is an especially interesting case because it uses SSH rather than HTTP.
