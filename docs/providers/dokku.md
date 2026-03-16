# Dokku

[Dokku](https://dokku.com) is an open-source, Docker-powered PaaS that implements a Heroku-like workflow via SSH and Git.

## Installation

```bash
npm install @paasman/provider-dokku @paasman/core
```

## Configuration

Dokku uses SSH instead of an HTTP API, so the configuration differs from other providers:

```yaml
profiles:
  dokku:
    provider: dokku
    url: dokku.example.com
    token: ~/.ssh/id_rsa
default: dokku
```

::: tip SSH Authentication
The `url` field is the hostname (no `https://`). The `token` field is the path to your SSH private key. Ensure your public key is added to the Dokku server with `dokku ssh-keys:add`.
:::

## Capabilities

| Capability | Supported |
|------------|:---------:|
| `apps.list` | Yes |
| `apps.get` | Yes |
| `apps.create` | Yes |
| `apps.delete` | Yes |
| `apps.deploy` | Yes (via `ps:rebuild`) |
| `apps.start` | Yes |
| `apps.stop` | Yes |
| `apps.restart` | Yes |
| `apps.logs` | Yes |
| `env.list` | Yes |
| `env.set` | Yes (additive) |
| `env.delete` | Yes |
| `env.pull` | Yes |
| `env.push` | Yes (full replace with `--no-restart` batch) |
| `servers` | No (single-server architecture) |
| `databases.list` | Yes (via plugins) |
| `databases.create` | Yes |
| `databases.delete` | Yes |
| `deployments` | No (git-push based, no tracking) |

## SDK Usage

```typescript
import { Paasman } from '@paasman/core'
import { DokkuProvider } from '@paasman/provider-dokku'

const pm = new Paasman({
  provider: new DokkuProvider({
    host: 'dokku.example.com',
    privateKeyPath: '~/.ssh/id_rsa',
  })
})

const apps = await pm.apps.list()
await pm.apps.deploy('my-app')  // triggers ps:rebuild
```

## How It Works

Unlike other providers that use HTTP APIs, all Dokku operations are performed by executing commands over SSH:

```bash
# The provider translates Paasman operations to these SSH commands
ssh dokku@example.com apps:list
ssh dokku@example.com apps:create my-app
ssh dokku@example.com config:show my-app
ssh dokku@example.com config:set my-app KEY='value'
ssh dokku@example.com ps:rebuild my-app
```

## Command Mapping

| Paasman Operation | Dokku Command |
|-------------------|---------------|
| `apps.list` | `apps:list` + `apps:report` per app |
| `apps.create` | `apps:create <name>` |
| `apps.delete` | `apps:destroy <name> --force` |
| `apps.deploy` | `ps:rebuild <name>` |
| `apps.start/stop/restart` | `ps:start/stop/restart <name>` |
| `apps.logs` | `logs <name> -n <lines>` |
| `env.list` | `config:show <name>` |
| `env.set` | `config:set <name> KEY='value'` |
| `env.delete` | `config:unset <name> KEY` |
| `env.push` | `config:unset --no-restart` + `config:set` |
| `databases.list` | `postgres:list`, `mysql:list`, etc. |
| `databases.create` | `postgres:create <name>`, etc. |

## Database Support

Dokku supports databases through official plugins. The provider automatically detects installed plugins and maps them:

| Plugin | Engine |
|--------|--------|
| `dokku-postgres` | `postgresql` |
| `dokku-mysql` | `mysql` |
| `dokku-mariadb` | `mariadb` |
| `dokku-mongo` | `mongodb` |
| `dokku-redis` | `redis` |

## Security

All user inputs (app names, database names, env keys) are validated against strict regex patterns before being interpolated into SSH commands. Env values are always single-quoted to prevent shell injection. SSH host key verification is enabled by default.
