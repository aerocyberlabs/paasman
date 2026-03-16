import type { App, CreateAppInput } from "@paasman/core";

export interface MigrationPlan {
	app: App;
	envVars?: Record<string, string>;
	sourceProfile: string;
	targetProfile: string;
	warnings: string[];
	createInput: CreateAppInput;
}

export function createMigrationPlan(
	app: App,
	envVars: Record<string, string> | undefined,
	sourceProfile: string,
	targetProfile: string,
): MigrationPlan {
	const warnings: string[] = [];

	// Warn if source and target are the same profile
	if (sourceProfile === targetProfile) {
		warnings.push("Source and target profiles are the same — are you sure?");
	}

	// Warn about build pack compatibility
	if (app.meta.buildPack) {
		warnings.push(`Source uses build pack '${app.meta.buildPack}', target may not support it`);
	}

	// Warn about domains needing DNS reconfiguration
	if (app.domains.length > 0) {
		warnings.push("Domains will need manual DNS reconfiguration");
	}

	// Warn about volumes/persistent data
	const raw = app.raw as Record<string, unknown> | undefined;
	if (raw && ("volumes" in raw || "persistentStorage" in raw || "mounts" in raw)) {
		warnings.push("Source app has volumes/persistent data that cannot be migrated automatically");
	}

	// Build the CreateAppInput from the source app
	let source: CreateAppInput["source"];
	if (app.meta.image) {
		source = { type: "image", image: app.meta.image };
	} else if (app.meta.repository) {
		source = {
			type: "git",
			repository: app.meta.repository,
			branch: app.meta.branch,
		};
	} else {
		// Fallback: create a git source with empty repo (user will need to configure)
		warnings.push(
			"Could not determine app source — you may need to configure it manually on the target",
		);
		source = { type: "git", repository: "", branch: "main" };
	}

	const createInput: CreateAppInput = {
		name: app.name,
		source,
		domains: app.domains.length > 0 ? app.domains : undefined,
		// env vars set separately after creation via executor to avoid double-set
	};

	return {
		app,
		envVars,
		sourceProfile,
		targetProfile,
		warnings,
		createInput,
	};
}
