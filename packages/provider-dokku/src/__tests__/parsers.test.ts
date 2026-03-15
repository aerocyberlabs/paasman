import { describe, expect, it } from 'vitest'
import {
  parseAppsList, parseAppReport, parseConfigShow, parseConfigExport,
  parseDatabaseList, parseDatabaseInfo, parseLogLines,
} from '../parsers.js'

describe('Dokku parsers', () => {
  describe('parseAppsList', () => {
    it('parses standard apps:list output', () => {
      const output = `=====> My Apps
app1
app2
app3`
      expect(parseAppsList(output)).toEqual(['app1', 'app2', 'app3'])
    })

    it('handles empty app list', () => {
      const output = '=====> My Apps'
      expect(parseAppsList(output)).toEqual([])
    })

    it('handles blank lines', () => {
      const output = `=====> My Apps

app1

app2
`
      expect(parseAppsList(output)).toEqual(['app1', 'app2'])
    })

    it('trims whitespace from app names', () => {
      const output = `=====> My Apps
  app1
app2`
      expect(parseAppsList(output)).toEqual(['app1', 'app2'])
    })

    it('handles output with no header', () => {
      const output = `app1
app2`
      expect(parseAppsList(output)).toEqual(['app1', 'app2'])
    })

    it('handles empty output', () => {
      expect(parseAppsList('')).toEqual([])
    })
  })

  describe('parseAppReport', () => {
    it('parses standard apps:report output', () => {
      const output = `=====> my-app app information
       App dir:             /home/dokku/my-app
       App deploy source:   git
       App locked:          false`
      const result = parseAppReport(output)
      expect(result['App dir']).toBe('/home/dokku/my-app')
      expect(result['App deploy source']).toBe('git')
      expect(result['App locked']).toBe('false')
    })

    it('handles keys with multiple colons in value', () => {
      const output = `=====> my-app app information
       Git repository:      https://github.com/user/repo.git`
      const result = parseAppReport(output)
      expect(result['Git repository']).toBe('https://github.com/user/repo.git')
    })

    it('handles empty output', () => {
      expect(parseAppReport('')).toEqual({})
    })

    it('handles header-only output', () => {
      const output = '=====> my-app app information'
      expect(parseAppReport(output)).toEqual({})
    })

    it('handles running status', () => {
      const output = `=====> my-app app information
       App running:         true
       App deploy status:   completed`
      const result = parseAppReport(output)
      expect(result['App running']).toBe('true')
      expect(result['App deploy status']).toBe('completed')
    })
  })

  describe('parseConfigShow', () => {
    it('parses standard config:show output', () => {
      const output = `=====> my-app env vars
DATABASE_URL:   postgres://localhost/mydb
SECRET_KEY:     abc123`
      const result = parseConfigShow(output)
      expect(result['DATABASE_URL']).toBe('postgres://localhost/mydb')
      expect(result['SECRET_KEY']).toBe('abc123')
    })

    it('handles values with colons', () => {
      const output = `=====> my-app env vars
DATABASE_URL:   postgres://user:pass@host:5432/db`
      const result = parseConfigShow(output)
      expect(result['DATABASE_URL']).toBe('postgres://user:pass@host:5432/db')
    })

    it('handles empty config', () => {
      const output = '=====> my-app env vars'
      expect(parseConfigShow(output)).toEqual({})
    })

    it('handles empty output', () => {
      expect(parseConfigShow('')).toEqual({})
    })

    it('handles single env var', () => {
      const output = `=====> my-app env vars
PORT:   5000`
      const result = parseConfigShow(output)
      expect(result).toEqual({ PORT: '5000' })
    })

    it('handles values with spaces', () => {
      const output = `=====> my-app env vars
APP_NAME:   My Cool App`
      const result = parseConfigShow(output)
      expect(result['APP_NAME']).toBe('My Cool App')
    })
  })

  describe('parseConfigExport', () => {
    it('parses standard config:export output', () => {
      const output = `DATABASE_URL=postgres://localhost/mydb
SECRET_KEY=abc123`
      const result = parseConfigExport(output)
      expect(result['DATABASE_URL']).toBe('postgres://localhost/mydb')
      expect(result['SECRET_KEY']).toBe('abc123')
    })

    it('handles values with equals signs', () => {
      const output = 'QUERY=foo=bar&baz=qux'
      const result = parseConfigExport(output)
      expect(result['QUERY']).toBe('foo=bar&baz=qux')
    })

    it('handles empty output', () => {
      expect(parseConfigExport('')).toEqual({})
    })

    it('handles blank lines', () => {
      const output = `KEY1=val1

KEY2=val2
`
      const result = parseConfigExport(output)
      expect(result).toEqual({ KEY1: 'val1', KEY2: 'val2' })
    })

    it('handles empty values', () => {
      const output = 'EMPTY_VAR='
      const result = parseConfigExport(output)
      expect(result['EMPTY_VAR']).toBe('')
    })
  })

  describe('parseDatabaseList', () => {
    it('parses standard database list output', () => {
      const output = `=====> Postgres services
my-db
other-db`
      expect(parseDatabaseList(output)).toEqual(['my-db', 'other-db'])
    })

    it('handles empty list', () => {
      const output = '=====> Postgres services'
      expect(parseDatabaseList(output)).toEqual([])
    })

    it('handles empty output', () => {
      expect(parseDatabaseList('')).toEqual([])
    })
  })

  describe('parseDatabaseInfo', () => {
    it('parses standard database info output', () => {
      const output = `=====> my-db postgres information
       Config dir:          /var/lib/dokku/services/postgres/my-db/config
       Data dir:            /var/lib/dokku/services/postgres/my-db/data
       Dsn:                 postgres://postgres:abc123@dokku-postgres-my-db:5432/my-db
       Exposed ports:       -
       Internal ip:         172.17.0.3
       Links:               my-app
       Service root dir:    /var/lib/dokku/services/postgres/my-db
       Status:              running
       Version:             postgres:16.1`
      const result = parseDatabaseInfo(output)
      expect(result['Status']).toBe('running')
      expect(result['Version']).toBe('postgres:16.1')
      expect(result['Internal ip']).toBe('172.17.0.3')
      expect(result['Links']).toBe('my-app')
    })

    it('handles empty output', () => {
      expect(parseDatabaseInfo('')).toEqual({})
    })

    it('handles DSN with multiple colons', () => {
      const output = `=====> my-db info
       Dsn:                 postgres://user:pass@host:5432/db`
      const result = parseDatabaseInfo(output)
      expect(result['Dsn']).toBe('postgres://user:pass@host:5432/db')
    })
  })

  describe('parseLogLines', () => {
    it('parses log lines with timestamps', () => {
      const output = `2026-01-15T10:30:00.000Z app[web.1]: Starting server
2026-01-15T10:30:01.000Z app[web.1]: Server running`
      const lines = parseLogLines(output)
      expect(lines).toHaveLength(2)
      expect(lines[0].timestamp).toBe('2026-01-15T10:30:00.000Z')
      expect(lines[0].message).toBe('app[web.1]: Starting server')
      expect(lines[1].message).toBe('app[web.1]: Server running')
    })

    it('parses log lines without timestamps', () => {
      const output = `Starting server on port 5000
Server running`
      const lines = parseLogLines(output)
      expect(lines).toHaveLength(2)
      expect(lines[0].timestamp).toBeUndefined()
      expect(lines[0].message).toBe('Starting server on port 5000')
    })

    it('handles empty output', () => {
      expect(parseLogLines('')).toEqual([])
    })

    it('handles mixed lines', () => {
      const output = `2026-01-15T10:30:00.000Z Starting server
No timestamp here`
      const lines = parseLogLines(output)
      expect(lines).toHaveLength(2)
      expect(lines[0].timestamp).toBe('2026-01-15T10:30:00.000Z')
      expect(lines[1].timestamp).toBeUndefined()
    })

    it('all lines default to stdout stream', () => {
      const output = 'line1\nline2'
      const lines = parseLogLines(output)
      expect(lines[0].stream).toBe('stdout')
      expect(lines[1].stream).toBe('stdout')
    })

    it('filters empty lines', () => {
      const output = `line1

line2
`
      const lines = parseLogLines(output)
      expect(lines).toHaveLength(2)
    })
  })
})
