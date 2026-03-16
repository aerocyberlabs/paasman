import type { Paasman } from "@paasman/core";
import { UnsupportedError } from "@paasman/core";
import { Command } from "commander";
import { formatJson, formatServersTable } from "../formatters.js";

export function serversCommand(getPaasman: () => Promise<Paasman>): Command {
	const cmd = new Command("servers").description("Manage servers");

	cmd
		.command("list")
		.description("List all servers")
		.option("--json", "Output as JSON")
		.action(async (opts) => {
			const pm = await getPaasman();
			if (!pm.capabilities.servers) {
				throw new UnsupportedError("servers.list", pm.providerName);
			}
			const servers = await pm.servers!.list();
			console.log(opts.json ? formatJson(servers) : formatServersTable(servers));
		});

	cmd
		.command("get <id>")
		.description("Get server details")
		.option("--json", "Output as JSON")
		.action(async (id, opts) => {
			const pm = await getPaasman();
			if (!pm.capabilities.servers) {
				throw new UnsupportedError("servers.get", pm.providerName);
			}
			const server = await pm.servers!.get(id);
			console.log(formatJson(server));
		});

	return cmd;
}
