import { Command } from 'commander'
import { writeFileSync, mkdirSync } from 'node:fs'
import { join } from 'node:path'
import { homedir } from 'node:os'
import { stringify } from 'yaml'

export function initCommand(): Command {
	const cmd = new Command('init')
		.description('Initialize Paasman configuration')
		.action(async () => {
			const { input, select } = await import('@inquirer/prompts')

			const profileName = await input({ message: 'Profile name', default: 'default' })
			const provider = await select({
				message: 'Provider',
				choices: [
					{ name: 'Coolify', value: 'coolify' },
					{ name: 'Dokploy', value: 'dokploy' },
					{ name: 'CapRover', value: 'caprover' },
					{ name: 'Dokku', value: 'dokku' },
				],
			})
			const url = await input({ message: 'Server URL (e.g., https://coolify.example.com)' })
			const token = await input({ message: 'API token' })

			const configDir = join(homedir(), '.paasman')
			const configPath = join(configDir, 'config.yaml')

			mkdirSync(configDir, { recursive: true })

			const config = {
				profiles: {
					[profileName]: { provider, url, token },
				},
				default: profileName,
			}

			writeFileSync(configPath, stringify(config))
			console.log(`Configuration saved to ${configPath}`)
			console.log(
				`\nTip: For security, replace the token in config.yaml with \${ENV_VAR_NAME}`,
			)
		})

	return cmd
}
