import { readFileSync, writeFileSync } from "node:fs";
import { homedir } from "node:os";
import { join } from "node:path";
import { Command } from "commander";
import { parse, stringify } from "yaml";

export function profileCommand(): Command {
	const cmd = new Command("profile").description("Manage profiles");

	const configPath = join(homedir(), ".paasman", "config.yaml");

	cmd
		.command("list")
		.description("List all profiles")
		.action(() => {
			const raw = parse(readFileSync(configPath, "utf-8")) as Record<string, unknown>;
			const profiles = raw.profiles as Record<string, unknown>;
			const defaultProfile = raw.default as string;
			for (const [name, profile] of Object.entries(profiles)) {
				const marker = name === defaultProfile ? " (default)" : "";
				const p = profile as Record<string, string>;
				console.log(`  ${name}${marker} — ${p.provider} @ ${p.url}`);
			}
		});

	cmd
		.command("add <name>")
		.description("Add a new profile")
		.action(async (name) => {
			const { input, select, password } = await import("@inquirer/prompts");

			const raw = parse(readFileSync(configPath, "utf-8")) as Record<string, unknown>;
			const profiles = (raw.profiles ?? {}) as Record<string, unknown>;

			if (profiles[name]) {
				console.error(`Profile '${name}' already exists. Use 'paasman init' to update it.`);
				process.exit(1);
			}

			const provider = await select({
				message: "Provider",
				choices: [
					{ name: "Coolify", value: "coolify" },
					{ name: "Dokploy", value: "dokploy" },
					{ name: "CapRover", value: "caprover" },
					{ name: "Dokku", value: "dokku" },
				],
			});
			const url = await input({ message: "Server URL" });
			const token = await password({ message: "API token", mask: "*" });

			profiles[name] = { provider, url, token };
			raw.profiles = profiles;
			writeFileSync(configPath, stringify(raw), { mode: 0o600 });
			console.log(`Profile '${name}' added`);
		});

	cmd
		.command("switch <name>")
		.description("Set the default profile")
		.action((name) => {
			const raw = parse(readFileSync(configPath, "utf-8")) as Record<string, unknown>;
			const profiles = raw.profiles as Record<string, unknown>;
			if (!profiles[name]) {
				console.error(`Profile '${name}' not found`);
				process.exit(1);
			}
			raw.default = name;
			writeFileSync(configPath, stringify(raw), { mode: 0o600 });
			console.log(`Default profile set to '${name}'`);
		});

	return cmd;
}
