import { readFileSync } from "node:fs";
import { homedir } from "node:os";
import { join } from "node:path";
import { WebhookManager } from "@paasman/webhooks";
import type { WebhookConfig } from "@paasman/webhooks";
import { parse } from "yaml";

interface RawWebhookEntry {
	url: string;
	format?: string;
	events?: string[];
}

export function getWebhookManager(): WebhookManager | null {
	try {
		const configPath = join(homedir(), ".paasman", "config.yaml");
		const content = readFileSync(configPath, "utf-8");
		const raw = parse(content) as Record<string, unknown>;

		if (!raw.webhooks || !Array.isArray(raw.webhooks) || raw.webhooks.length === 0) {
			return null;
		}

		const configs: WebhookConfig[] = (raw.webhooks as RawWebhookEntry[]).map((entry) => ({
			url: entry.url,
			format: (entry.format as WebhookConfig["format"]) ?? "generic",
			events: entry.events ?? ["deploy"],
		}));

		return new WebhookManager(configs);
	} catch {
		return null;
	}
}
