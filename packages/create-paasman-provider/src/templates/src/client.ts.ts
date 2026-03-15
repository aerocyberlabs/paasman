export function clientTemplate(vars: { name: string }): string {
  const Name = vars.name.charAt(0).toUpperCase() + vars.name.slice(1)
  return `import {
  AuthError, ConnectionError, NotFoundError, ConflictError,
  RateLimitError, ProviderError,
} from '@paasman/core'

export class ${Name}Client {
  constructor(
    private readonly baseUrl: string,
    private readonly token: string,
  ) {}

  private async request<T>(path: string, options: RequestInit = {}): Promise<T> {
    const url = \`\${this.baseUrl}\${path}\`
    const headers: Record<string, string> = {
      Authorization: \`Bearer \${this.token}\`,
      'Content-Type': 'application/json',
      Accept: 'application/json',
      ...((options.headers as Record<string, string>) ?? {}),
    }

    let res: Response
    try {
      res = await fetch(url, { ...options, headers })
    } catch (err) {
      throw new ConnectionError('${vars.name}', this.baseUrl, err as Error)
    }

    if (res.ok) {
      return res.json() as Promise<T>
    }

    const body = await res.json().catch(() => ({}))

    switch (res.status) {
      case 401:
      case 403:
        throw new AuthError('${vars.name}')
      case 404:
        throw new NotFoundError('resource', path, '${vars.name}')
      case 409:
        throw new ConflictError(body.message ?? 'Conflict', '${vars.name}')
      case 429: {
        const retry = res.headers.get('retry-after')
        throw new RateLimitError('${vars.name}', retry ? Number(retry) * 1000 : undefined)
      }
      default:
        throw new ProviderError('${vars.name}', res.status, body)
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

  async patch<T>(path: string, data: unknown): Promise<T> {
    return this.request<T>(path, {
      method: 'PATCH',
      body: JSON.stringify(data),
    })
  }

  async del<T>(path: string): Promise<T> {
    return this.request<T>(path, { method: 'DELETE' })
  }
}
`
}
