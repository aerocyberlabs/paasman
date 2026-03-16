# @paasman/webhooks

Webhook notifications for Paasman deployment events. Supports Slack, Discord, and generic JSON payloads.

## Install

```bash
npm install @paasman/webhooks
```

## Usage

```typescript
import { WebhookManager } from '@paasman/webhooks'

const webhooks = new WebhookManager([
  { url: 'https://hooks.slack.com/services/xxx', format: 'slack', events: ['deploy'] },
  { url: 'https://discord.com/api/webhooks/xxx', format: 'discord', events: ['deploy', 'stop'] },
])

await webhooks.notify({
  event: 'deploy',
  profile: 'prod',
  provider: 'coolify',
  app: { id: 'abc-123', name: 'my-app' },
})
```

## Configuration

Add webhooks to `~/.paasman/config.yaml`:

```yaml
webhooks:
  - url: https://hooks.slack.com/services/xxx
    format: slack
    events: [deploy, stop, restart]
```

## Formats

- **`generic`** — Raw JSON payload
- **`slack`** — Slack Block Kit message
- **`discord`** — Discord embed message

## License

MIT
