import { describe, expect, it } from 'vitest'
import { formatAppsTable, formatJson, formatServersTable, formatDeploymentsTable, formatEnvTable, formatDatabasesTable } from '../formatters.js'
import type { App, Server, Deployment, EnvVar, Database } from '@paasman/core'

describe('formatters', () => {
	const apps: App[] = [
		{
			id: 'abc-123',
			name: 'my-app',
			status: 'running',
			domains: ['app.example.com'],
			createdAt: new Date('2026-01-01'),
			updatedAt: new Date('2026-01-15'),
			meta: {},
			raw: {},
		},
	]

	it('formatAppsTable returns a string with table content', () => {
		const output = formatAppsTable(apps)
		expect(output).toContain('my-app')
		expect(output).toContain('running')
		expect(output).toContain('abc-123')
	})

	it('formatJson returns valid JSON', () => {
		const output = formatJson(apps)
		const parsed = JSON.parse(output)
		expect(parsed).toHaveLength(1)
		expect(parsed[0].name).toBe('my-app')
	})

	it('formatServersTable returns server table', () => {
		const servers: Server[] = [
			{
				id: 'srv-001',
				name: 'web-1',
				status: 'reachable',
				ip: '10.0.0.1',
				meta: {},
				raw: {},
			},
		]
		const output = formatServersTable(servers)
		expect(output).toContain('web-1')
		expect(output).toContain('10.0.0.1')
	})

	it('formatDeploymentsTable returns deployment table', () => {
		const deploys: Deployment[] = [
			{
				id: 'dep-001',
				appId: 'app-001',
				status: 'success',
				triggeredAt: new Date('2026-01-15T10:00:00Z'),
				meta: {},
				raw: {},
			},
		]
		const output = formatDeploymentsTable(deploys)
		expect(output).toContain('dep-001')
		expect(output).toContain('success')
	})

	it('formatEnvTable masks secret values', () => {
		const envs: EnvVar[] = [
			{ key: 'DB_HOST', value: 'localhost', isSecret: false, scope: 'runtime' },
			{ key: 'DB_PASS', value: 'secret', isSecret: true, scope: 'runtime' },
		]
		const output = formatEnvTable(envs)
		expect(output).toContain('DB_HOST')
		expect(output).toContain('localhost')
		expect(output).toContain('DB_PASS')
		expect(output).toContain('********')
		expect(output).not.toContain('secret')
	})

	it('formatDatabasesTable returns database table', () => {
		const dbs: Database[] = [
			{
				id: 'db-001',
				name: 'mydb',
				engine: 'postgresql',
				version: '16',
				status: 'running',
				meta: {},
				raw: {},
			},
		]
		const output = formatDatabasesTable(dbs)
		expect(output).toContain('mydb')
		expect(output).toContain('postgresql')
	})
})
