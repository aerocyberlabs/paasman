import {
  AuthError, ConnectionError, NotFoundError, ConflictError,
  RateLimitError, ProviderError,
} from '@paasman/core'

export class DokployClient {
  constructor(
    private readonly baseUrl: string,
    private readonly apiKey: string,
  ) {}

  private async request<T>(path: string, options: RequestInit = {}): Promise<T> {
    const url = `${this.baseUrl}${path}`
    const headers: Record<string, string> = {
      'x-api-key': this.apiKey,
      'Content-Type': 'application/json',
      Accept: 'application/json',
      ...((options.headers as Record<string, string>) ?? {}),
    }

    let res: Response
    try {
      res = await fetch(url, { ...options, headers })
    } catch (err) {
      throw new ConnectionError('dokploy', this.baseUrl, err as Error)
    }

    if (res.ok) {
      return res.json() as Promise<T>
    }

    const body = await res.json().catch(() => ({}))

    switch (res.status) {
      case 401:
      case 403:
        throw new AuthError('dokploy')
      case 404:
        throw new NotFoundError('resource', path, 'dokploy')
      case 409:
        throw new ConflictError(body.message ?? 'Conflict', 'dokploy')
      case 429: {
        const retry = res.headers.get('retry-after')
        throw new RateLimitError('dokploy', retry ? Number(retry) * 1000 : undefined)
      }
      default:
        throw new ProviderError('dokploy', res.status, body)
    }
  }

  async get<T>(path: string, params?: Record<string, string>): Promise<T> {
    let url = path
    if (params && Object.keys(params).length > 0) {
      const search = new URLSearchParams(params)
      url = `${path}?${search.toString()}`
    }
    return this.request<T>(url, { method: 'GET' })
  }

  async post<T>(path: string, data?: unknown): Promise<T> {
    return this.request<T>(path, {
      method: 'POST',
      body: data ? JSON.stringify(data) : undefined,
    })
  }
}
