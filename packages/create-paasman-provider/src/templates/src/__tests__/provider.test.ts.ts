export function providerTestTemplate(vars: { name: string }): string {
  const Name = vars.name.charAt(0).toUpperCase() + vars.name.slice(1)
  return `import { describe, it, expect } from 'vitest'
import { ${Name}Provider } from '../provider.js'

describe('${Name}Provider', () => {
  const provider = new ${Name}Provider({
    baseUrl: 'http://localhost:3000',
    token: 'test-token',
  })

  it('should have correct name', () => {
    expect(provider.name).toBe('${vars.name}')
  })

  it('should have correct version', () => {
    expect(provider.version).toBe('0.1.0')
  })

  it('should have capabilities defined', () => {
    expect(provider.capabilities).toBeDefined()
    expect(provider.capabilities.apps).toBeDefined()
    expect(provider.capabilities.servers).toBeDefined()
    expect(provider.capabilities.databases).toBeDefined()
    expect(provider.capabilities.deployments).toBeDefined()
  })

  // TODO: Add integration tests with mocked HTTP responses
})
`
}
