import { Command } from 'commander'
import { join } from 'node:path'
import { homedir } from 'node:os'
import type { Paasman, CreateAppInput, App } from '@paasman/core'
import { UnsupportedError } from '@paasman/core'
import { formatAppsTable, formatAllProfilesAppsTable, formatJson, type AllProfilesAppRow } from '../formatters.js'
import { loadConfig } from '../config.js'
import { createProvider } from './status.js'
import { getWebhookManager } from '../webhooks.js'

export function appsCommand(getPaasman: () => Promise<Paasman>): Command {
	const cmd = new Command('apps').description('Manage applications')

	cmd
		.command('list')
		.description('List all applications')
		.option('--json', 'Output as JSON')
		.option('--all-profiles', 'List apps from all profiles')
		.action(async (opts) => {
			if (opts.allProfiles) {
				const configPath = join(homedir(), '.paasman', 'config.yaml')
				const config = loadConfig(configPath)

				if (opts.json) {
					const results: Record<string, App[] | { error: string }> = {}
					for (const [name, profile] of Object.entries(config.profiles)) {
						const provider = await createProvider(profile)
						if (!provider) {
							results[name] = { error: `Could not load provider '${profile.provider}'` }
							continue
						}
						try {
							results[name] = await provider.apps.list()
						} catch (err) {
							results[name] = { error: err instanceof Error ? err.message : String(err) }
						}
					}
					console.log(formatJson(results))
				} else {
					const rows: AllProfilesAppRow[] = []

					for (const [name, profile] of Object.entries(config.profiles)) {
						const provider = await createProvider(profile)
						if (!provider) {
							rows.push({ profile: name, error: `Could not load provider '${profile.provider}'` })
							continue
						}
						try {
							const apps = await provider.apps.list()
							if (apps.length === 0) {
								rows.push({ profile: name })
							} else {
								for (const app of apps) {
									rows.push({ profile: name, app })
								}
							}
						} catch (err) {
							rows.push({ profile: name, error: err instanceof Error ? err.message : String(err) })
						}
					}

					console.log(formatAllProfilesAppsTable(rows))
				}
			} else {
				const pm = await getPaasman()
				const apps = await pm.apps.list()
				console.log(opts.json ? formatJson(apps) : formatAppsTable(apps))
			}
		})

	cmd
		.command('get <id>')
		.description('Get application details')
		.option('--json', 'Output as JSON')
		.action(async (id, opts) => {
			const pm = await getPaasman()
			const app = await pm.apps.get(id)
			if (opts.json) {
				console.log(formatJson(app))
			} else {
				console.log(`Name:     ${app.name}`)
				console.log(`ID:       ${app.id}`)
				console.log(`Status:   ${app.status}`)
				console.log(`Domains:  ${app.domains.join(', ') || '-'}`)
				if (app.meta.repository) console.log(`Repo:     ${app.meta.repository}`)
				if (app.meta.branch) console.log(`Branch:   ${app.meta.branch}`)
				if (app.meta.image) console.log(`Image:    ${app.meta.image}`)
				if (app.meta.buildPack) console.log(`Build:    ${app.meta.buildPack}`)
				console.log(`Created:  ${app.createdAt.toISOString()}`)
				console.log(`Updated:  ${app.updatedAt.toISOString()}`)
			}
		})

	cmd
		.command('create')
		.description('Create a new application')
		.option('--name <name>', 'Application name')
		.option('--repo <url>', 'Git repository URL')
		.option('--branch <branch>', 'Git branch', 'main')
		.option('--image <image>', 'Docker image')
		.option('--server <id>', 'Server UUID')
		.action(async (opts) => {
			const pm = await getPaasman()
			let source: CreateAppInput['source']
			if (opts.image) {
				source = { type: 'image', image: opts.image }
			} else if (opts.repo) {
				source = { type: 'git', repository: opts.repo, branch: opts.branch }
			} else {
				// Interactive mode
				const { select, input } = await import('@inquirer/prompts')
				const sourceType = await select({
					message: 'Source type',
					choices: [
						{ name: 'Git repository', value: 'git' as const },
						{ name: 'Docker image', value: 'image' as const },
					],
				})
				if (sourceType === 'git') {
					const repo = await input({ message: 'Repository URL' })
					const branch = await input({ message: 'Branch', default: 'main' })
					source = { type: 'git', repository: repo, branch }
				} else {
					const image = await input({ message: 'Docker image' })
					source = { type: 'image', image }
				}
			}
			const name =
				opts.name ?? (await (await import('@inquirer/prompts')).input({ message: 'App name' }))
			const app = await pm.apps.create({ name, source, serverId: opts.server })
			console.log(`Created application: ${app.id} (${app.name})`)
		})

	cmd
		.command('delete <id>')
		.description('Delete an application')
		.action(async (id) => {
			const pm = await getPaasman()
			await pm.apps.delete(id)
			console.log(`Application ${id} deleted`)
		})

	cmd
		.command('deploy <id>')
		.description('Deploy an application')
		.option('--force', 'Force rebuild')
		.action(async (id, opts) => {
			const pm = await getPaasman()
			const deployment = await pm.apps.deploy(id, { force: opts.force })
			console.log(`Deployment triggered: ${deployment.id}`)

			const webhooks = getWebhookManager()
			if (webhooks) {
				await webhooks.notify({
					event: 'deploy',
					profile: pm.providerName,
					provider: pm.providerName,
					app: { id, name: id },
					deployment: { id: deployment.id, status: 'triggered' },
				})
			}
		})

	cmd
		.command('stop <id>')
		.description('Stop an application')
		.action(async (id) => {
			const pm = await getPaasman()
			if (!pm.capabilities.apps.stop) {
				throw new UnsupportedError('apps.stop', pm.providerName)
			}
			await pm.apps.stop!(id)
			console.log(`Application ${id} stopped`)

			const webhooks = getWebhookManager()
			if (webhooks) {
				await webhooks.notify({
					event: 'stop',
					profile: pm.providerName,
					provider: pm.providerName,
					app: { id, name: id },
				})
			}
		})

	cmd
		.command('restart <id>')
		.description('Restart an application')
		.action(async (id) => {
			const pm = await getPaasman()
			if (!pm.capabilities.apps.restart) {
				throw new UnsupportedError('apps.restart', pm.providerName)
			}
			await pm.apps.restart!(id)
			console.log(`Application ${id} restarted`)

			const webhooks = getWebhookManager()
			if (webhooks) {
				await webhooks.notify({
					event: 'restart',
					profile: pm.providerName,
					provider: pm.providerName,
					app: { id, name: id },
				})
			}
		})

	cmd
		.command('logs <id>')
		.description('View application logs')
		.option('-n, --lines <number>', 'Number of lines', '100')
		.option('-f, --follow', 'Follow log output')
		.action(async (id, opts) => {
			const pm = await getPaasman()
			if (!pm.capabilities.apps.logs) {
				throw new UnsupportedError('apps.logs', pm.providerName)
			}
			// Task 26: Create AbortSignal in CLI layer (not in LogOpts Zod schema)
			const ac = new AbortController()
			process.on('SIGINT', () => ac.abort())

			const logStream = pm.apps.logs!(id, {
				lines: Number(opts.lines),
				follow: opts.follow,
			})
			for await (const line of logStream) {
				if (ac.signal.aborted) break
				const ts = line.timestamp ? `[${line.timestamp.toISOString()}] ` : ''
				console.log(`${ts}${line.message}`)
			}
		})

	return cmd
}
