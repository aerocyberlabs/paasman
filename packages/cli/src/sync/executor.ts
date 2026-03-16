import type { CreateAppInput, CreateDatabaseInput, DatabaseEngine, Paasman } from "@paasman/core";
import { UnsupportedError } from "@paasman/core";
import chalk from "chalk";
import type { SyncPlan } from "./differ.js";
import type { PaasmanYaml } from "./parser.js";

export interface ExecuteResult {
	appsCreated: number;
	appsUpdated: number;
	appsDeleted: number;
	dbsCreated: number;
	dbsDeleted: number;
	errors: string[];
}

export async function executeSyncPlan(
	plan: SyncPlan,
	desired: PaasmanYaml,
	pm: Paasman,
	opts: { prune: boolean },
): Promise<ExecuteResult> {
	const result: ExecuteResult = {
		appsCreated: 0,
		appsUpdated: 0,
		appsDeleted: 0,
		dbsCreated: 0,
		dbsDeleted: 0,
		errors: [],
	};

	// Create apps
	for (const { name, config } of plan.apps.create) {
		try {
			let source: CreateAppInput["source"];
			if (config.source.type === "git") {
				source = {
					type: "git",
					repository: config.source.repository,
					branch: config.source.branch,
				};
			} else {
				source = { type: "image", image: config.source.image };
			}

			const app = await pm.apps.create({
				name,
				source,
				domains: config.domains,
				env: config.env,
			});
			console.log(chalk.green(`  + Created app '${name}' (${app.id})`));
			result.appsCreated++;
		} catch (err) {
			const msg = `Failed to create app '${name}': ${err instanceof Error ? err.message : String(err)}`;
			console.error(chalk.red(`  ! ${msg}`));
			result.errors.push(msg);
		}
	}

	// Update apps (set env vars, domains are typically set at creation)
	for (const { name } of plan.apps.update) {
		try {
			const apps = await pm.apps.list();
			const app = apps.find((a) => a.name === name);
			if (!app) {
				result.errors.push(`App '${name}' not found for update`);
				continue;
			}

			const desiredConfig = desired.apps[name];
			if (desiredConfig.env) {
				await pm.env.set(app.id, desiredConfig.env);
			}

			console.log(chalk.yellow(`  ~ Updated app '${name}'`));
			result.appsUpdated++;
		} catch (err) {
			const msg = `Failed to update app '${name}': ${err instanceof Error ? err.message : String(err)}`;
			console.error(chalk.red(`  ! ${msg}`));
			result.errors.push(msg);
		}
	}

	// Prune orphaned apps
	if (opts.prune) {
		for (const name of plan.apps.orphaned) {
			try {
				const apps = await pm.apps.list();
				const app = apps.find((a) => a.name === name);
				if (app) {
					await pm.apps.delete(app.id);
					console.log(chalk.red(`  - Deleted app '${name}'`));
					result.appsDeleted++;
				}
			} catch (err) {
				const msg = `Failed to delete app '${name}': ${err instanceof Error ? err.message : String(err)}`;
				console.error(chalk.red(`  ! ${msg}`));
				result.errors.push(msg);
			}
		}
	}

	// Create databases
	for (const { name, config } of plan.databases.create) {
		try {
			if (!pm.databases) {
				throw new UnsupportedError("databases.create", pm.providerName);
			}
			const db = await pm.databases.create({
				name,
				engine: config.engine as DatabaseEngine,
				version: config.version,
			});
			console.log(chalk.green(`  + Created database '${name}' (${db.id})`));
			result.dbsCreated++;
		} catch (err) {
			const msg = `Failed to create database '${name}': ${err instanceof Error ? err.message : String(err)}`;
			console.error(chalk.red(`  ! ${msg}`));
			result.errors.push(msg);
		}
	}

	// Prune orphaned databases
	if (opts.prune) {
		for (const name of plan.databases.orphaned) {
			try {
				if (!pm.databases) {
					throw new UnsupportedError("databases.delete", pm.providerName);
				}
				const dbs = await pm.databases.list();
				const db = dbs.find((d) => d.name === name);
				if (db) {
					await pm.databases.delete(db.id);
					console.log(chalk.red(`  - Deleted database '${name}'`));
					result.dbsDeleted++;
				}
			} catch (err) {
				const msg = `Failed to delete database '${name}': ${err instanceof Error ? err.message : String(err)}`;
				console.error(chalk.red(`  ! ${msg}`));
				result.errors.push(msg);
			}
		}
	}

	return result;
}
