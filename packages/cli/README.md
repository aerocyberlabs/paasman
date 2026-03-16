# @paasman/cli

Universal CLI for managing applications across self-hosted PaaS platforms.

## Install

```bash
npm install -g @paasman/cli @paasman/provider-coolify
```

## Quick Start

```bash
paasman init                    # Interactive setup
paasman apps list               # List all apps
paasman apps deploy <id>        # Deploy an app
paasman env pull <id>           # Download env vars to .env
paasman env push <id>           # Upload from .env
paasman env diff <id>           # Compare local vs remote
paasman status                  # Dashboard across all profiles
```

## Commands

| Command | Description |
|---------|-------------|
| `init` | Interactive configuration setup |
| `apps list/get/create/delete/deploy/stop/restart/logs` | Application management |
| `env list/set/delete/pull/push/diff` | Environment variable management |
| `servers list/get` | Server management |
| `deploys list/cancel` | Deployment management |
| `db list/create/delete` | Database management |
| `profile list/add/switch` | Profile management |
| `status` | Multi-platform dashboard |
| `sync` | Declarative desired-state deployment |
| `migrate` | Cross-provider app migration |

## Multi-Platform

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
paasman apps list --all-profiles    # See apps across all providers
paasman apps list --profile staging  # Target specific profile
```

## License

MIT
