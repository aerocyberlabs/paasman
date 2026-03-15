export type ErrorCode =
  | 'AUTH_FAILED'
  | 'CONNECTION_FAILED'
  | 'NOT_FOUND'
  | 'CONFLICT'
  | 'RATE_LIMITED'
  | 'UNSUPPORTED'
  | 'VALIDATION'
  | 'PROVIDER_ERROR'
  | 'TIMEOUT'

export class PaasmanError extends Error {
  constructor(
    message: string,
    public readonly code: ErrorCode,
    public readonly provider?: string,
    public override readonly cause?: Error,
  ) {
    super(message)
    this.name = 'PaasmanError'
  }
}

export class AuthError extends PaasmanError {
  constructor(provider: string, cause?: Error) {
    super('Authentication failed', 'AUTH_FAILED', provider, cause)
    this.name = 'AuthError'
  }
}

export class ConnectionError extends PaasmanError {
  constructor(provider: string, url: string, cause?: Error) {
    super(`Cannot connect to ${provider} at ${url}`, 'CONNECTION_FAILED', provider, cause)
    this.name = 'ConnectionError'
  }
}

export class NotFoundError extends PaasmanError {
  constructor(resource: string, id: string, provider: string) {
    super(`${resource} '${id}' not found`, 'NOT_FOUND', provider)
    this.name = 'NotFoundError'
  }
}

export class ConflictError extends PaasmanError {
  constructor(message: string, provider: string) {
    super(message, 'CONFLICT', provider)
    this.name = 'ConflictError'
  }
}

export class RateLimitError extends PaasmanError {
  constructor(
    provider: string,
    public readonly retryAfterMs?: number,
  ) {
    super('Rate limit exceeded', 'RATE_LIMITED', provider)
    this.name = 'RateLimitError'
  }
}

export class UnsupportedError extends PaasmanError {
  constructor(operation: string, provider: string) {
    super(`'${operation}' is not supported by ${provider}`, 'UNSUPPORTED', provider)
    this.name = 'UnsupportedError'
  }
}

export class ValidationError extends PaasmanError {
  constructor(
    message: string,
    public readonly fields?: Record<string, string>,
  ) {
    super(message, 'VALIDATION')
    this.name = 'ValidationError'
  }
}

export class ProviderError extends PaasmanError {
  constructor(
    provider: string,
    public readonly statusCode?: number,
    public readonly responseBody?: unknown,
    cause?: Error,
  ) {
    super(`${provider} returned an unexpected error`, 'PROVIDER_ERROR', provider, cause)
    this.name = 'ProviderError'
  }
}

export class TimeoutError extends PaasmanError {
  constructor(operation: string, provider: string, timeoutMs: number) {
    super(`'${operation}' timed out after ${timeoutMs}ms`, 'TIMEOUT', provider)
    this.name = 'TimeoutError'
  }
}
