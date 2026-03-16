# @paasman/provider-dokploy

Dokploy provider for Paasman — Universal PaaS CLI & SDK.

## Install

```bash
npm install @paasman/provider-dokploy @paasman/core
```

## Usage with SDK

```typescript
import { Paasman } from '@paasman/core'
import { DokployProvider } from '@paasman/provider-dokploy'

const pm = new Paasman({
  provider: new DokployProvider({
    baseUrl: 'https://dokploy.example.com',
    token: process.env.DOKPLOY_TOKEN,
  })
})

const apps = await pm.apps.list()
await pm.apps.deploy('my-app')
```

## Usage with CLI

```bash
npm install -g @paasman/cli @paasman/provider-dokploy
paasman init  # Select dokploy as provider
paasman apps list
```

## License

MIT
