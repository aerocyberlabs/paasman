import { Command } from 'commander'
import { join } from 'node:path'
import { homedir } from 'node:os'
import Table from 'cli-table3'
import chalk from 'chalk'
import type { PaasProvider } from '@paasman/core'
import { loadConfig, type ProfileConfig } from '../config.js'

export async function createProvider(profile: ProfileConfig): Promise<PaasProvider | null> {
	try {
		const mod = await import(`@paasman/provider-${profile.provider}`)
		const ProviderClass = mod.default ?? Object.values(mod).find(v => typeof v === 'function')
		if (!ProviderClass || typeof ProviderClass !== 'function') {
			return null
		}
		const provider = new (ProviderClass as new (config: { baseUrl: string; token: string }) => PaasProvider)({
			baseUrl: profile.url,
			token: profile.token,
		})
		return provider
	} catch {
		return null
	}
}

export function statusCommand(): Command {
	const cmd = new Command('status')
		.description('Show dashboard overview of all profiles')
		.action(async () => {
			const configPath = join(homedir(), '.paasman', 'config.yaml')
			const config = loadConfig(configPath)

			const table = new Table({
				head: ['Profile', 'Provider', 'URL', 'Status', 'Apps'],
				style: { head: ['cyan'] },
			})

			for (const [name, profile] of Object.entries(config.profiles)) {
				const provider = await createProvider(profile)

				if (!provider) {
					table.push([
						name,
						profile.provider,
						profile.url,
						chalk.red('unreachable'),
						'-',
					])
					continue
				}

				try {
					const health = await provider.healthCheck()
					const apps = await provider.apps.list()
					table.push([
						name,
						profile.provider,
						profile.url,
						health.ok ? chalk.green('healthy') : chalk.red('unhealthy'),
						String(apps.length),
					])
				} catch {
					table.push([
						name,
						profile.provider,
						profile.url,
						chalk.red('unreachable'),
						'-',
					])
				}
			}

			console.log(table.toString())
		})

	return cmd
}
