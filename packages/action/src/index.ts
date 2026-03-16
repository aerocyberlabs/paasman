import * as core from "@actions/core";
import { Paasman } from "@paasman/core";
import { parseInputs } from "./inputs.js";

async function run() {
	try {
		const inputs = parseInputs();

		// Validate provider name
		const VALID_PROVIDERS = ["coolify", "dokploy", "caprover", "dokku"];
		if (!VALID_PROVIDERS.includes(inputs.provider)) {
			core.setFailed(`Unknown provider '${inputs.provider}'. Valid: ${VALID_PROVIDERS.join(", ")}`);
			return;
		}

		const providerModule = await import(`@paasman/provider-${inputs.provider}`);
		const ProviderClass = Object.values(providerModule).find((v) => typeof v === "function") as any;
		const provider = new ProviderClass({ baseUrl: inputs.serverUrl, token: inputs.token });
		const pm = new Paasman({ provider });

		switch (inputs.command) {
			case "deploy": {
				core.info(`Deploying ${inputs.appId}...`);
				const deployment = await pm.apps.deploy(inputs.appId, { force: inputs.force });
				core.info(`Deployment triggered: ${deployment.id}`);
				core.setOutput("deployment-id", deployment.id);
				break;
			}
			case "stop": {
				if (!pm.capabilities.apps.stop || !pm.apps.stop) {
					core.setFailed(`Provider '${inputs.provider}' does not support 'stop'`);
					return;
				}
				await pm.apps.stop(inputs.appId);
				core.info(`Application ${inputs.appId} stopped`);
				break;
			}
			case "restart": {
				if (!pm.capabilities.apps.restart || !pm.apps.restart) {
					core.setFailed(`Provider '${inputs.provider}' does not support 'restart'`);
					return;
				}
				await pm.apps.restart(inputs.appId);
				core.info(`Application ${inputs.appId} restarted`);
				break;
			}
			case "env-push": {
				const { readFileSync } = await import("node:fs");
				const content = readFileSync(inputs.envFile!, "utf-8");
				const vars: Record<string, string> = {};
				for (const line of content.split("\n")) {
					const trimmed = line.trim();
					if (!trimmed || trimmed.startsWith("#")) continue;
					const [key, ...rest] = trimmed.split("=");
					let value = rest.join("=");
					if (
						(value.startsWith('"') && value.endsWith('"')) ||
						(value.startsWith("'") && value.endsWith("'"))
					) {
						value = value.slice(1, -1);
					}
					vars[key] = value;
				}
				await pm.env.push(inputs.appId, vars);
				core.info(`Pushed ${Object.keys(vars).length} env vars`);
				break;
			}
			default:
				core.setFailed(`Unknown command: ${inputs.command}`);
		}
	} catch (error) {
		core.setFailed(error instanceof Error ? error.message : String(error));
	}
}

run();
