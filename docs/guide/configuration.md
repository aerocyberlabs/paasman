# Configuration

Paasman stores its configuration in `~/.paasman/config.yaml`. This file is created by `paasman init` and can be edited manually.

## Config File Format

```yaml
profiles:
  <profile-name>:
    provider: <provider-name>
    url: <server-url>
    token: <api-token>
default: <profile-name>
```

### Full Example

```yaml
profiles:
  prod:
    provider: coolify
    url: https://coolify.example.com
    token: ${COOLIFY_TOKEN}
  staging:
    provider: dokploy
    url: https://dokploy.staging.example.com
    token: ${DOKPLOY_TOKEN}
  dev:
    provider: coolify
    url: https://coolify.dev.example.com
    token: ${COOLIFY_DEV_TOKEN}
default: prod
```

## Profile Fields

| Field | Required | Description |
|-------|----------|-------------|
| `provider` | Yes | Provider name: `coolify`, `dokploy`, `caprover`, or `dokku` |
| `url` | Yes | Base URL of the PaaS instance (e.g. `https://coolify.example.com`) |
| `token` | Yes | API token or key for authentication |

## Environment Variable Interpolation

Any value in the config can reference an environment variable using `${VAR_NAME}` syntax:

```yaml
profiles:
  prod:
    provider: coolify
    url: https://coolify.example.com
    token: ${COOLIFY_TOKEN}
```

At runtime, Paasman replaces `${COOLIFY_TOKEN}` with the value of the `COOLIFY_TOKEN` environment variable. If the variable is not set, Paasman exits with an error.

This is the recommended approach for storing secrets -- never commit raw tokens to version control.

### Setting Environment Variables

```bash
# In your shell profile (~/.bashrc, ~/.zshrc, etc.)
export COOLIFY_TOKEN="your-api-token-here"

# Or use a .env loader like direnv
# .envrc
export COOLIFY_TOKEN="your-api-token-here"
```

## Profile Management

### List all profiles

```bash
paasman profile list
```

Output:

```
  prod (default) — coolify @ https://coolify.example.com
  staging — dokploy @ https://dokploy.staging.example.com
```

### Switch the default profile

```bash
paasman profile switch staging
```

### Override per command

```bash
paasman apps list --profile staging
```

### Query all profiles at once

```bash
paasman apps list --all-profiles
```

This iterates over every profile and aggregates the results, labelling each row with its profile name.

## Multiple Profiles, Same Provider

You can have multiple profiles pointing to the same provider type but different instances:

```yaml
profiles:
  coolify-us:
    provider: coolify
    url: https://coolify-us.example.com
    token: ${COOLIFY_US_TOKEN}
  coolify-eu:
    provider: coolify
    url: https://coolify-eu.example.com
    token: ${COOLIFY_EU_TOKEN}
default: coolify-us
```

## Config File Location

The config file is always read from `~/.paasman/config.yaml`. This path is not currently configurable. The directory is created automatically by `paasman init`.
