import { Command } from 'commander'
import { join } from 'node:path'
import { homedir } from 'node:os'
import { Paasman } from '@paasman/core'
import type { PaasProvider } from '@paasman/core'
import { loadConfig } from './config.js'
import type { ProfileConfig } from './config.js'
import { appsCommand } from './commands/apps.js'
import { envCommand } from './commands/env.js'
import { serversCommand } from './commands/servers.js'
import { deploysCommand } from './commands/deploys.js'
import { dbCommand } from './commands/db.js'
import { profileCommand } from './commands/profile.js'
import { initCommand } from './commands/init.js'
import { statusCommand } from './commands/status.js'
import { syncCommand } from './commands/sync.js'
import { migrateCommand } from './commands/migrate.js'
import { handleError } from './error-handler.js'

const VALID_PROVIDERS = ['coolify', 'dokploy', 'caprover', 'dokku'] as const

const program = new Command()
	.name('paasman')
	.description('Universal CLI for self-hosted PaaS platforms')
	.version('0.1.0')
	.option('--profile <name>', 'Use a specific profile')
	.option('--json', 'Output as JSON')

function mapProfileToProviderConfig(profile: ProfileConfig): Record<string, unknown> {
	switch (profile.provider) {
		case 'caprover':
			return { baseUrl: profile.url, password: profile.token }
		case 'dokku':
			return {
				host: profile.url.replace(/^https?:\/\//, ''),
				privateKeyPath: profile.token,
			}
		default:
			return { baseUrl: profile.url, token: profile.token }
	}
}

async function loadProvider(profile: ProfileConfig): Promise<PaasProvider> {
	if (!VALID_PROVIDERS.includes(profile.provider as typeof VALID_PROVIDERS[number])) {
		throw new Error(`Unknown provider '${profile.provider}'. Valid providers: ${VALID_PROVIDERS.join(', ')}`)
	}

	const providerModule = await import(`@paasman/provider-${profile.provider}`)
	const ProviderClass =
		providerModule.default ?? providerModule[`${profile.provider.charAt(0).toUpperCase()}${profile.provider.slice(1)}Provider`] ?? Object.values(providerModule).find(v => typeof v === 'function')

	if (!ProviderClass || typeof ProviderClass !== 'function') {
		throw new Error(
			`Provider '${profile.provider}' not found. Install @paasman/provider-${profile.provider}`,
		)
	}

	const config = mapProfileToProviderConfig(profile)
	return new (ProviderClass as new (config: Record<string, unknown>) => PaasProvider)(config)
}

async function getPaasman(profileOverride?: string): Promise<Paasman> {
	const configPath = join(homedir(), '.paasman', 'config.yaml')
	const config = loadConfig(configPath)

	const profileName = profileOverride ?? program.opts().profile ?? config.default
	const profile = config.profiles[profileName]

	if (!profile) {
		throw new Error(`Profile '${profileName}' not found`)
	}

	const provider = await loadProvider(profile)
	return new Paasman({ provider })
}

program.addCommand(appsCommand(() => getPaasman()))
program.addCommand(envCommand(() => getPaasman()))
program.addCommand(serversCommand(() => getPaasman()))
program.addCommand(deploysCommand(() => getPaasman()))
program.addCommand(dbCommand(() => getPaasman()))
program.addCommand(profileCommand())
program.addCommand(initCommand())
program.addCommand(statusCommand())
program.addCommand(migrateCommand())
program.addCommand(syncCommand((profileOverride) => getPaasman(profileOverride)))

program.parseAsync(process.argv).catch(handleError)
