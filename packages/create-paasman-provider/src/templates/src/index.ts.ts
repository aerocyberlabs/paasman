export function indexTemplate(vars: { name: string }): string {
  const Name = vars.name.charAt(0).toUpperCase() + vars.name.slice(1)
  return `export { ${Name}Provider } from './provider.js'
export type { ${Name}ProviderConfig } from './provider.js'
export { ${Name}Client } from './client.js'
export { toApp, toServer, toDeployment, toEnvVar } from './normalizers.js'
`
}
