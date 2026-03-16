import { describe, expect, it } from 'vitest'
import type { App } from '@paasman/core'
import { createMigrationPlan } from '../migrate/planner.js'

function makeApp(overrides: Partial<App> = {}): App {
	return {
		id: 'app-123',
		name: 'my-app',
		status: 'running',
		domains: ['app.example.com'],
		createdAt: new Date('2025-01-01'),
		updatedAt: new Date('2025-06-01'),
		meta: {
			repository: 'https://github.com/user/app',
			branch: 'main',
			buildPack: 'nixpacks',
		},
		raw: {},
		...overrides,
	}
}

describe('createMigrationPlan', () => {
	it('creates a plan with git source from app metadata', () => {
		const app = makeApp()
		const plan = createMigrationPlan(app, undefined, 'prod', 'staging')

		expect(plan.sourceProfile).toBe('prod')
		expect(plan.targetProfile).toBe('staging')
		expect(plan.createInput.name).toBe('my-app')
		expect(plan.createInput.source).toEqual({
			type: 'git',
			repository: 'https://github.com/user/app',
			branch: 'main',
		})
		expect(plan.createInput.domains).toEqual(['app.example.com'])
		expect(plan.envVars).toBeUndefined()
		expect(plan.createInput.env).toBeUndefined()
	})

	it('creates a plan with image source when app uses an image', () => {
		const app = makeApp({
			meta: { image: 'nginx:latest' },
		})
		const plan = createMigrationPlan(app, undefined, 'prod', 'staging')

		expect(plan.createInput.source).toEqual({
			type: 'image',
			image: 'nginx:latest',
		})
	})

	it('includes env vars in the plan when provided', () => {
		const app = makeApp()
		const envVars = { DB_HOST: 'localhost', SECRET: 'hunter2' }
		const plan = createMigrationPlan(app, envVars, 'prod', 'staging')

		expect(plan.envVars).toEqual(envVars)
		// env vars set separately by executor, not in createInput
		expect(plan.createInput.env).toBeUndefined()
	})

	it('warns when source and target profiles are the same', () => {
		const app = makeApp()
		const plan = createMigrationPlan(app, undefined, 'prod', 'prod')

		expect(plan.warnings).toContain(
			'Source and target profiles are the same — are you sure?',
		)
	})

	it('warns about build pack compatibility', () => {
		const app = makeApp({
			meta: { repository: 'https://github.com/user/app', buildPack: 'nixpacks' },
		})
		const plan = createMigrationPlan(app, undefined, 'prod', 'staging')

		expect(plan.warnings).toContain(
			"Source uses build pack 'nixpacks', target may not support it",
		)
	})

	it('warns about domains needing DNS reconfiguration', () => {
		const app = makeApp({ domains: ['app.example.com', 'www.example.com'] })
		const plan = createMigrationPlan(app, undefined, 'prod', 'staging')

		expect(plan.warnings).toContain(
			'Domains will need manual DNS reconfiguration',
		)
	})

	it('does not warn about domains when app has no domains', () => {
		const app = makeApp({ domains: [] })
		const plan = createMigrationPlan(app, undefined, 'prod', 'staging')

		expect(plan.warnings).not.toContain(
			'Domains will need manual DNS reconfiguration',
		)
		expect(plan.createInput.domains).toBeUndefined()
	})

	it('warns about volumes/persistent data', () => {
		const app = makeApp({ raw: { volumes: ['/data'] } })
		const plan = createMigrationPlan(app, undefined, 'prod', 'staging')

		expect(plan.warnings).toContain(
			'Source app has volumes/persistent data that cannot be migrated automatically',
		)
	})

	it('warns about persistentStorage in raw', () => {
		const app = makeApp({ raw: { persistentStorage: [{ path: '/data' }] } })
		const plan = createMigrationPlan(app, undefined, 'prod', 'staging')

		expect(plan.warnings).toContain(
			'Source app has volumes/persistent data that cannot be migrated automatically',
		)
	})

	it('warns when source cannot be determined', () => {
		const app = makeApp({ meta: {} })
		const plan = createMigrationPlan(app, undefined, 'prod', 'staging')

		expect(plan.warnings).toContain(
			'Could not determine app source — you may need to configure it manually on the target',
		)
		expect(plan.createInput.source).toEqual({
			type: 'git',
			repository: '',
			branch: 'main',
		})
	})

	it('does not warn about build pack when none is set', () => {
		const app = makeApp({ meta: { repository: 'https://github.com/user/app' } })
		const plan = createMigrationPlan(app, undefined, 'prod', 'staging')

		const buildPackWarnings = plan.warnings.filter((w) =>
			w.includes('build pack'),
		)
		expect(buildPackWarnings).toHaveLength(0)
	})

	it('accumulates multiple warnings', () => {
		const app = makeApp({
			domains: ['app.example.com'],
			meta: {
				repository: 'https://github.com/user/app',
				buildPack: 'herokuish',
			},
			raw: { volumes: ['/data'] },
		})
		const plan = createMigrationPlan(app, undefined, 'prod', 'prod')

		// Same profile, build pack, domains, volumes = 4 warnings
		expect(plan.warnings.length).toBeGreaterThanOrEqual(4)
	})
})
