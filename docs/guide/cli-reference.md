# CLI Reference

## Global Options

| Option | Description |
|--------|-------------|
| `--profile <name>` | Use a specific profile instead of the default |
| `--json` | Output results as JSON (supported on most list/get commands) |
| `--version` | Print the CLI version |
| `--help` | Show help for any command |

## `paasman init`

Initialize Paasman configuration interactively.

```bash
paasman init
```

Prompts for a profile name, provider, server URL, and API token, then writes `~/.paasman/config.yaml`.

## `paasman apps`

Manage applications.

### `apps list`

List all applications in the current profile.

```bash
paasman apps list
paasman apps list --json
paasman apps list --all-profiles
paasman apps list --all-profiles --json
```

| Option | Description |
|--------|-------------|
| `--json` | Output as JSON |
| `--all-profiles` | Aggregate apps from every configured profile |

### `apps get <id>`

Get details for a single application.

```bash
paasman apps get abc-123
paasman apps get abc-123 --json
```

### `apps create`

Create a new application. Supports both flag-based and interactive modes.

```bash
# From a git repository
paasman apps create --name my-app --repo https://github.com/user/repo --branch main

# From a Docker image
paasman apps create --name my-app --image nginx:latest

# Interactive mode (no flags)
paasman apps create
```

| Option | Description |
|--------|-------------|
| `--name <name>` | Application name |
| `--repo <url>` | Git repository URL |
| `--branch <branch>` | Git branch (default: `main`) |
| `--image <image>` | Docker image |
| `--server <id>` | Target server UUID |

### `apps delete <id>`

Delete an application.

```bash
paasman apps delete abc-123
```

### `apps deploy <id>`

Trigger a deployment for an application.

```bash
paasman apps deploy abc-123
paasman apps deploy abc-123 --force
```

| Option | Description |
|--------|-------------|
| `--force` | Force a full rebuild |

### `apps stop <id>`

Stop a running application.

```bash
paasman apps stop abc-123
```

::: info
Requires the provider to support `apps.stop`. An error is thrown if the capability is not available.
:::

### `apps restart <id>`

Restart an application.

```bash
paasman apps restart abc-123
```

### `apps logs <id>`

Stream application logs.

```bash
paasman apps logs abc-123
paasman apps logs abc-123 -n 50
paasman apps logs abc-123 -f
```

| Option | Description |
|--------|-------------|
| `-n, --lines <number>` | Number of log lines to fetch (default: `100`) |
| `-f, --follow` | Follow log output in real time |

Press `Ctrl+C` to stop following logs.

## `paasman env`

Manage environment variables for an application.

### `env list <app-id>`

List all environment variables.

```bash
paasman env list abc-123
paasman env list abc-123 --json
```

### `env set <app-id> [KEY=value...]`

Set one or more environment variables. This is an additive merge -- existing variables not listed are left unchanged.

```bash
paasman env set abc-123 DATABASE_URL=postgres://... REDIS_URL=redis://...
```

### `env delete <app-id> <key>`

Delete a single environment variable.

```bash
paasman env delete abc-123 OLD_SECRET
```

### `env pull <app-id>`

Download remote environment variables to a local `.env` file.

```bash
paasman env pull abc-123
paasman env pull abc-123 -o .env.production
```

| Option | Description |
|--------|-------------|
| `-o, --output <file>` | Output file path (default: `.env`) |

### `env push <app-id>`

Upload a local `.env` file to the remote application. This is a full replace -- remote variables not in the file are removed.

```bash
paasman env push abc-123
paasman env push abc-123 -f .env.production
```

| Option | Description |
|--------|-------------|
| `-f, --file <file>` | Input file path (default: `.env`) |

### `env diff <app-id>`

Compare the local `.env` file with the remote environment variables.

```bash
paasman env diff abc-123
paasman env diff abc-123 -f .env.production
paasman env diff abc-123 --full
```

| Option | Description |
|--------|-------------|
| `-f, --file <file>` | Local env file to compare (default: `.env`) |
| `--full` | Show matching keys as well as differences |

Output uses color-coded markers:

- `+ KEY=value` -- local only (will be added on push)
- `- KEY=value` -- remote only (will be removed on push)
- `~ KEY: old -> new` -- value differs

## `paasman servers`

Manage servers.

### `servers list`

List all servers.

```bash
paasman servers list
paasman servers list --json
```

### `servers get <id>`

Get details for a single server.

```bash
paasman servers get server-uuid
```

::: info
Server commands require the provider to support the `servers` capability.
:::

## `paasman deploys`

Manage deployments.

### `deploys list [app-id]`

List deployments, optionally filtered by application.

```bash
paasman deploys list
paasman deploys list abc-123
paasman deploys list --json
```

### `deploys cancel <id>`

Cancel a running deployment.

```bash
paasman deploys cancel deploy-456
```

::: info
Requires the provider to support `deployments.cancel`.
:::

## `paasman db`

Manage databases.

### `db list`

List all databases.

```bash
paasman db list
paasman db list --json
```

### `db create`

Create a new database. Supports both flag-based and interactive modes.

```bash
paasman db create --name my-db --engine postgresql --version 16
paasman db create  # interactive
```

| Option | Description |
|--------|-------------|
| `--name <name>` | Database name |
| `--engine <engine>` | Engine type: `postgresql`, `mysql`, `mariadb`, `mongodb`, `redis` |
| `--version <version>` | Engine version |
| `--server <id>` | Target server UUID |

### `db delete <id>`

Delete a database.

```bash
paasman db delete db-789
```

::: info
Database commands require the provider to support the `databases` capability.
:::

## `paasman profile`

Manage configuration profiles.

### `profile list`

List all configured profiles and their providers.

```bash
paasman profile list
```

### `profile switch <name>`

Set the default profile.

```bash
paasman profile switch staging
```

## `paasman status`

Show a dashboard overview of all configured profiles, including health status and app counts.

```bash
paasman status
```

Output is a table with columns: Profile, Provider, URL, Status, Apps.
