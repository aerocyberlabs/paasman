import type { Paasman } from "@paasman/core";
import type { MigrationPlan } from "./planner.js";

export interface MigrationResult {
	appId: string;
	success: boolean;
	message: string;
}

export async function executeMigration(
	plan: MigrationPlan,
	targetPaasman: Paasman,
): Promise<MigrationResult> {
	try {
		const app = await targetPaasman.apps.create(plan.createInput);

		// Set env vars if they were included in the plan
		if (plan.envVars && Object.keys(plan.envVars).length > 0) {
			await targetPaasman.env.set(app.id, plan.envVars);
		}

		return {
			appId: app.id,
			success: true,
			message: `App '${app.name}' created on target profile '${plan.targetProfile}' (id: ${app.id})`,
		};
	} catch (err) {
		return {
			appId: "",
			success: false,
			message: err instanceof Error ? err.message : String(err),
		};
	}
}
