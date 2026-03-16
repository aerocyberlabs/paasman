import { Command } from 'commander'
import { join } from 'node:path'
import { homedir } from 'node:os'
import chalk from 'chalk'
import { Paasman } from '@paasman/core'
import { loadConfig } from '../config.js'
import { createProvider } from './status.js'
import { createMigrationPlan } from '../migrate/planner.js'
import { executeMigration } from '../migrate/executor.js'

function formatMigrationPlan(
	plan: ReturnType<typeof createMigrationPlan>,
	sourceProviderInfo: string,
	targetProviderInfo: string,
): string {
	const lines: string[] = []

	lines.push(`\n${chalk.bold(`Migration Plan: ${plan.app.name}`)}`)
	lines.push(`  From: ${chalk.cyan(plan.sourceProfile)} (${sourceProviderInfo})`)
	lines.push(`  To:   ${chalk.cyan(plan.targetProfile)} (${targetProviderInfo})`)
	lines.push('')

	lines.push(`  ${chalk.bold('App:')} ${plan.app.name}`)
	if (plan.app.meta.repository) {
		const branch = plan.app.meta.branch ?? 'main'
		lines.push(`    source: git ${plan.app.meta.repository} @ ${branch}`)
	} else if (plan.app.meta.image) {
		lines.push(`    source: image ${plan.app.meta.image}`)
	}

	if (plan.app.domains.length > 0) {
		lines.push(
			`    domains: ${plan.app.domains.join(', ')} (will need manual DNS update)`,
		)
	}

	if (plan.envVars) {
		const keys = Object.keys(plan.envVars)
		lines.push('')
		lines.push(`  ${chalk.bold(`Environment Variables (${keys.length} vars):`)}`)
		if (keys.length <= 8) {
			lines.push(`    ${keys.join(', ')}`)
		} else {
			lines.push(`    ${keys.slice(0, 8).join(', ')}, ...`)
		}
	} else {
		lines.push('')
		lines.push(chalk.gray('  Environment Variables: (use --include-env to transfer)'))
	}

	if (plan.warnings.length > 0) {
		lines.push('')
		lines.push(`  ${chalk.yellow('Warnings:')}`)
		for (const warning of plan.warnings) {
			lines.push(`    ${chalk.yellow('-')} ${warning}`)
		}
	}

	lines.push('')
	return lines.join('\n')
}

export function migrateCommand(): Command {
	const cmd = new Command('migrate')
		.description('Migrate an app from one provider to another')
		.argument('<app-id>', 'Application ID to migrate')
		.requiredOption('--from <profile>', 'Source profile name')
		.requiredOption('--to <profile>', 'Target profile name')
		.option('--include-env', 'Transfer environment variables')
		.option('--apply', 'Execute the migration (default is dry-run)')
		.action(async (appId, opts) => {
			const configPath = join(homedir(), '.paasman', 'config.yaml')
			const config = loadConfig(configPath)

			// Validate profiles
			const sourceProfileConfig = config.profiles[opts.from]
			if (!sourceProfileConfig) {
				console.error(chalk.red(`Source profile '${opts.from}' not found`))
				process.exit(1)
			}

			const targetProfileConfig = config.profiles[opts.to]
			if (!targetProfileConfig) {
				console.error(chalk.red(`Target profile '${opts.to}' not found`))
				process.exit(1)
			}

			// Create providers
			const sourceProvider = await createProvider(sourceProfileConfig)
			if (!sourceProvider) {
				console.error(
					chalk.red(`Could not load provider '${sourceProfileConfig.provider}' for source profile`),
				)
				process.exit(1)
			}

			const targetProvider = await createProvider(targetProfileConfig)
			if (!targetProvider) {
				console.error(
					chalk.red(`Could not load provider '${targetProfileConfig.provider}' for target profile`),
				)
				process.exit(1)
			}

			// Fetch app details from source
			const sourcePaasman = new Paasman({ provider: sourceProvider })
			const app = await sourcePaasman.apps.get(appId)

			// Fetch env vars if requested
			let envVars: Record<string, string> | undefined
			if (opts.includeEnv) {
				envVars = await sourcePaasman.env.pull(appId)
			}

			// Create migration plan
			const plan = createMigrationPlan(app, envVars, opts.from, opts.to)

			const sourceInfo = `${sourceProfileConfig.provider} @ ${sourceProfileConfig.url}`
			const targetInfo = `${targetProfileConfig.provider} @ ${targetProfileConfig.url}`
			console.log(formatMigrationPlan(plan, sourceInfo, targetInfo))

			if (opts.apply) {
				const targetPaasman = new Paasman({ provider: targetProvider })
				const result = await executeMigration(plan, targetPaasman)

				if (result.success) {
					console.log(chalk.green(`Migration successful: ${result.message}`))
				} else {
					console.error(chalk.red(`Migration failed: ${result.message}`))
					process.exit(1)
				}
			} else {
				console.log(chalk.gray('Run with --apply to execute migration.'))
			}
		})

	return cmd
}
