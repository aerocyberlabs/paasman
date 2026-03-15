import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest'
import { DokployClient } from '../client.js'
import { AuthError, ConnectionError, NotFoundError, ProviderError } from '@paasman/core'

describe('DokployClient', () => {
  let client: DokployClient

  beforeEach(() => {
    client = new DokployClient('https://dokploy.example.com', 'test-api-key')
  })

  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('sets x-api-key header', async () => {
    const mockFetch = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: () => Promise.resolve({ data: [] }),
    })
    vi.stubGlobal('fetch', mockFetch)

    await client.get('/api/application.one', { applicationId: 'app-1' })

    expect(mockFetch).toHaveBeenCalledWith(
      expect.stringContaining('dokploy.example.com'),
      expect.objectContaining({
        headers: expect.objectContaining({
          'x-api-key': 'test-api-key',
        }),
      }),
    )
  })

  it('get appends query params', async () => {
    const mockFetch = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: () => Promise.resolve({ result: {} }),
    })
    vi.stubGlobal('fetch', mockFetch)

    await client.get('/api/application.one', { applicationId: 'abc-123' })

    expect(mockFetch).toHaveBeenCalledWith(
      'https://dokploy.example.com/api/application.one?applicationId=abc-123',
      expect.objectContaining({ method: 'GET' }),
    )
  })

  it('get without params sends no query string', async () => {
    const mockFetch = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: () => Promise.resolve([]),
    })
    vi.stubGlobal('fetch', mockFetch)

    await client.get('/api/project.all')

    expect(mockFetch).toHaveBeenCalledWith(
      'https://dokploy.example.com/api/project.all',
      expect.objectContaining({ method: 'GET' }),
    )
  })

  it('throws AuthError on 401', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
      ok: false, status: 401, json: () => Promise.resolve({ message: 'Unauthorized' }),
    }))

    await expect(client.get('/api/project.all')).rejects.toThrow(AuthError)
  })

  it('throws AuthError on 403', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
      ok: false, status: 403, json: () => Promise.resolve({ message: 'Forbidden' }),
    }))

    await expect(client.get('/api/project.all')).rejects.toThrow(AuthError)
  })

  it('throws NotFoundError on 404', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
      ok: false, status: 404, json: () => Promise.resolve({ message: 'Not found' }),
    }))

    await expect(client.get('/api/application.one', { applicationId: 'xyz' })).rejects.toThrow(NotFoundError)
  })

  it('throws ProviderError on 500', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
      ok: false, status: 500, json: () => Promise.resolve({ error: 'internal' }),
    }))

    await expect(client.get('/api/project.all')).rejects.toThrow(ProviderError)
  })

  it('throws ConnectionError on network failure', async () => {
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error('ECONNREFUSED')))

    await expect(client.get('/api/project.all')).rejects.toThrow(ConnectionError)
  })

  it('post sends JSON body', async () => {
    const mockFetch = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: () => Promise.resolve({ applicationId: '123' }),
    })
    vi.stubGlobal('fetch', mockFetch)

    await client.post('/api/application.create', { name: 'test', projectId: 'proj-1' })

    expect(mockFetch).toHaveBeenCalledWith(
      'https://dokploy.example.com/api/application.create',
      expect.objectContaining({
        method: 'POST',
        body: JSON.stringify({ name: 'test', projectId: 'proj-1' }),
      }),
    )
  })

  it('post without body sends no body', async () => {
    const mockFetch = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: () => Promise.resolve({}),
    })
    vi.stubGlobal('fetch', mockFetch)

    await client.post('/api/application.deploy', { applicationId: 'app-1' })

    expect(mockFetch).toHaveBeenCalledWith(
      'https://dokploy.example.com/api/application.deploy',
      expect.objectContaining({
        method: 'POST',
        body: JSON.stringify({ applicationId: 'app-1' }),
      }),
    )
  })
})
