# Contributing

Thanks for your interest in contributing to Paasman. This guide covers how to set up a development environment and submit changes.

## Prerequisites

- Node.js 20+
- pnpm 9+
- Git

## Development Setup

```bash
# Clone the repository
git clone https://github.com/aerocyberlabs/paasman.git
cd paasman

# Install dependencies
pnpm install

# Build all packages
pnpm build

# Run tests
pnpm test

# Lint and format
pnpm lint
pnpm lint:fix
```

## Project Structure

```
packages/
  core/              # @paasman/core — universal interface, types, Zod schemas
  cli/               # @paasman/cli — CLI built on Commander.js
  provider-coolify/  # @paasman/provider-coolify — Coolify adapter
  provider-dokploy/  # @paasman/provider-dokploy — Dokploy adapter
```

The project is a monorepo managed with Turborepo and pnpm workspaces.

## Tech Stack

| Tool | Purpose |
|------|---------|
| TypeScript | Strict mode, full type safety |
| Turborepo + pnpm | Monorepo management |
| Zod | Runtime validation of API responses |
| Commander.js | CLI framework |
| Vitest | Testing |
| Biome | Linting and formatting |
| tsup | Building packages |

## Ways to Contribute

- **Add a new provider** -- See [Creating a Provider](/contributing/creating-a-provider)
- **Improve existing providers** -- Better error handling, support for more endpoints
- **Enhance the CLI** -- New commands, better output formatting, interactive features
- **Fix bugs** -- Check the issue tracker for open bugs
- **Improve documentation** -- Corrections, examples, guides

## Submitting Changes

1. Fork the repo and create a branch from `main`
2. Make your changes
3. Add or update tests
4. Run `pnpm test` and `pnpm lint` to verify
5. Submit a pull request with a clear description

## Guidelines

- Keep PRs focused -- one feature or fix per PR
- Follow existing code patterns and conventions
- Write tests for new functionality
- Use conventional commit messages (`feat:`, `fix:`, `docs:`, etc.)

## Reporting Issues

Open an issue on GitHub with:

- A clear description of the problem
- Steps to reproduce
- Expected vs actual behavior
- Your environment (OS, Node version, provider)
