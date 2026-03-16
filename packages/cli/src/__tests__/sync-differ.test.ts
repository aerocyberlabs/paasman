import { describe, expect, it } from 'vitest'
import { computeSyncPlan, planIsEmpty, type CurrentState } from '../sync/differ.js'
import type { PaasmanYaml } from '../sync/parser.js'
import type { App, Database } from '@paasman/core'

function makeApp(overrides: Partial<App> & { name: string }): App {
	return {
		id: overrides.id ?? `id-${overrides.name}`,
		name: overrides.name,
		status: overrides.status ?? 'running',
		domains: overrides.domains ?? [],
		createdAt: new Date(),
		updatedAt: new Date(),
		meta: overrides.meta ?? {},
		raw: {},
	}
}

function makeDb(overrides: Partial<Database> & { name: string; engine: Database['engine'] }): Database {
	return {
		id: overrides.id ?? `id-${overrides.name}`,
		name: overrides.name,
		engine: overrides.engine,
		version: overrides.version,
		status: overrides.status ?? 'running',
		meta: overrides.meta ?? {},
		raw: {},
	}
}

describe('computeSyncPlan', () => {
	it('marks all apps and dbs as create when current is empty', () => {
		const desired: PaasmanYaml = {
			profile: 'prod',
			apps: {
				'my-api': {
					source: { type: 'git', repository: 'https://github.com/user/api', branch: 'main' },
					domains: ['api.example.com'],
					env: { NODE_ENV: 'production' },
				},
			},
			databases: {
				'main-db': { engine: 'postgresql', version: '16' },
			},
		}
		const current: CurrentState = { apps: [], databases: [], appEnvs: {} }

		const plan = computeSyncPlan(desired, current)

		expect(plan.apps.create).toHaveLength(1)
		expect(plan.apps.create[0].name).toBe('my-api')
		expect(plan.apps.update).toHaveLength(0)
		expect(plan.apps.unchanged).toHaveLength(0)
		expect(plan.apps.orphaned).toHaveLength(0)
		expect(plan.databases.create).toHaveLength(1)
		expect(plan.databases.create[0].name).toBe('main-db')
	})

	it('marks matching apps as unchanged when config matches current', () => {
		const desired: PaasmanYaml = {
			apps: {
				'my-api': {
					source: { type: 'git', repository: 'https://github.com/user/api', branch: 'main' },
					domains: ['api.example.com'],
					env: { NODE_ENV: 'production' },
				},
			},
			databases: {},
		}
		const current: CurrentState = {
			apps: [
				makeApp({
					name: 'my-api',
					domains: ['api.example.com'],
					meta: { repository: 'https://github.com/user/api', branch: 'main' },
				}),
			],
			databases: [],
			appEnvs: { 'my-api': { NODE_ENV: 'production' } },
		}

		const plan = computeSyncPlan(desired, current)

		expect(plan.apps.create).toHaveLength(0)
		expect(plan.apps.update).toHaveLength(0)
		expect(plan.apps.unchanged).toEqual(['my-api'])
	})

	it('detects env var changes as updates', () => {
		const desired: PaasmanYaml = {
			apps: {
				'my-api': {
					source: { type: 'git', repository: 'https://github.com/user/api', branch: 'main' },
					env: { NODE_ENV: 'production', NEW_VAR: 'hello' },
				},
			},
			databases: {},
		}
		const current: CurrentState = {
			apps: [
				makeApp({
					name: 'my-api',
					meta: { repository: 'https://github.com/user/api', branch: 'main' },
				}),
			],
			databases: [],
			appEnvs: { 'my-api': { NODE_ENV: 'development', OLD_VAR: 'bye' } },
		}

		const plan = computeSyncPlan(desired, current)

		expect(plan.apps.update).toHaveLength(1)
		expect(plan.apps.update[0].name).toBe('my-api')
		expect(plan.apps.update[0].changes).toContain('env NODE_ENV: development -> production')
		expect(plan.apps.update[0].changes).toContain('env +NEW_VAR')
		expect(plan.apps.update[0].changes).toContain('env -OLD_VAR')
	})

	it('detects source repository changes', () => {
		const desired: PaasmanYaml = {
			apps: {
				'my-api': {
					source: { type: 'git', repository: 'https://github.com/user/api-v2', branch: 'main' },
				},
			},
			databases: {},
		}
		const current: CurrentState = {
			apps: [
				makeApp({
					name: 'my-api',
					meta: { repository: 'https://github.com/user/api', branch: 'main' },
				}),
			],
			databases: [],
			appEnvs: {},
		}

		const plan = computeSyncPlan(desired, current)

		expect(plan.apps.update).toHaveLength(1)
		expect(plan.apps.update[0].changes).toContain(
			'repository: https://github.com/user/api -> https://github.com/user/api-v2',
		)
	})

	it('detects branch changes', () => {
		const desired: PaasmanYaml = {
			apps: {
				'my-api': {
					source: { type: 'git', repository: 'https://github.com/user/api', branch: 'develop' },
				},
			},
			databases: {},
		}
		const current: CurrentState = {
			apps: [
				makeApp({
					name: 'my-api',
					meta: { repository: 'https://github.com/user/api', branch: 'main' },
				}),
			],
			databases: [],
			appEnvs: {},
		}

		const plan = computeSyncPlan(desired, current)

		expect(plan.apps.update).toHaveLength(1)
		expect(plan.apps.update[0].changes).toContain('branch: main -> develop')
	})

	it('detects image changes', () => {
		const desired: PaasmanYaml = {
			apps: {
				web: {
					source: { type: 'image', image: 'nginx:1.25' },
				},
			},
			databases: {},
		}
		const current: CurrentState = {
			apps: [
				makeApp({
					name: 'web',
					meta: { image: 'nginx:1.24' },
				}),
			],
			databases: [],
			appEnvs: {},
		}

		const plan = computeSyncPlan(desired, current)

		expect(plan.apps.update).toHaveLength(1)
		expect(plan.apps.update[0].changes).toContain('image: nginx:1.24 -> nginx:1.25')
	})

	it('detects domain additions and removals', () => {
		const desired: PaasmanYaml = {
			apps: {
				web: {
					source: { type: 'image', image: 'nginx:latest' },
					domains: ['new.example.com', 'shared.example.com'],
				},
			},
			databases: {},
		}
		const current: CurrentState = {
			apps: [
				makeApp({
					name: 'web',
					domains: ['old.example.com', 'shared.example.com'],
					meta: { image: 'nginx:latest' },
				}),
			],
			databases: [],
			appEnvs: {},
		}

		const plan = computeSyncPlan(desired, current)

		expect(plan.apps.update).toHaveLength(1)
		expect(plan.apps.update[0].changes).toContain('domains added: new.example.com')
		expect(plan.apps.update[0].changes).toContain('domains removed: old.example.com')
	})

	it('finds orphaned apps and databases', () => {
		const desired: PaasmanYaml = {
			apps: { 'my-api': { source: { type: 'image', image: 'node:20' } } },
			databases: {},
		}
		const current: CurrentState = {
			apps: [
				makeApp({ name: 'my-api', meta: { image: 'node:20' } }),
				makeApp({ name: 'old-app', meta: {} }),
			],
			databases: [makeDb({ name: 'legacy-db', engine: 'mysql' })],
			appEnvs: {},
		}

		const plan = computeSyncPlan(desired, current)

		expect(plan.apps.orphaned).toEqual(['old-app'])
		expect(plan.databases.orphaned).toEqual(['legacy-db'])
	})

	it('marks matching databases as unchanged', () => {
		const desired: PaasmanYaml = {
			apps: {},
			databases: { 'main-db': { engine: 'postgresql', version: '16' } },
		}
		const current: CurrentState = {
			apps: [],
			databases: [makeDb({ name: 'main-db', engine: 'postgresql', version: '16' })],
			appEnvs: {},
		}

		// databases don't have deep update detection, just create vs unchanged
		const plan = computeSyncPlan(desired, current)

		expect(plan.databases.create).toHaveLength(0)
		expect(plan.databases.unchanged).toEqual(['main-db'])
	})

	it('handles complex mixed scenario', () => {
		const desired: PaasmanYaml = {
			apps: {
				'api': { source: { type: 'git', repository: 'https://github.com/user/api', branch: 'main' } },
				'web': { source: { type: 'image', image: 'nginx:latest' } },
				'new-service': { source: { type: 'image', image: 'redis:7' } },
			},
			databases: {
				'main-db': { engine: 'postgresql' },
				'new-cache': { engine: 'redis' },
			},
		}
		const current: CurrentState = {
			apps: [
				makeApp({ name: 'api', meta: { repository: 'https://github.com/user/api', branch: 'main' } }),
				makeApp({ name: 'web', meta: { image: 'nginx:1.24' } }),
				makeApp({ name: 'deprecated-worker', meta: {} }),
			],
			databases: [
				makeDb({ name: 'main-db', engine: 'postgresql' }),
				makeDb({ name: 'old-db', engine: 'mysql' }),
			],
			appEnvs: {},
		}

		const plan = computeSyncPlan(desired, current)

		expect(plan.apps.create.map((a) => a.name)).toEqual(['new-service'])
		expect(plan.apps.update.map((a) => a.name)).toEqual(['web'])
		expect(plan.apps.unchanged).toEqual(['api'])
		expect(plan.apps.orphaned).toEqual(['deprecated-worker'])
		expect(plan.databases.create.map((d) => d.name)).toEqual(['new-cache'])
		expect(plan.databases.unchanged).toEqual(['main-db'])
		expect(plan.databases.orphaned).toEqual(['old-db'])
	})
})

describe('planIsEmpty', () => {
	it('returns true when nothing to do', () => {
		const plan = computeSyncPlan(
			{ apps: { api: { source: { type: 'image', image: 'node:20' } } }, databases: {} },
			{
				apps: [makeApp({ name: 'api', meta: { image: 'node:20' } })],
				databases: [],
				appEnvs: {},
			},
		)
		expect(planIsEmpty(plan)).toBe(true)
	})

	it('returns false when there are creates', () => {
		const plan = computeSyncPlan(
			{ apps: { api: { source: { type: 'image', image: 'node:20' } } }, databases: {} },
			{ apps: [], databases: [], appEnvs: {} },
		)
		expect(planIsEmpty(plan)).toBe(false)
	})

	it('returns false when there are orphaned resources', () => {
		const plan = computeSyncPlan(
			{ apps: {}, databases: {} },
			{
				apps: [makeApp({ name: 'stale', meta: {} })],
				databases: [],
				appEnvs: {},
			},
		)
		expect(planIsEmpty(plan)).toBe(false)
	})
})
