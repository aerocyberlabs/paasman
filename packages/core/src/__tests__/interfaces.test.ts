import { describe, expect, it } from "vitest";
import type {
	AppOperations,
	EnvOperations,
	PaasProvider,
	ProviderCapabilities,
} from "../interfaces.js";
import { validateCapabilities } from "../interfaces.js";

describe("Provider interfaces", () => {
	it("validateCapabilities returns true for valid full capabilities", () => {
		const caps: ProviderCapabilities = {
			apps: { start: true, stop: true, restart: true, logs: true },
			servers: true,
			databases: true,
			deployments: { list: true, cancel: true },
		};
		expect(validateCapabilities(caps)).toBe(true);
	});

	it("validateCapabilities returns true for minimal capabilities", () => {
		const caps: ProviderCapabilities = {
			apps: { start: false, stop: false, restart: false, logs: false },
			servers: false,
			databases: false,
			deployments: { list: false, cancel: false },
		};
		expect(validateCapabilities(caps)).toBe(true);
	});
});
