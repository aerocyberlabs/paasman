import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { homedir } from "node:os";
import { join } from "node:path";
import { Command } from "commander";
import { parse, stringify } from "yaml";

export function initCommand(): Command {
	const cmd = new Command("init")
		.description("Initialize Paasman configuration")
		.action(async () => {
			const { input, select, password, confirm } = await import("@inquirer/prompts");

			const configDir = join(homedir(), ".paasman");
			const configPath = join(configDir, "config.yaml");

			// Load existing config if present
			let existingConfig: Record<string, unknown> | null = null;
			if (existsSync(configPath)) {
				existingConfig = parse(readFileSync(configPath, "utf-8")) as Record<string, unknown>;
				const existingProfiles = Object.keys(
					(existingConfig.profiles ?? {}) as Record<string, unknown>,
				);
				if (existingProfiles.length > 0) {
					console.log(`Existing config found with profiles: ${existingProfiles.join(", ")}`);
					console.log("New profile will be added to existing config.");
				}
			}

			const profileName = await input({ message: "Profile name", default: "default" });

			if (existingConfig) {
				const profiles = (existingConfig.profiles ?? {}) as Record<string, unknown>;
				if (profiles[profileName]) {
					const overwrite = await confirm({
						message: `Profile '${profileName}' already exists. Overwrite?`,
						default: false,
					});
					if (!overwrite) {
						console.log("Aborted.");
						return;
					}
				}
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
			const url = await input({ message: "Server URL (e.g., https://coolify.example.com)" });
			const token = await password({ message: "API token", mask: "*" });

			mkdirSync(configDir, { recursive: true, mode: 0o700 });

			// Merge with existing config
			const config = existingConfig ?? { profiles: {}, default: profileName };
			const profiles = (config.profiles ?? {}) as Record<string, unknown>;
			profiles[profileName] = { provider, url, token };
			config.profiles = profiles;
			if (!config.default) {
				config.default = profileName;
			}

			writeFileSync(configPath, stringify(config), { mode: 0o600 });
			console.log(`Profile '${profileName}' saved to ${configPath}`);
			console.log("\nTip: For security, replace the token in config.yaml with ${ENV_VAR_NAME}");
		});

	return cmd;
}
