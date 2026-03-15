export function tsconfigTemplate(): string {
  return JSON.stringify(
    {
      compilerOptions: {
        target: 'ES2022',
        module: 'ESNext',
        moduleResolution: 'bundler',
        declaration: true,
        declarationMap: true,
        sourceMap: true,
        strict: true,
        esModuleInterop: true,
        skipLibCheck: true,
        forceConsistentCasingInFileNames: true,
        resolveJsonModule: true,
        isolatedModules: true,
        verbatimModuleSyntax: true,
        outDir: './dist',
        rootDir: './src',
      },
      include: ['src'],
    },
    null,
    2,
  ) + '\n'
}
