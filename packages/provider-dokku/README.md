# @paasman/provider-dokku

Dokku provider for Paasman — Universal PaaS CLI & SDK.

## Install

```bash
npm install @paasman/provider-dokku @paasman/core
```

## Usage with SDK

```typescript
import { Paasman } from '@paasman/core'
import { DokkuProvider } from '@paasman/provider-dokku'

const pm = new Paasman({
  provider: new DokkuProvider({
    baseUrl: 'https://dokku.example.com',
    token: process.env.DOKKU_TOKEN,
  })
})

const apps = await pm.apps.list()
await pm.apps.deploy('my-app')
```

## Usage with CLI

```bash
npm install -g @paasman/cli @paasman/provider-dokku
paasman init  # Select dokku as provider
paasman apps list
```

## License

MIT
