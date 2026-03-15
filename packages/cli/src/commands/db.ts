import { Command } from 'commander'
import type { Paasman } from '@paasman/core'
import { UnsupportedError } from '@paasman/core'
import { formatDatabasesTable, formatJson } from '../formatters.js'

export function dbCommand(getPaasman: () => Promise<Paasman>): Command {
	const cmd = new Command('db').description('Manage databases')

	cmd
		.command('list')
		.description('List all databases')
		.option('--json', 'Output as JSON')
		.action(async (opts) => {
			const pm = await getPaasman()
			if (!pm.capabilities.databases) {
				throw new UnsupportedError('databases.list', pm.providerName)
			}
			const dbs = await pm.databases!.list()
			console.log(opts.json ? formatJson(dbs) : formatDatabasesTable(dbs))
		})

	cmd
		.command('create')
		.description('Create a database')
		.option('--name <name>', 'Database name')
		.option('--engine <engine>', 'Database engine (postgresql, mysql, redis, etc.)')
		.option('--version <version>', 'Engine version')
		.option('--server <id>', 'Server UUID')
		.action(async (opts) => {
			const pm = await getPaasman()
			if (!pm.capabilities.databases) {
				throw new UnsupportedError('databases.create', pm.providerName)
			}
			const name =
				opts.name ??
				(await (await import('@inquirer/prompts')).input({ message: 'Database name' }))
			const engine =
				opts.engine ??
				(await (
					await import('@inquirer/prompts')
				).select({
					message: 'Engine',
					choices: [
						{ name: 'PostgreSQL', value: 'postgresql' },
						{ name: 'MySQL', value: 'mysql' },
						{ name: 'MariaDB', value: 'mariadb' },
						{ name: 'MongoDB', value: 'mongodb' },
						{ name: 'Redis', value: 'redis' },
					],
				}))
			const db = await pm.databases!.create({
				name,
				engine,
				version: opts.version,
				serverId: opts.server,
			})
			console.log(`Created database: ${db.id} (${db.name}, ${db.engine})`)
		})

	cmd
		.command('delete <id>')
		.description('Delete a database')
		.action(async (id) => {
			const pm = await getPaasman()
			if (!pm.capabilities.databases) {
				throw new UnsupportedError('databases.delete', pm.providerName)
			}
			await pm.databases!.delete(id)
			console.log(`Database ${id} deleted`)
		})

	return cmd
}
