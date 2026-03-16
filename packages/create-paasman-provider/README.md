# create-paasman-provider

Scaffold a new Paasman provider project with a single command.

## Usage

```bash
npm create paasman-provider
# or
pnpm create paasman-provider
```

## What it generates

```
paasman-provider-<name>/
├── package.json
├── tsconfig.json
├── tsup.config.ts
├── vitest.config.ts
├── README.md
└── src/
    ├── index.ts
    ├── client.ts          # HTTP client skeleton
    ├── normalizers.ts     # Data normalizer stubs
    ├── provider.ts        # PaasProvider implementation skeleton
    └── __tests__/
        └── provider.test.ts
```

## License

MIT
