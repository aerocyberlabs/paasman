---
layout: home

hero:
  name: Paasman
  text: One CLI for all your self-hosted PaaS platforms
  tagline: Manage Coolify, Dokploy, CapRover, and Dokku from a single tool. CLI and SDK included.
  actions:
    - theme: brand
      text: Get Started
      link: /guide/getting-started
    - theme: alt
      text: View on GitHub
      link: https://github.com/aerocyberlabs/paasman

features:
  - title: Universal Interface
    details: A single set of commands that work across every supported PaaS platform. Learn once, use everywhere.
  - title: Multi-Provider
    details: Manage multiple platforms and environments from one config file. Switch between profiles with a flag.
  - title: CLI + SDK
    details: Use the CLI for day-to-day operations, or import the SDK into your scripts and CI/CD pipelines.
  - title: Open Source
    details: MIT licensed. Add support for your favorite PaaS by creating a provider package.
---

## Quick Install

```bash
npm install -g @paasman/cli @paasman/provider-coolify
```

Then initialize your configuration:

```bash
paasman init
```

See the [Getting Started](/guide/getting-started) guide for full setup instructions.
