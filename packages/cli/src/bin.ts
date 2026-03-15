import { Command } from 'commander'
import { join } from 'node:path'
import { homedir } from 'node:os'
import { Paasman } from '@paasman/core'
import { loadConfig } from './config.js'
import { appsCommand } from './commands/apps.js'
import { envCommand } from './commands/env.js'
import { serversCommand } from './commands/servers.js'
import { deploysCommand } from './commands/deploys.js'
import { dbCommand } from './commands/db.js'
import { profileCommand } from './commands/profile.js'
import { initCommand } from './commands/init.js'
import { statusCommand } from './commands/status.js'
import { handleError } from './error-handler.js'

const program = new Command()
	.name('paasman')
	.description('Universal CLI for self-hosted PaaS platforms')
	.version('0.1.0')
	.option('--profile <name>', 'Use a specific profile')
	.option('--json', 'Output as JSON')

// Task 20 fix: getPaasman is async, uses dynamic import() instead of require()
async function getPaasman(): Promise<Paasman> {
	const configPath = join(homedir(), '.paasman', 'config.yaml')
	const config = loadConfig(configPath)

	const profileName = program.opts().profile ?? config.default
	const profile = config.profiles[profileName]

	if (!profile) {
		throw new Error(`Profile '${profileName}' not found`)
	}

	// Dynamic ESM import — provider loaded at runtime, NOT a build-time dependency
	const providerModule = await import(`@paasman/provider-${profile.provider}`)
	const ProviderClass =
		providerModule.default ?? providerModule[`${profile.provider.charAt(0).toUpperCase()}${profile.provider.slice(1)}Provider`] ?? Object.values(providerModule)[0]

	if (!ProviderClass || typeof ProviderClass !== 'function') {
		throw new Error(
			`Provider '${profile.provider}' not found. Install @paasman/provider-${profile.provider}`,
		)
	}

	const provider = new (ProviderClass as new (config: { baseUrl: string; token: string }) => import('@paasman/core').PaasProvider)({
		baseUrl: profile.url,
		token: profile.token,
	})

	return new Paasman({ provider })
}

// All command factories accept () => Promise<Paasman>
program.addCommand(appsCommand(getPaasman))
program.addCommand(envCommand(getPaasman))
program.addCommand(serversCommand(getPaasman))
program.addCommand(deploysCommand(getPaasman))
program.addCommand(dbCommand(getPaasman))
program.addCommand(profileCommand())
program.addCommand(initCommand())
program.addCommand(statusCommand())

program.parseAsync(process.argv).catch(handleError)
