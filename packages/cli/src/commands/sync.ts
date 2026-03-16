import { Command } from 'commander'
import { resolve } from 'node:path'
import chalk from 'chalk'
import type { Paasman } from '@paasman/core'
import { parsePaasmanYaml } from '../sync/parser.js'
import { computeSyncPlan, planIsEmpty, type CurrentState } from '../sync/differ.js'
import { executeSyncPlan } from '../sync/executor.js'

export function syncCommand(getPaasman: (profileOverride?: string) => Promise<Paasman>): Command {
	const cmd = new Command('sync')
		.description('Sync desired state from paasman.yaml to your PaaS provider')
		.option('-f, --file <path>', 'Path to config file', 'paasman.yaml')
		.option('--apply', 'Apply changes (default is dry-run)')
		.option('--prune', 'Remove remote resources not defined in config')
		.option('--profile <name>', 'Override profile from config file')
		.option('--json', 'Output plan as JSON')
		.action(async (opts) => {
			const filePath = resolve(opts.file)
			const desired = parsePaasmanYaml(filePath)

			const profileName = opts.profile ?? desired.profile
			const pm = await getPaasman(profileName)

			// Fetch current state
			const current = await fetchCurrentState(pm)

			// Compute diff
			const plan = computeSyncPlan(desired, current)

			if (opts.json) {
				console.log(JSON.stringify(plan, null, 2))
				return
			}

			// Display plan
			const providerInfo = profileName ? `'${profileName}' (${pm.providerName})` : pm.providerName
			console.log(`\nSyncing with profile ${providerInfo}\n`)

			printPlan(plan, opts.prune)

			if (planIsEmpty(plan)) {
				console.log(chalk.green('\nEverything is in sync. No changes needed.\n'))
				return
			}

			if (!opts.apply) {
				console.log(`\n${chalk.cyan('Run with --apply to execute these changes.')}\n`)
				return
			}

			// Execute
			console.log(`\n${chalk.bold('Applying changes...')}\n`)
			const result = await executeSyncPlan(plan, desired, pm, { prune: !!opts.prune })

			console.log('')
			const parts: string[] = []
			if (result.appsCreated > 0) parts.push(`${result.appsCreated} app(s) created`)
			if (result.appsUpdated > 0) parts.push(`${result.appsUpdated} app(s) updated`)
			if (result.appsDeleted > 0) parts.push(`${result.appsDeleted} app(s) deleted`)
			if (result.dbsCreated > 0) parts.push(`${result.dbsCreated} database(s) created`)
			if (result.dbsDeleted > 0) parts.push(`${result.dbsDeleted} database(s) deleted`)
			if (parts.length > 0) {
				console.log(chalk.green(`Done: ${parts.join(', ')}`))
			}
			if (result.errors.length > 0) {
				console.log(chalk.red(`\n${result.errors.length} error(s) occurred during sync.`))
			}
		})

	return cmd
}

async function fetchCurrentState(pm: Paasman): Promise<CurrentState> {
	const apps = await pm.apps.list()

	// Fetch env vars for each app
	const appEnvs: Record<string, Record<string, string>> = {}
	for (const app of apps) {
		try {
			const envVars = await pm.env.list(app.id)
			const envMap: Record<string, string> = {}
			for (const ev of envVars) {
				envMap[ev.key] = ev.value
			}
			appEnvs[app.name] = envMap
		} catch {
			// Some providers may not support listing env vars for all apps
			appEnvs[app.name] = {}
		}
	}

	let databases: import('@paasman/core').Database[] = []
	if (pm.databases) {
		try {
			databases = await pm.databases.list()
		} catch {
			// databases not supported — leave empty
		}
	}

	return { apps, databases, appEnvs }
}

function printPlan(
	plan: ReturnType<typeof computeSyncPlan>,
	prune: boolean | undefined,
): void {
	const hasApps =
		plan.apps.create.length > 0 ||
		plan.apps.update.length > 0 ||
		plan.apps.unchanged.length > 0 ||
		plan.apps.orphaned.length > 0

	const hasDbs =
		plan.databases.create.length > 0 ||
		plan.databases.unchanged.length > 0 ||
		plan.databases.orphaned.length > 0

	if (hasApps) {
		console.log(chalk.bold('Apps:'))
		for (const { name, config } of plan.apps.create) {
			console.log(chalk.green(`  + ${name} (will be created)`))
			if (config.source.type === 'git') {
				console.log(`    source: git ${config.source.repository} @ ${config.source.branch ?? 'main'}`)
			} else {
				console.log(`    source: image ${config.source.image}`)
			}
			if (config.domains?.length) {
				console.log(`    domains: ${config.domains.join(', ')}`)
			}
			if (config.env) {
				console.log(`    env: ${Object.keys(config.env).length} variable(s)`)
			}
		}
		for (const { name, changes } of plan.apps.update) {
			console.log(chalk.yellow(`  ~ ${name} (will be updated)`))
			for (const change of changes) {
				console.log(`    ${change}`)
			}
		}
		for (const name of plan.apps.unchanged) {
			console.log(chalk.gray(`  = ${name} (unchanged)`))
		}
		for (const name of plan.apps.orphaned) {
			if (prune) {
				console.log(chalk.red(`  - ${name} (will be deleted)`))
			} else {
				console.log(
					chalk.gray(`  - ${name} (exists remotely, not in config — use --prune to remove)`),
				)
			}
		}
		console.log('')
	}

	if (hasDbs) {
		console.log(chalk.bold('Databases:'))
		for (const { name, config } of plan.databases.create) {
			console.log(
				chalk.green(`  + ${name} (${config.engine}${config.version ? ` ${config.version}` : ''}, will be created)`),
			)
		}
		for (const name of plan.databases.unchanged) {
			console.log(chalk.gray(`  = ${name} (unchanged)`))
		}
		for (const name of plan.databases.orphaned) {
			if (prune) {
				console.log(chalk.red(`  - ${name} (will be deleted)`))
			} else {
				console.log(
					chalk.gray(`  - ${name} (exists remotely, not in config — use --prune to remove)`),
				)
			}
		}
		console.log('')
	}
}
