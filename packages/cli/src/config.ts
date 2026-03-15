import { readFileSync } from 'node:fs'
import { parse } from 'yaml'
import { ValidationError } from '@paasman/core'

export interface ProfileConfig {
	provider: string
	url: string
	token: string
}

export interface PaasmanConfig {
	profiles: Record<string, ProfileConfig>
	default: string
}

export function interpolateEnvVars(value: string): string {
	return value.replace(/\$\{([^}]+)\}/g, (_, varName) => {
		const val = process.env[varName]
		if (val === undefined) {
			throw new ValidationError(`Environment variable '${varName}' is not set`, {
				[varName]: 'required',
			})
		}
		return val
	})
}

export function loadConfig(configPath: string): PaasmanConfig {
	let content: string
	try {
		content = readFileSync(configPath, 'utf-8')
	} catch {
		throw new ValidationError(`Config file not found: ${configPath}`)
	}

	const raw = parse(content) as Record<string, unknown>

	if (!raw.profiles || typeof raw.profiles !== 'object') {
		throw new ValidationError('Config must have a "profiles" section')
	}

	const profiles: Record<string, ProfileConfig> = {}
	for (const [name, profile] of Object.entries(
		raw.profiles as Record<string, Record<string, string>>,
	)) {
		profiles[name] = {
			provider: profile.provider,
			url: interpolateEnvVars(profile.url),
			token: interpolateEnvVars(profile.token),
		}
	}

	const defaultProfile = (raw.default as string) ?? Object.keys(profiles)[0]

	if (!profiles[defaultProfile]) {
		throw new ValidationError(`Default profile '${defaultProfile}' not found in profiles`)
	}

	return { profiles, default: defaultProfile }
}
