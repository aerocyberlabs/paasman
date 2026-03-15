import { describe, expect, it } from 'vitest'
import { toApp, toServer, toEnvVar } from '../normalizers.js'

describe('CapRover normalizers', () => {
  describe('toApp', () => {
    it('normalizes a CapRover app definition', () => {
      const raw = {
        appName: 'my-app',
        instanceCount: 1,
        envVars: [{ key: 'NODE_ENV', value: 'production' }],
        customDomain: [{ publicDomain: 'app.example.com' }],
        notExposeAsWebApp: false,
        containerHttpPort: 3000,
        deployedVersion: 5,
      }
      const app = toApp(raw)
      expect(app.id).toBe('my-app')
      expect(app.name).toBe('my-app')
      expect(app.status).toBe('running')
      expect(app.domains).toEqual(['app.example.com'])
      expect(app.meta.image).toBe('img-5')
      expect(app.raw).toBe(raw)
    })

    it('maps instanceCount 0 to stopped', () => {
      const raw = {
        appName: 'stopped-app',
        instanceCount: 0,
        customDomain: [],
      }
      expect(toApp(raw).status).toBe('stopped')
    })

    it('handles missing customDomain', () => {
      const raw = {
        appName: 'no-domain',
        instanceCount: 1,
      }
      const app = toApp(raw)
      expect(app.domains).toEqual([])
    })

    it('maps unknown instanceCount to unknown status', () => {
      const raw = {
        appName: 'unknown-app',
      }
      expect(toApp(raw).status).toBe('unknown')
    })

    it('handles multiple custom domains', () => {
      const raw = {
        appName: 'multi',
        instanceCount: 1,
        customDomain: [
          { publicDomain: 'a.example.com' },
          { publicDomain: 'b.example.com' },
        ],
      }
      expect(toApp(raw).domains).toEqual(['a.example.com', 'b.example.com'])
    })
  })

  describe('toServer', () => {
    it('normalizes a cluster node', () => {
      const raw = {
        nodeId: 'node-abc',
        hostname: 'captain-01',
        ip: '10.0.0.1',
        isLeader: true,
        state: 'ready',
      }
      const server = toServer(raw)
      expect(server.id).toBe('node-abc')
      expect(server.name).toBe('captain-01')
      expect(server.status).toBe('reachable')
      expect(server.ip).toBe('10.0.0.1')
      expect(server.meta.provider).toBe('leader')
    })

    it('maps worker node', () => {
      const raw = {
        nodeId: 'node-def',
        hostname: 'worker-01',
        ip: '10.0.0.2',
        isLeader: false,
        state: 'ready',
      }
      const server = toServer(raw)
      expect(server.meta.provider).toBe('worker')
    })

    it('maps down state to unreachable', () => {
      const raw = {
        nodeId: 'node-down',
        hostname: 'down-node',
        ip: '10.0.0.3',
        state: 'down',
      }
      expect(toServer(raw).status).toBe('unreachable')
    })

    it('maps unknown state', () => {
      const raw = {
        nodeId: 'node-x',
        hostname: 'mystery',
        ip: '10.0.0.4',
        state: 'draining',
      }
      expect(toServer(raw).status).toBe('unknown')
    })

    it('handles missing ip', () => {
      const raw = {
        nodeId: 'node-no-ip',
        hostname: 'no-ip',
        state: 'ready',
      }
      expect(toServer(raw).ip).toBe('0.0.0.0')
    })
  })

  describe('toEnvVar', () => {
    it('normalizes an env var entry', () => {
      const env = toEnvVar({ key: 'DB_HOST', value: 'localhost' })
      expect(env.key).toBe('DB_HOST')
      expect(env.value).toBe('localhost')
      expect(env.isSecret).toBe(false)
    })
  })
})
