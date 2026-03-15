import { describe, expect, it } from 'vitest'
import { toApp, toEnvVar, toDatabase, toLogLine } from '../normalizers.js'

describe('Dokku normalizers', () => {
  describe('toApp', () => {
    it('normalizes a running app', () => {
      const report = {
        'App dir': '/home/dokku/my-app',
        'App deploy source': 'git',
        'App locked': 'false',
        'App running': 'true',
        'App created at': '2026-01-01T00:00:00Z',
        'App updated at': '2026-01-15T00:00:00Z',
        'App git repository': 'https://github.com/test/repo',
        'App git branch': 'main',
      }
      const app = toApp('my-app', report)
      expect(app.id).toBe('my-app')
      expect(app.name).toBe('my-app')
      expect(app.status).toBe('running')
      expect(app.domains).toEqual([])
      expect(app.meta.repository).toBe('https://github.com/test/repo')
      expect(app.meta.branch).toBe('main')
      expect(app.meta.buildPack).toBe('git')
      expect(app.raw).toBe(report)
    })

    it('normalizes a stopped app', () => {
      const report = {
        'App running': 'false',
        'App deploy status': 'completed',
      }
      const app = toApp('stopped-app', report)
      expect(app.status).toBe('stopped')
    })

    it('normalizes a failed app', () => {
      const report = {
        'App running': 'false',
        'App deploy status': 'failed',
      }
      const app = toApp('failed-app', report)
      expect(app.status).toBe('failed')
    })

    it('handles unknown status', () => {
      const report = {}
      const app = toApp('unknown-app', report)
      expect(app.status).toBe('unknown')
    })

    it('uses name as id', () => {
      const app = toApp('test-app', {})
      expect(app.id).toBe('test-app')
      expect(app.name).toBe('test-app')
    })

    it('handles alternative key names', () => {
      const report = {
        'Running': 'true',
        'Git repository': 'https://github.com/user/repo',
        'Git branch': 'develop',
        'Deploy source': 'docker',
        'Created at': '2026-03-01T00:00:00Z',
        'Updated at': '2026-03-10T00:00:00Z',
      }
      const app = toApp('alt-app', report)
      expect(app.status).toBe('running')
      expect(app.meta.repository).toBe('https://github.com/user/repo')
      expect(app.meta.branch).toBe('develop')
      expect(app.meta.buildPack).toBe('docker')
    })
  })

  describe('toEnvVar', () => {
    it('creates an env var with key and value', () => {
      const env = toEnvVar('DATABASE_URL', 'postgres://localhost/mydb')
      expect(env.key).toBe('DATABASE_URL')
      expect(env.value).toBe('postgres://localhost/mydb')
      expect(env.isSecret).toBe(false)
      expect(env.scope).toBe('runtime')
    })

    it('handles empty value', () => {
      const env = toEnvVar('EMPTY', '')
      expect(env.key).toBe('EMPTY')
      expect(env.value).toBe('')
    })
  })

  describe('toDatabase', () => {
    it('normalizes a running postgres database', () => {
      const info = {
        'Status': 'running',
        'Version': 'postgres:16.1',
        'Internal ip': '172.17.0.3',
      }
      const db = toDatabase('my-db', 'postgres', info)
      expect(db.id).toBe('my-db')
      expect(db.name).toBe('my-db')
      expect(db.engine).toBe('postgresql')
      expect(db.version).toBe('postgres:16.1')
      expect(db.status).toBe('running')
      expect(db.raw).toBe(info)
    })

    it('normalizes a stopped mysql database', () => {
      const info = { 'Status': 'stopped', 'Version': 'mysql:8.0' }
      const db = toDatabase('my-mysql', 'mysql', info)
      expect(db.engine).toBe('mysql')
      expect(db.status).toBe('stopped')
    })

    it('normalizes redis', () => {
      const db = toDatabase('my-redis', 'redis', { 'Status': 'running' })
      expect(db.engine).toBe('redis')
    })

    it('normalizes mongo', () => {
      const db = toDatabase('my-mongo', 'mongo', {})
      expect(db.engine).toBe('mongodb')
    })

    it('normalizes mariadb', () => {
      const db = toDatabase('my-maria', 'mariadb', {})
      expect(db.engine).toBe('mariadb')
    })

    it('maps unknown engine to other', () => {
      const db = toDatabase('my-db', 'cockroachdb', {})
      expect(db.engine).toBe('other')
    })

    it('handles missing info', () => {
      const db = toDatabase('my-db', 'postgres', {})
      expect(db.status).toBe('unknown')
      expect(db.version).toBeUndefined()
    })
  })

  describe('toLogLine', () => {
    it('normalizes a log line with timestamp', () => {
      const line = toLogLine({
        timestamp: '2026-01-15T10:30:00.000Z',
        message: 'Starting server',
        stream: 'stdout',
      })
      expect(line.timestamp).toEqual(new Date('2026-01-15T10:30:00.000Z'))
      expect(line.message).toBe('Starting server')
      expect(line.stream).toBe('stdout')
    })

    it('normalizes a log line without timestamp', () => {
      const line = toLogLine({
        message: 'No timestamp here',
        stream: 'stdout',
      })
      expect(line.timestamp).toBeUndefined()
      expect(line.message).toBe('No timestamp here')
    })
  })
})
