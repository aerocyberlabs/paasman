export function packageJsonTemplate(vars: { name: string; author: string; description: string }): string {
  return JSON.stringify(
    {
      name: `@paasman/provider-${vars.name}`,
      version: '0.1.0',
      description: vars.description,
      type: 'module',
      exports: {
        '.': {
          import: './dist/index.js',
          require: './dist/index.cjs',
          types: './dist/index.d.ts',
        },
      },
      main: './dist/index.cjs',
      module: './dist/index.js',
      types: './dist/index.d.ts',
      files: ['dist'],
      scripts: {
        build: 'tsup',
        test: 'vitest run',
        'test:watch': 'vitest',
        clean: 'rm -rf dist',
      },
      dependencies: {
        '@paasman/core': '^0.1.0',
      },
      devDependencies: {
        vitest: '^4.1.0',
      },
      peerDependencies: {
        '@paasman/core': '^0.1.0',
      },
      author: vars.author,
      license: 'MIT',
    },
    null,
    2,
  ) + '\n'
}
