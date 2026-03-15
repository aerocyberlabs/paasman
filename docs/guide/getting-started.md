# Getting Started

## Installation

Install the CLI and at least one provider package:

```bash
# Install the CLI globally
npm install -g @paasman/cli

# Install a provider (pick the one matching your platform)
npm install -g @paasman/provider-coolify
npm install -g @paasman/provider-dokploy
```

You can also use pnpm or yarn:

```bash
pnpm add -g @paasman/cli @paasman/provider-coolify
```

## Initialize Configuration

Run the interactive setup wizard:

```bash
paasman init
```

You will be prompted for:

1. **Profile name** -- a label for this connection (e.g. `prod`, `staging`)
2. **Provider** -- the PaaS platform (`coolify`, `dokploy`, `caprover`, `dokku`)
3. **Server URL** -- the base URL of your PaaS instance
4. **API token** -- your authentication token

This creates `~/.paasman/config.yaml`:

```yaml
profiles:
  prod:
    provider: coolify
    url: https://coolify.example.com
    token: your-api-token
default: prod
```

::: tip
For security, replace the raw token with an environment variable reference:
```yaml
token: ${COOLIFY_TOKEN}
```
Paasman will read the value from your shell environment at runtime.
:::

## Basic Commands

### List applications

```bash
paasman apps list
```

### Deploy an application

```bash
paasman apps deploy <app-id>
```

### View application logs

```bash
paasman apps logs <app-id>
paasman apps logs <app-id> -f          # follow mode
paasman apps logs <app-id> -n 50       # last 50 lines
```

### Manage environment variables

```bash
# Download remote env vars to a local .env file
paasman env pull <app-id>

# Upload a local .env file to the remote app
paasman env push <app-id>

# Compare local and remote env vars
paasman env diff <app-id>
```

### Check status across all profiles

```bash
paasman status
```

This shows a dashboard with the health, provider, and app count for every configured profile.

## Multi-Profile Setup

Add more profiles to `~/.paasman/config.yaml`:

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
default: prod
```

Then target a specific profile:

```bash
# Use the default profile
paasman apps list

# Use a specific profile
paasman apps list --profile staging

# List apps from every profile at once
paasman apps list --all-profiles
```

Switch the default profile:

```bash
paasman profile switch staging
```

## SDK Usage

Use Paasman programmatically in Node.js scripts or CI/CD pipelines:

```typescript
import { Paasman } from '@paasman/core'
import { CoolifyProvider } from '@paasman/provider-coolify'

const pm = new Paasman({
  provider: new CoolifyProvider({
    baseUrl: 'https://coolify.example.com',
    token: process.env.COOLIFY_TOKEN!,
  })
})

const apps = await pm.apps.list()
await pm.apps.deploy('my-app-id')

const envVars = await pm.env.pull('my-app-id')
console.log(envVars)
```

### Multi-Provider SDK

```typescript
import { Paasman } from '@paasman/core'
import { CoolifyProvider } from '@paasman/provider-coolify'
import { DokployProvider } from '@paasman/provider-dokploy'

const pm = new Paasman({
  providers: {
    prod: new CoolifyProvider({ baseUrl: '...', token: '...' }),
    staging: new DokployProvider({ baseUrl: '...', apiKey: '...' }),
  }
})

const prodApps = await pm.use('prod').apps.list()
const stagingApps = await pm.use('staging').apps.list()
```

## Next Steps

- [Configuration](/guide/configuration) -- full config file reference
- [CLI Reference](/guide/cli-reference) -- every command and option
- [Providers](/guide/providers) -- available providers and their capabilities
