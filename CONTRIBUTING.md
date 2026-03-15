# Contributing to Paasman

Thanks for your interest in contributing to Paasman! This guide will help you get started.

## Development Setup

### Prerequisites

- Node.js 20+
- pnpm 9+
- Git

### Getting Started

```bash
# Clone the repo
git clone https://github.com/aerocyberlabs/paasman.git
cd paasman

# Install dependencies
pnpm install

# Build all packages
pnpm build

# Run tests
pnpm test

# Lint & format
pnpm lint
```

## Project Structure

```
packages/
├── core/              # Universal interface, types, registry
├── cli/               # CLI built on Commander.js
├── provider-coolify/  # Coolify adapter
├── provider-dokploy/  # Dokploy adapter
├── provider-caprover/ # CapRover adapter
└── provider-dokku/    # Dokku adapter
```

## Adding a New Provider

1. Create a new package under `packages/provider-<name>/`
2. Implement the `PaasProvider` interface from `@paasman/core`
3. Map your platform's API responses to universal Paasman types
4. Add tests using the provider compliance test suite
5. Submit a PR

See `packages/provider-coolify/` as a reference implementation.

## Submitting Changes

1. Fork the repo and create a branch from `main`
2. Make your changes
3. Add or update tests as needed
4. Run `pnpm test` and `pnpm lint` to verify
5. Submit a pull request with a clear description

## Guidelines

- Keep PRs focused - one feature or fix per PR
- Follow existing code patterns and conventions
- Write tests for new functionality
- Use conventional commit messages (`feat:`, `fix:`, `docs:`, etc.)

## Reporting Issues

Open an issue on GitHub with:
- A clear description of the problem
- Steps to reproduce
- Expected vs actual behavior
- Your environment (OS, Node version, provider)
