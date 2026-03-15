import Table from 'cli-table3'
import chalk from 'chalk'
import type { App, Server, Database, Deployment, EnvVar } from '@paasman/core'

export function formatJson(data: unknown): string {
	return JSON.stringify(data, null, 2)
}

function statusColor(status: string): string {
	switch (status) {
		case 'running':
		case 'reachable':
		case 'success':
			return chalk.green(status)
		case 'stopped':
		case 'cancelled':
			return chalk.yellow(status)
		case 'failed':
		case 'unreachable':
			return chalk.red(status)
		case 'deploying':
		case 'building':
		case 'queued':
			return chalk.blue(status)
		default:
			return chalk.gray(status)
	}
}

export function formatAppsTable(apps: App[]): string {
	const table = new Table({
		head: ['ID', 'Name', 'Status', 'Domains'],
		style: { head: ['cyan'] },
	})

	for (const app of apps) {
		table.push([
			app.id.slice(0, 12),
			app.name,
			statusColor(app.status),
			app.domains.join(', ') || '-',
		])
	}

	return table.toString()
}

export function formatServersTable(servers: Server[]): string {
	const table = new Table({
		head: ['ID', 'Name', 'Status', 'IP'],
		style: { head: ['cyan'] },
	})

	for (const s of servers) {
		table.push([s.id.slice(0, 12), s.name, statusColor(s.status), s.ip])
	}

	return table.toString()
}

export function formatDeploymentsTable(deployments: Deployment[]): string {
	const table = new Table({
		head: ['ID', 'App', 'Status', 'Triggered'],
		style: { head: ['cyan'] },
	})

	for (const d of deployments) {
		table.push([
			d.id.slice(0, 12),
			d.appId.slice(0, 12),
			statusColor(d.status),
			d.triggeredAt.toISOString(),
		])
	}

	return table.toString()
}

export function formatEnvTable(envs: EnvVar[]): string {
	const table = new Table({
		head: ['Key', 'Value', 'Secret', 'Scope'],
		style: { head: ['cyan'] },
	})

	for (const e of envs) {
		table.push([
			e.key,
			e.isSecret ? chalk.gray('********') : e.value,
			e.isSecret ? chalk.yellow('yes') : 'no',
			e.scope ?? '-',
		])
	}

	return table.toString()
}

export function formatDatabasesTable(dbs: Database[]): string {
	const table = new Table({
		head: ['ID', 'Name', 'Engine', 'Status'],
		style: { head: ['cyan'] },
	})

	for (const db of dbs) {
		table.push([db.id.slice(0, 12), db.name, db.engine, statusColor(db.status)])
	}

	return table.toString()
}
