import { Command } from 'commander'
import { readFileSync, writeFileSync } from 'node:fs'
import chalk from 'chalk'
import type { Paasman } from '@paasman/core'
import { formatEnvTable, formatJson } from '../formatters.js'

export interface EnvDiffResult {
	localOnly: Record<string, string>
	remoteOnly: Record<string, string>
	changed: Record<string, { local: string; remote: string }>
	matching: Record<string, string>
}

export function compareEnvVars(
	localVars: Record<string, string>,
	remoteVars: Record<string, string>,
): EnvDiffResult {
	const localOnly: Record<string, string> = {}
	const remoteOnly: Record<string, string> = {}
	const changed: Record<string, { local: string; remote: string }> = {}
	const matching: Record<string, string> = {}

	for (const [key, value] of Object.entries(localVars)) {
		if (!(key in remoteVars)) {
			localOnly[key] = value
		} else if (remoteVars[key] !== value) {
			changed[key] = { local: value, remote: remoteVars[key] }
		} else {
			matching[key] = value
		}
	}

	for (const [key, value] of Object.entries(remoteVars)) {
		if (!(key in localVars)) {
			remoteOnly[key] = value
		}
	}

	return { localOnly, remoteOnly, changed, matching }
}

export function parseEnvFile(content: string): Record<string, string> {
	const vars: Record<string, string> = {}
	for (const line of content.split('\n')) {
		const trimmed = line.trim()
		if (!trimmed || trimmed.startsWith('#')) continue
		const [key, ...rest] = trimmed.split('=')
		let value = rest.join('=')
		if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
			value = value.slice(1, -1)
		}
		vars[key] = value
	}
	return vars
}

function maskValue(value: string): string {
	if (value.length <= 4) return '****'
	return value.slice(0, 2) + '****' + value.slice(-2)
}

export function formatEnvDiff(diff: EnvDiffResult, full: boolean, reveal = false): string {
	const lines: string[] = []
	const v = (val: string) => reveal ? val : maskValue(val)

	for (const [key, value] of Object.entries(diff.localOnly)) {
		lines.push(chalk.green(`  + ${key}=${v(value)}`) + chalk.gray('  (local only — will be added on push)'))
	}

	for (const [key, value] of Object.entries(diff.remoteOnly)) {
		lines.push(chalk.red(`  - ${key}=${v(value)}`) + chalk.gray('  (remote only — will be removed on push)'))
	}

	for (const [key, { local, remote }] of Object.entries(diff.changed)) {
		lines.push(chalk.yellow(`  ~ ${key}: ${v(remote)} → ${v(local)}`) + chalk.gray('  (value differs)'))
	}

	const matchCount = Object.keys(diff.matching).length
	if (full) {
		for (const [key, value] of Object.entries(diff.matching)) {
			lines.push(chalk.gray(`    ${key}=${value}`))
		}
	} else if (matchCount > 0) {
		lines.push('')
		lines.push(chalk.gray(`  ${matchCount} matching key(s) hidden (use --full to show)`))
	}

	if (lines.length === 0 || (lines.every(l => l === '') && matchCount === 0)) {
		lines.push(chalk.gray('  No differences found.'))
	}

	return lines.join('\n')
}

export function envCommand(getPaasman: () => Promise<Paasman>): Command {
	const cmd = new Command('env').description('Manage environment variables')

	cmd
		.command('list <app-id>')
		.description('List environment variables')
		.option('--json', 'Output as JSON')
		.action(async (appId, opts) => {
			const pm = await getPaasman()
			const envs = await pm.env.list(appId)
			console.log(opts.json ? formatJson(envs) : formatEnvTable(envs))
		})

	cmd
		.command('set <app-id> [pairs...]')
		.description('Set environment variables (KEY=value)')
		.action(async (appId, pairs) => {
			const pm = await getPaasman()
			const vars: Record<string, string> = {}
			for (const pair of pairs) {
				const [key, ...rest] = pair.split('=')
				vars[key] = rest.join('=')
			}
			await pm.env.set(appId, vars)
			console.log(`Set ${Object.keys(vars).length} variable(s)`)
		})

	cmd
		.command('delete <app-id> <key>')
		.description('Delete an environment variable')
		.action(async (appId, key) => {
			const pm = await getPaasman()
			await pm.env.delete(appId, key)
			console.log(`Deleted '${key}'`)
		})

	cmd
		.command('pull <app-id>')
		.description('Download env vars to a .env file')
		.option('-o, --output <file>', 'Output file', '.env')
		.action(async (appId, opts) => {
			const pm = await getPaasman()
			const vars = await pm.env.pull(appId)
			const content = Object.entries(vars)
				.map(([k, v]) => `${k}=${v}`)
				.join('\n')
			writeFileSync(opts.output, `${content}\n`)
			console.log(`Written ${Object.keys(vars).length} variable(s) to ${opts.output}`)
		})

	cmd
		.command('push <app-id>')
		.description('Upload env vars from a .env file')
		.option('-f, --file <file>', 'Input file', '.env')
		.action(async (appId, opts) => {
			const pm = await getPaasman()
			const content = readFileSync(opts.file, 'utf-8')
			const vars: Record<string, string> = {}
			for (const line of content.split('\n')) {
				const trimmed = line.trim()
				if (!trimmed || trimmed.startsWith('#')) continue
				const [key, ...rest] = trimmed.split('=')
				let value = rest.join('=')
				if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
					value = value.slice(1, -1)
				}
				vars[key] = value
			}
			await pm.env.push(appId, vars)
			console.log(`Pushed ${Object.keys(vars).length} variable(s) from ${opts.file}`)
		})

	cmd
		.command('diff <app-id>')
		.description('Compare local .env file with remote environment variables')
		.option('-f, --file <file>', 'Local env file to compare', '.env')
		.option('--full', 'Show matching keys as well')
		.option('--reveal', 'Show full values (default: masked for security)')
		.action(async (appId, opts) => {
			const pm = await getPaasman()
			const remoteVars = await pm.env.pull(appId)

			let localContent: string
			try {
				localContent = readFileSync(opts.file, 'utf-8')
			} catch {
				console.error(chalk.red(`Could not read local file: ${opts.file}`))
				process.exit(1)
			}

			const localVars = parseEnvFile(localContent)
			const diff = compareEnvVars(localVars, remoteVars)

			console.log(`\nComparing local ${opts.file} with remote env for ${appId}\n`)
			console.log(formatEnvDiff(diff, opts.full ?? false, opts.reveal ?? false))
			console.log()
		})

	return cmd
}
