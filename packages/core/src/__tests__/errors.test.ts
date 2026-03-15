import { describe, expect, it } from 'vitest'
import {
  PaasmanError, AuthError, ConnectionError, NotFoundError,
  ConflictError, RateLimitError, UnsupportedError,
  ValidationError, ProviderError, TimeoutError,
} from '../errors.js'

describe('Error classes', () => {
  it('PaasmanError has code and provider', () => {
    const err = new PaasmanError('test', 'AUTH_FAILED', 'coolify')
    expect(err.message).toBe('test')
    expect(err.code).toBe('AUTH_FAILED')
    expect(err.provider).toBe('coolify')
    expect(err.name).toBe('PaasmanError')
    expect(err).toBeInstanceOf(Error)
  })

  it('AuthError sets correct defaults', () => {
    const err = new AuthError('coolify')
    expect(err.code).toBe('AUTH_FAILED')
    expect(err.provider).toBe('coolify')
    expect(err.name).toBe('AuthError')
    expect(err).toBeInstanceOf(PaasmanError)
  })

  it('ConnectionError includes url', () => {
    const err = new ConnectionError('coolify', 'https://example.com')
    expect(err.message).toContain('https://example.com')
    expect(err.code).toBe('CONNECTION_FAILED')
  })

  it('NotFoundError includes resource and id', () => {
    const err = new NotFoundError('application', 'abc-123', 'coolify')
    expect(err.message).toContain('application')
    expect(err.message).toContain('abc-123')
    expect(err.code).toBe('NOT_FOUND')
  })

  it('RateLimitError includes retryAfterMs', () => {
    const err = new RateLimitError('coolify', 5000)
    expect(err.retryAfterMs).toBe(5000)
    expect(err.code).toBe('RATE_LIMITED')
  })

  it('UnsupportedError includes operation', () => {
    const err = new UnsupportedError('apps.stop', 'caprover')
    expect(err.message).toContain('apps.stop')
    expect(err.message).toContain('caprover')
    expect(err.code).toBe('UNSUPPORTED')
  })

  it('ValidationError includes fields', () => {
    const err = new ValidationError('Bad input', { name: 'required' })
    expect(err.fields).toEqual({ name: 'required' })
    expect(err.code).toBe('VALIDATION')
  })

  it('ProviderError includes statusCode and responseBody', () => {
    const err = new ProviderError('coolify', 500, { error: 'internal' })
    expect(err.statusCode).toBe(500)
    expect(err.responseBody).toEqual({ error: 'internal' })
    expect(err.code).toBe('PROVIDER_ERROR')
  })

  it('TimeoutError includes timeoutMs', () => {
    const err = new TimeoutError('apps.list', 'coolify', 30000)
    expect(err.message).toContain('30000')
    expect(err.code).toBe('TIMEOUT')
  })

  it('Error cause chaining works', () => {
    const cause = new Error('fetch failed')
    const err = new AuthError('coolify', cause)
    expect(err.cause).toBe(cause)
  })
})
