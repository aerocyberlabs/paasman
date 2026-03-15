import { Command } from 'commander'
import { readFileSync, writeFileSync } from 'node:fs'
import type { Paasman } from '@paasman/core'
import { formatEnvTable, formatJson } from '../formatters.js'

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
				vars[key] = rest.join('=')
			}
			await pm.env.push(appId, vars)
			console.log(`Pushed ${Object.keys(vars).length} variable(s) from ${opts.file}`)
		})

	return cmd
}
