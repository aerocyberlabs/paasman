/**
 * Parsers for Dokku CLI output.
 *
 * Dokku commands return unstructured text. These functions parse that text
 * into structured data suitable for the normalizers.
 */

/**
 * Parse `apps:list` output.
 *
 * Example output:
 * ```
 * =====> My Apps
 * app1
 * app2
 * app3
 * ```
 */
export function parseAppsList(output: string): string[] {
  return output
    .split('\n')
    .filter((line) => !line.startsWith('===') && line.trim() !== '')
    .map((line) => line.trim())
}

/**
 * Parse `apps:report <app>` output.
 *
 * Example output:
 * ```
 * =====> my-app app information
 *        App dir:             /home/dokku/my-app
 *        App deploy source:   git
 *        App locked:          false
 * ```
 */
export function parseAppReport(output: string): Record<string, string> {
  const result: Record<string, string> = {}

  for (const line of output.split('\n')) {
    if (line.startsWith('===')) continue
    const trimmed = line.trim()
    if (!trimmed) continue

    // Lines are formatted as "Key:   value" with variable whitespace
    const colonIndex = trimmed.indexOf(':')
    if (colonIndex === -1) continue

    const key = trimmed.slice(0, colonIndex).trim()
    const value = trimmed.slice(colonIndex + 1).trim()
    result[key] = value
  }

  return result
}

/**
 * Parse `config:show <app>` output.
 *
 * Example output:
 * ```
 * =====> my-app env vars
 * DATABASE_URL:   postgres://localhost/mydb
 * SECRET_KEY:     abc123
 * ```
 */
export function parseConfigShow(output: string): Record<string, string> {
  const result: Record<string, string> = {}

  for (const line of output.split('\n')) {
    if (line.startsWith('===')) continue
    const trimmed = line.trim()
    if (!trimmed) continue

    // Format: "KEY:   value" — first colon is the separator
    const colonIndex = trimmed.indexOf(':')
    if (colonIndex === -1) continue

    const key = trimmed.slice(0, colonIndex).trim()
    const value = trimmed.slice(colonIndex + 1).trim()
    if (key) {
      result[key] = value
    }
  }

  return result
}

/**
 * Parse `config:export <app>` output.
 *
 * Example output (no header):
 * ```
 * DATABASE_URL=postgres://localhost/mydb
 * SECRET_KEY=abc123
 * ```
 */
export function parseConfigExport(output: string): Record<string, string> {
  const result: Record<string, string> = {}

  for (const line of output.split('\n')) {
    const trimmed = line.trim()
    if (!trimmed) continue

    const eqIndex = trimmed.indexOf('=')
    if (eqIndex === -1) continue

    const key = trimmed.slice(0, eqIndex)
    const value = trimmed.slice(eqIndex + 1)
    if (key) {
      result[key] = value
    }
  }

  return result
}

/**
 * Parse `postgres:list` / `mysql:list` / `redis:list` output.
 *
 * Example output:
 * ```
 * =====> Postgres services
 * my-db
 * other-db
 * ```
 */
export function parseDatabaseList(output: string): string[] {
  return output
    .split('\n')
    .filter((line) => !line.startsWith('===') && line.trim() !== '')
    .map((line) => line.trim())
}

/**
 * Parse `postgres:info <name>` / `mysql:info <name>` output.
 *
 * Example output:
 * ```
 * =====> my-db postgres information
 *        Config dir:          /var/lib/dokku/services/postgres/my-db/config
 *        Data dir:            /var/lib/dokku/services/postgres/my-db/data
 *        Dsn:                 postgres://postgres:abc123@dokku-postgres-my-db:5432/my-db
 *        Exposed ports:       -
 *        Internal ip:         172.17.0.3
 *        Links:               my-app
 *        Service root dir:    /var/lib/dokku/services/postgres/my-db
 *        Status:              running
 *        Version:             postgres:16.1
 * ```
 */
export function parseDatabaseInfo(output: string): Record<string, string> {
  const result: Record<string, string> = {}

  for (const line of output.split('\n')) {
    if (line.startsWith('===')) continue
    const trimmed = line.trim()
    if (!trimmed) continue

    const colonIndex = trimmed.indexOf(':')
    if (colonIndex === -1) continue

    const key = trimmed.slice(0, colonIndex).trim()
    const value = trimmed.slice(colonIndex + 1).trim()
    result[key] = value
  }

  return result
}

/**
 * Parse Dokku log output. Each line may be prefixed with a timestamp.
 *
 * Example output:
 * ```
 * 2026-01-15T10:30:00.000Z app[web.1]: Starting server on port 5000
 * 2026-01-15T10:30:01.000Z app[web.1]: Server running
 * ```
 */
export function parseLogLines(output: string): Array<{
  timestamp?: string
  message: string
  stream: 'stdout' | 'stderr'
}> {
  if (!output.trim()) return []

  return output.split('\n').filter((line) => line.trim() !== '').map((line) => {
    // Try to extract timestamp from the beginning of the line
    // Dokku log format: "2026-01-15T10:30:00.000Z app[web.1]: message"
    const isoMatch = line.match(/^(\d{4}-\d{2}-\d{2}T[\d:.]+Z?)\s+(.*)$/)
    if (isoMatch) {
      return {
        timestamp: isoMatch[1],
        message: isoMatch[2],
        stream: 'stdout' as const,
      }
    }

    return {
      message: line,
      stream: 'stdout' as const,
    }
  })
}
