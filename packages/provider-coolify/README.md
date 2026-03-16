# @paasman/provider-coolify

Coolify provider for Paasman — Universal PaaS CLI & SDK.

## Install

```bash
npm install @paasman/provider-coolify @paasman/core
```

## Usage with SDK

```typescript
import { Paasman } from '@paasman/core'
import { CoolifyProvider } from '@paasman/provider-coolify'

const pm = new Paasman({
  provider: new CoolifyProvider({
    baseUrl: 'https://coolify.example.com',
    token: process.env.COOLIFY_TOKEN,
  })
})

const apps = await pm.apps.list()
await pm.apps.deploy('my-app')
```

## Usage with CLI

```bash
npm install -g @paasman/cli @paasman/provider-coolify
paasman init  # Select coolify as provider
paasman apps list
```

## License

MIT
