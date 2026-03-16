import { readFileSync } from 'node:fs'
import { parse } from 'yaml'
import { ValidationError } from '@paasman/core'
import { interpolateEnvVars } from '../config.js'

export interface AppSourceGit {
	type: 'git'
	repository: string
	branch?: string
}

export interface AppSourceImage {
	type: 'image'
	image: string
}

export type AppSource = AppSourceGit | AppSourceImage

export interface AppConfig {
	source: AppSource
	domains?: string[]
	env?: Record<string, string>
}

export interface DbConfig {
	engine: string
	version?: string
}

export interface PaasmanYaml {
	profile?: string
	apps: Record<string, AppConfig>
	databases: Record<string, DbConfig>
}

export function parsePaasmanYaml(filePath: string): PaasmanYaml {
	let content: string
	try {
		content = readFileSync(filePath, 'utf-8')
	} catch {
		throw new ValidationError(`Sync config file not found: ${filePath}`)
	}

	const raw = parse(content) as Record<string, unknown>

	if (!raw || typeof raw !== 'object') {
		throw new ValidationError('Invalid paasman.yaml: file is empty or not a valid YAML object')
	}

	const profile = raw.profile != null ? String(raw.profile) : undefined

	// Parse apps
	const apps: Record<string, AppConfig> = {}
	if (raw.apps && typeof raw.apps === 'object') {
		for (const [name, rawApp] of Object.entries(raw.apps as Record<string, Record<string, unknown>>)) {
			apps[name] = parseAppConfig(name, rawApp)
		}
	}

	// Parse databases
	const databases: Record<string, DbConfig> = {}
	if (raw.databases && typeof raw.databases === 'object') {
		for (const [name, rawDb] of Object.entries(raw.databases as Record<string, Record<string, unknown>>)) {
			databases[name] = parseDbConfig(name, rawDb)
		}
	}

	if (Object.keys(apps).length === 0 && Object.keys(databases).length === 0) {
		throw new ValidationError('paasman.yaml must define at least one app or database')
	}

	return { profile, apps, databases }
}

function parseAppConfig(name: string, raw: Record<string, unknown>): AppConfig {
	if (!raw.source || typeof raw.source !== 'object') {
		throw new ValidationError(`App '${name}' must have a 'source' section`)
	}

	const rawSource = raw.source as Record<string, unknown>
	let source: AppSource

	if (rawSource.type === 'git') {
		if (!rawSource.repository || typeof rawSource.repository !== 'string') {
			throw new ValidationError(`App '${name}' git source must have a 'repository'`)
		}
		source = {
			type: 'git',
			repository: rawSource.repository,
			branch: rawSource.branch != null ? String(rawSource.branch) : undefined,
		}
	} else if (rawSource.type === 'image') {
		if (!rawSource.image || typeof rawSource.image !== 'string') {
			throw new ValidationError(`App '${name}' image source must have an 'image'`)
		}
		source = { type: 'image', image: rawSource.image }
	} else {
		throw new ValidationError(
			`App '${name}' source must have type 'git' or 'image', got '${String(rawSource.type)}'`,
		)
	}

	const domains = raw.domains
		? (raw.domains as string[]).map(String)
		: undefined

	let env: Record<string, string> | undefined
	if (raw.env && typeof raw.env === 'object') {
		env = {}
		for (const [key, val] of Object.entries(raw.env as Record<string, unknown>)) {
			env[key] = interpolateEnvVars(String(val))
		}
	}

	return { source, domains, env }
}

function parseDbConfig(name: string, raw: Record<string, unknown>): DbConfig {
	if (!raw.engine || typeof raw.engine !== 'string') {
		throw new ValidationError(`Database '${name}' must have an 'engine'`)
	}

	const validEngines = ['postgresql', 'mysql', 'mariadb', 'mongodb', 'redis', 'other']
	if (!validEngines.includes(raw.engine)) {
		throw new ValidationError(
			`Database '${name}' engine must be one of: ${validEngines.join(', ')}`,
		)
	}

	return {
		engine: raw.engine,
		version: raw.version != null ? String(raw.version) : undefined,
	}
}
