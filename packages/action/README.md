# @paasman/action

GitHub Action for deploying applications using Paasman - the Universal PaaS CLI.

## Inputs

| Input | Description | Required | Default |
|-------|-------------|----------|---------|
| `provider` | PaaS provider (`coolify`, `dokploy`, `caprover`, `dokku`) | Yes | - |
| `server-url` | PaaS server URL | Yes | - |
| `token` | API token for the PaaS provider | Yes | - |
| `app-id` | Application ID to deploy | Yes | - |
| `command` | Command to run (`deploy`, `stop`, `restart`, `env-push`) | No | `deploy` |
| `env-file` | Path to `.env` file (for `env-push` command) | No | - |
| `force` | Force rebuild on deploy | No | `false` |

## Outputs

| Output | Description |
|--------|-------------|
| `deployment-id` | The ID of the triggered deployment (for `deploy` command) |

## Usage

### Deploy an application

```yaml
- uses: aerocyberlabs/paasman@v1
  with:
    provider: coolify
    server-url: https://coolify.example.com
    token: ${{ secrets.COOLIFY_TOKEN }}
    app-id: my-app-uuid
    command: deploy
    force: true
```

### Push environment variables

```yaml
- uses: aerocyberlabs/paasman@v1
  with:
    provider: coolify
    server-url: https://coolify.example.com
    token: ${{ secrets.COOLIFY_TOKEN }}
    app-id: my-app-uuid
    command: env-push
    env-file: .env.production
```

### Stop an application

```yaml
- uses: aerocyberlabs/paasman@v1
  with:
    provider: dokploy
    server-url: https://dokploy.example.com
    token: ${{ secrets.DOKPLOY_TOKEN }}
    app-id: my-app-id
    command: stop
```

### Restart an application

```yaml
- uses: aerocyberlabs/paasman@v1
  with:
    provider: caprover
    server-url: https://captain.example.com
    token: ${{ secrets.CAPROVER_TOKEN }}
    app-id: my-app
    command: restart
```
