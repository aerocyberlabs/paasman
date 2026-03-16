import type { App, Database } from "@paasman/core";
import type { AppConfig, DbConfig, PaasmanYaml } from "./parser.js";

export interface SyncPlan {
	apps: {
		create: { name: string; config: AppConfig }[];
		update: { name: string; changes: string[] }[];
		unchanged: string[];
		orphaned: string[];
	};
	databases: {
		create: { name: string; config: DbConfig }[];
		unchanged: string[];
		orphaned: string[];
	};
}

export interface CurrentState {
	apps: App[];
	databases: Database[];
	appEnvs: Record<string, Record<string, string>>;
}

export function computeSyncPlan(desired: PaasmanYaml, current: CurrentState): SyncPlan {
	const plan: SyncPlan = {
		apps: { create: [], update: [], unchanged: [], orphaned: [] },
		databases: { create: [], update: [], unchanged: [], orphaned: [] },
	};

	// Index current apps by name
	const currentAppsByName = new Map<string, App>();
	for (const app of current.apps) {
		currentAppsByName.set(app.name, app);
	}

	// Process desired apps
	const desiredAppNames = new Set(Object.keys(desired.apps));
	for (const [name, config] of Object.entries(desired.apps)) {
		const existing = currentAppsByName.get(name);
		if (!existing) {
			plan.apps.create.push({ name, config });
		} else {
			const changes = computeAppChanges(name, config, existing, current.appEnvs[name] ?? {});
			if (changes.length > 0) {
				plan.apps.update.push({ name, changes });
			} else {
				plan.apps.unchanged.push(name);
			}
		}
	}

	// Find orphaned apps
	for (const app of current.apps) {
		if (!desiredAppNames.has(app.name)) {
			plan.apps.orphaned.push(app.name);
		}
	}

	// Index current databases by name
	const currentDbsByName = new Map<string, Database>();
	for (const db of current.databases) {
		currentDbsByName.set(db.name, db);
	}

	// Process desired databases
	const desiredDbNames = new Set(Object.keys(desired.databases));
	for (const [name, config] of Object.entries(desired.databases)) {
		const existing = currentDbsByName.get(name);
		if (!existing) {
			plan.databases.create.push({ name, config });
		} else {
			plan.databases.unchanged.push(name);
		}
	}

	// Find orphaned databases
	for (const db of current.databases) {
		if (!desiredDbNames.has(db.name)) {
			plan.databases.orphaned.push(db.name);
		}
	}

	return plan;
}

function computeAppChanges(
	name: string,
	desired: AppConfig,
	current: App,
	currentEnv: Record<string, string>,
): string[] {
	const changes: string[] = [];

	// Check source changes
	if (desired.source.type === "git") {
		if (current.meta.repository !== desired.source.repository) {
			changes.push(
				`repository: ${current.meta.repository ?? "(none)"} -> ${desired.source.repository}`,
			);
		}
		if (desired.source.branch && current.meta.branch !== desired.source.branch) {
			changes.push(`branch: ${current.meta.branch ?? "(none)"} -> ${desired.source.branch}`);
		}
	} else if (desired.source.type === "image") {
		if (current.meta.image !== desired.source.image) {
			changes.push(`image: ${current.meta.image ?? "(none)"} -> ${desired.source.image}`);
		}
	}

	// Check domain changes
	if (desired.domains) {
		const currentDomains = new Set(current.domains);
		const desiredDomains = new Set(desired.domains);
		const added = desired.domains.filter((d) => !currentDomains.has(d));
		const removed = current.domains.filter((d) => !desiredDomains.has(d));
		if (added.length > 0) {
			changes.push(`domains added: ${added.join(", ")}`);
		}
		if (removed.length > 0) {
			changes.push(`domains removed: ${removed.join(", ")}`);
		}
	}

	// Check env changes
	if (desired.env) {
		for (const [key, val] of Object.entries(desired.env)) {
			if (!(key in currentEnv)) {
				changes.push(`env +${key}`);
			} else if (currentEnv[key] !== val) {
				changes.push(`env ${key}: ${currentEnv[key]} -> ${val}`);
			}
		}
		for (const key of Object.keys(currentEnv)) {
			if (!(key in desired.env)) {
				changes.push(`env -${key}`);
			}
		}
	}

	return changes;
}

export function planIsEmpty(plan: SyncPlan): boolean {
	return (
		plan.apps.create.length === 0 &&
		plan.apps.update.length === 0 &&
		plan.apps.orphaned.length === 0 &&
		plan.databases.create.length === 0 &&
		plan.databases.orphaned.length === 0
	);
}
