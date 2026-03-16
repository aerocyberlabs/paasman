# @paasman/provider-caprover

Caprover provider for Paasman — Universal PaaS CLI & SDK.

## Install

```bash
npm install @paasman/provider-caprover @paasman/core
```

## Usage with SDK

```typescript
import { Paasman } from '@paasman/core'
import { CaproverProvider } from '@paasman/provider-caprover'

const pm = new Paasman({
  provider: new CaproverProvider({
    baseUrl: 'https://caprover.example.com',
    token: process.env.CAPROVER_TOKEN,
  })
})

const apps = await pm.apps.list()
await pm.apps.deploy('my-app')
```

## Usage with CLI

```bash
npm install -g @paasman/cli @paasman/provider-caprover
paasman init  # Select caprover as provider
paasman apps list
```

## License

MIT
