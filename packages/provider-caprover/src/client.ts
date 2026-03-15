import {
  AuthError, ConnectionError, NotFoundError, ConflictError,
  RateLimitError, ProviderError,
} from '@paasman/core'

export interface CapRoverClientConfig {
  baseUrl: string
  password: string
}

interface CapRoverResponse<T = unknown> {
  status: number
  description: string
  data: T
}

export class CapRoverClient {
  private readonly baseUrl: string
  private readonly password: string
  private token: string | null = null

  constructor(config: CapRoverClientConfig) {
    this.baseUrl = config.baseUrl.replace(/\/+$/, '')
    this.password = config.password
  }

  private async ensureToken(): Promise<string> {
    if (this.token) return this.token

    const url = `${this.baseUrl}/api/v2/login`
    let res: Response
    try {
      res = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password: this.password }),
      })
    } catch (err) {
      throw new ConnectionError('caprover', this.baseUrl, err as Error)
    }

    if (!res.ok) {
      const body = await res.json().catch(() => ({}))
      if (res.status === 401 || res.status === 403) {
        throw new AuthError('caprover')
      }
      throw new ProviderError('caprover', res.status, body)
    }

    const json = await res.json() as CapRoverResponse<{ token: string }>
    this.token = json.data.token
    return this.token
  }

  private async request<T>(path: string, options: RequestInit = {}): Promise<T> {
    const token = await this.ensureToken()
    const url = `${this.baseUrl}${path}`
    const headers: Record<string, string> = {
      'x-captain-auth': token,
      'Content-Type': 'application/json',
      Accept: 'application/json',
      ...((options.headers as Record<string, string>) ?? {}),
    }

    let res: Response
    try {
      res = await fetch(url, { ...options, headers })
    } catch (err) {
      throw new ConnectionError('caprover', this.baseUrl, err as Error)
    }

    if (res.ok) {
      const json = await res.json() as CapRoverResponse<T>
      return json.data
    }

    const body = await res.json().catch(() => ({}))

    switch (res.status) {
      case 401:
      case 403:
        throw new AuthError('caprover')
      case 404:
        throw new NotFoundError('resource', path, 'caprover')
      case 409:
        throw new ConflictError((body as Record<string, string>).message ?? 'Conflict', 'caprover')
      case 429: {
        const retry = res.headers.get('retry-after')
        throw new RateLimitError('caprover', retry ? Number(retry) * 1000 : undefined)
      }
      default:
        throw new ProviderError('caprover', res.status, body)
    }
  }

  async get<T>(path: string): Promise<T> {
    return this.request<T>(path, { method: 'GET' })
  }

  async post<T>(path: string, data?: unknown): Promise<T> {
    return this.request<T>(path, {
      method: 'POST',
      body: data ? JSON.stringify(data) : undefined,
    })
  }
}
