import type { Paasman } from "@paasman/core";
import { UnsupportedError } from "@paasman/core";
import { Command } from "commander";
import { formatDeploymentsTable, formatJson } from "../formatters.js";

export function deploysCommand(getPaasman: () => Promise<Paasman>): Command {
	const cmd = new Command("deploys").description("Manage deployments");

	cmd
		.command("list [app-id]")
		.description("List deployments")
		.option("--json", "Output as JSON")
		.action(async (appId, opts) => {
			const pm = await getPaasman();
			if (!pm.capabilities.deployments.list) {
				throw new UnsupportedError("deployments.list", pm.providerName);
			}
			const deploys = await pm.deployments!.list(appId);
			console.log(opts.json ? formatJson(deploys) : formatDeploymentsTable(deploys));
		});

	cmd
		.command("cancel <id>")
		.description("Cancel a deployment")
		.action(async (id) => {
			const pm = await getPaasman();
			if (!pm.capabilities.deployments.cancel) {
				throw new UnsupportedError("deployments.cancel", pm.providerName);
			}
			await pm.deployments!.cancel!(id);
			console.log(`Deployment ${id} cancelled`);
		});

	return cmd;
}
