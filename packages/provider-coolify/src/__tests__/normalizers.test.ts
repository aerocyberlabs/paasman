import { describe, expect, it } from 'vitest'
import { toApp, toDeployment, toServer, toEnvVar, toDatabase } from '../normalizers.js'

describe('Coolify normalizers', () => {
  describe('toApp', () => {
    it('normalizes a Coolify application response', () => {
      const raw = {
        uuid: 'abc-123',
        name: 'my-app',
        status: 'running',
        fqdn: 'https://app.example.com,https://www.example.com',
        created_at: '2026-01-01T00:00:00Z',
        updated_at: '2026-01-15T00:00:00Z',
        git_repository: 'https://github.com/test/repo',
        git_branch: 'main',
        build_pack: 'nixpacks',
        destination: { server: { uuid: 'srv-1' } },
      }
      const app = toApp(raw)
      expect(app.id).toBe('abc-123')
      expect(app.name).toBe('my-app')
      expect(app.status).toBe('running')
      expect(app.domains).toEqual(['https://app.example.com', 'https://www.example.com'])
      expect(app.meta.repository).toBe('https://github.com/test/repo')
      expect(app.meta.branch).toBe('main')
      expect(app.meta.buildPack).toBe('nixpacks')
      expect(app.meta.serverIds).toEqual(['srv-1'])
      expect(app.raw).toBe(raw)
    })

    it('handles null fqdn', () => {
      const raw = {
        uuid: 'x', name: 'x', status: 'stopped', fqdn: null,
        created_at: '2026-01-01T00:00:00Z', updated_at: '2026-01-01T00:00:00Z',
      }
      const app = toApp(raw)
      expect(app.domains).toEqual([])
    })

    it('maps exited status to stopped', () => {
      const raw = {
        uuid: 'x', name: 'x', status: 'exited', fqdn: null,
        created_at: '2026-01-01T00:00:00Z', updated_at: '2026-01-01T00:00:00Z',
      }
      expect(toApp(raw).status).toBe('stopped')
    })

    it('maps error status to failed', () => {
      const raw = {
        uuid: 'x', name: 'x', status: 'error', fqdn: null,
        created_at: '2026-01-01T00:00:00Z', updated_at: '2026-01-01T00:00:00Z',
      }
      expect(toApp(raw).status).toBe('failed')
    })

    it('maps unknown status to unknown', () => {
      const raw = {
        uuid: 'x', name: 'x', status: 'banana', fqdn: null,
        created_at: '2026-01-01T00:00:00Z', updated_at: '2026-01-01T00:00:00Z',
      }
      expect(toApp(raw).status).toBe('unknown')
    })
  })

  describe('toEnvVar', () => {
    it('normalizes env response with build time scope', () => {
      const raw = { key: 'DB_HOST', value: 'localhost', is_preview: false, is_build_time: true }
      const env = toEnvVar(raw)
      expect(env.key).toBe('DB_HOST')
      expect(env.value).toBe('localhost')
      expect(env.isSecret).toBe(false)
      expect(env.scope).toBe('build')
    })

    it('normalizes env response with runtime scope', () => {
      const raw = { key: 'API_KEY', value: 'secret', is_preview: false, is_build_time: false, is_hidden: true }
      const env = toEnvVar(raw)
      expect(env.key).toBe('API_KEY')
      expect(env.isSecret).toBe(true)
      expect(env.scope).toBe('runtime')
    })
  })

  describe('toServer', () => {
    it('normalizes server response', () => {
      const raw = {
        uuid: 'srv-1', name: 'prod-server', ip: '10.0.0.1',
        settings: { is_reachable: true },
        created_at: '2026-01-01T00:00:00Z', updated_at: '2026-01-01T00:00:00Z',
      }
      const server = toServer(raw)
      expect(server.id).toBe('srv-1')
      expect(server.status).toBe('reachable')
      expect(server.ip).toBe('10.0.0.1')
    })

    it('maps unreachable server', () => {
      const raw = {
        uuid: 'srv-2', name: 'down-server', ip: '10.0.0.2',
        settings: { is_reachable: false },
      }
      const server = toServer(raw)
      expect(server.status).toBe('unreachable')
    })

    it('maps unknown status when no settings', () => {
      const raw = {
        uuid: 'srv-3', name: 'mystery-server', ip: '10.0.0.3',
      }
      const server = toServer(raw)
      expect(server.status).toBe('unknown')
    })
  })

  // Task 24: toDeployment tests
  describe('toDeployment', () => {
    it('normalizes deployment with uuid', () => {
      const raw = {
        uuid: 'dep-1',
        application_uuid: 'app-1',
        status: 'finished',
        created_at: '2026-01-01T00:00:00Z',
        finished_at: '2026-01-01T00:05:00Z',
        commit: 'abc123',
        branch: 'main',
      }
      const dep = toDeployment(raw)
      expect(dep.id).toBe('dep-1')
      expect(dep.appId).toBe('app-1')
      expect(dep.status).toBe('success')
      expect(dep.meta.commit).toBe('abc123')
      expect(dep.meta.branch).toBe('main')
      expect(dep.finishedAt).toBeDefined()
    })

    it('prefers uuid over id', () => {
      const raw = {
        uuid: 'dep-uuid',
        id: 'dep-id',
        application_uuid: 'app-1',
        status: 'running',
        created_at: '2026-01-01T00:00:00Z',
      }
      expect(toDeployment(raw).id).toBe('dep-uuid')
    })

    it('falls back to id when uuid is missing', () => {
      const raw = {
        id: 'dep-id',
        application_id: 'app-id',
        status: 'building',
        created_at: '2026-01-01T00:00:00Z',
      }
      const dep = toDeployment(raw)
      expect(dep.id).toBe('dep-id')
      expect(dep.appId).toBe('app-id')
      expect(dep.status).toBe('building')
    })

    it('maps various deployment statuses', () => {
      const makeRaw = (status: string) => ({
        uuid: 'x', application_uuid: 'y', status, created_at: '2026-01-01T00:00:00Z',
      })
      expect(toDeployment(makeRaw('queued')).status).toBe('queued')
      expect(toDeployment(makeRaw('in_progress')).status).toBe('queued')
      expect(toDeployment(makeRaw('building')).status).toBe('building')
      expect(toDeployment(makeRaw('running')).status).toBe('running')
      expect(toDeployment(makeRaw('finished')).status).toBe('success')
      expect(toDeployment(makeRaw('success')).status).toBe('success')
      expect(toDeployment(makeRaw('failed')).status).toBe('failed')
      expect(toDeployment(makeRaw('error')).status).toBe('failed')
      expect(toDeployment(makeRaw('cancelled')).status).toBe('cancelled')
    })
  })

  // Task 25: toDatabase tests
  describe('toDatabase', () => {
    it('normalizes database response', () => {
      const raw = {
        uuid: 'db-1',
        name: 'my-postgres',
        type: 'postgresql',
        version: '16',
        status: 'running',
        server_uuid: 'srv-1',
      }
      const db = toDatabase(raw)
      expect(db.id).toBe('db-1')
      expect(db.name).toBe('my-postgres')
      expect(db.engine).toBe('postgresql')
      expect(db.version).toBe('16')
      expect(db.status).toBe('running')
      expect(db.meta.serverId).toBe('srv-1')
      expect(db.raw).toBe(raw)
    })

    it('maps mysql type', () => {
      const raw = {
        uuid: 'db-2', name: 'my-mysql', type: 'mysql', status: 'stopped',
      }
      const db = toDatabase(raw)
      expect(db.engine).toBe('mysql')
      expect(db.status).toBe('stopped')
    })

    it('maps unknown type to other', () => {
      const raw = {
        uuid: 'db-3', name: 'my-db', type: 'cockroachdb', status: 'running',
      }
      expect(toDatabase(raw).engine).toBe('other')
    })

    it('handles missing type', () => {
      const raw = {
        uuid: 'db-4', name: 'my-db', status: 'stopped',
      }
      expect(toDatabase(raw).engine).toBe('other')
    })
  })
})
