# Changelog

All notable changes to the Paasman project are documented here. For per-package changelogs, see `packages/*/CHANGELOG.md`.

## 0.2.0 — 2026-03-16

Initial public release.

### Packages

- `@paasman/core@0.2.0` — Types, interfaces, errors, Paasman wrapper with Zod schemas
- `@paasman/cli@0.2.0` — 11 CLI commands: apps, env, servers, deploys, db, profile, init, status, sync, migrate
- `@paasman/provider-coolify@1.0.0` — Full Coolify REST API provider
- `@paasman/provider-dokploy@1.0.0` — Full Dokploy tRPC API provider
- `@paasman/provider-caprover@1.0.0` — CapRover provider (login-based auth, limited capabilities)
- `@paasman/provider-dokku@1.0.0` — Dokku SSH-based provider with command injection protection
- `@paasman/webhooks@0.2.0` — Webhook notifications (Slack, Discord, generic JSON)
- `@paasman/action@0.2.0` — GitHub Action for CI/CD deployments
- `@paasman/create-provider@0.2.1` — Provider scaffolding tool

### Features

- Universal `PaasProvider` interface with capability-based optionality
- Multi-provider support with profile management
- Environment variable sync: pull, push, diff with secret masking
- Declarative deployments via `paasman.yaml` (sync command)
- Cross-provider app migration with env transfer
- Webhook notifications on deploy/stop/restart events
- GitHub Action for automated deployments
- Provider scaffolding with `npm create @paasman/provider`

### Security

- Input validation for SSH command injection prevention (Dokku)
- Shell value escaping (always single-quoted)
- Config files written with restricted permissions (0o600)
- Provider allowlist before dynamic import
- SSH host key verification enabled by default
- Sync YAML env interpolation restricted to PAASMAN_/APP_ prefixes
- Env diff masks values by default (--reveal to show)
- Webhook URL validation blocks private/local addresses
- Scaffolding name validated against path traversal
