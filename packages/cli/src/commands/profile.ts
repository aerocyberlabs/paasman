import { Command } from 'commander'
import { readFileSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import { homedir } from 'node:os'
import { parse, stringify } from 'yaml'

export function profileCommand(): Command {
	const cmd = new Command('profile').description('Manage profiles')

	const configPath = join(homedir(), '.paasman', 'config.yaml')

	cmd
		.command('list')
		.description('List all profiles')
		.action(() => {
			const raw = parse(readFileSync(configPath, 'utf-8')) as Record<string, unknown>
			const profiles = raw.profiles as Record<string, unknown>
			const defaultProfile = raw.default as string
			for (const [name, profile] of Object.entries(profiles)) {
				const marker = name === defaultProfile ? ' (default)' : ''
				const p = profile as Record<string, string>
				console.log(`  ${name}${marker} — ${p.provider} @ ${p.url}`)
			}
		})

	cmd
		.command('switch <name>')
		.description('Set the default profile')
		.action((name) => {
			const raw = parse(readFileSync(configPath, 'utf-8')) as Record<string, unknown>
			const profiles = raw.profiles as Record<string, unknown>
			if (!profiles[name]) {
				console.error(`Profile '${name}' not found`)
				process.exit(1)
			}
			raw.default = name
			writeFileSync(configPath, stringify(raw))
			console.log(`Default profile set to '${name}'`)
		})

	return cmd
}
