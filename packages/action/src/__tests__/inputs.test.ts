import { beforeEach, describe, expect, it, vi } from "vitest";

const mockInputs: Record<string, string> = {};

vi.mock("@actions/core", () => ({
	getInput: vi.fn((name: string, opts?: { required?: boolean }) => {
		const val = mockInputs[name] ?? "";
		if (opts?.required && !val) {
			throw new Error(`Input required and not supplied: ${name}`);
		}
		return val;
	}),
}));

function setInputs(map: Record<string, string>) {
	for (const key of Object.keys(mockInputs)) delete mockInputs[key];
	Object.assign(mockInputs, map);
}

import { parseInputs } from "../inputs.js";

describe("parseInputs", () => {
	beforeEach(() => {
		setInputs({});
	});

	it("parses all required inputs", () => {
		setInputs({
			provider: "coolify",
			"server-url": "https://coolify.example.com",
			token: "secret-token",
			"app-id": "my-app-uuid",
		});

		const inputs = parseInputs();
		expect(inputs.provider).toBe("coolify");
		expect(inputs.serverUrl).toBe("https://coolify.example.com");
		expect(inputs.token).toBe("secret-token");
		expect(inputs.appId).toBe("my-app-uuid");
		expect(inputs.command).toBe("deploy");
		expect(inputs.force).toBe(false);
		expect(inputs.envFile).toBeUndefined();
	});

	it("parses command and force inputs", () => {
		setInputs({
			provider: "dokploy",
			"server-url": "https://dokploy.example.com",
			token: "my-token",
			"app-id": "app-123",
			command: "restart",
			force: "true",
		});

		const inputs = parseInputs();
		expect(inputs.command).toBe("restart");
		expect(inputs.force).toBe(true);
	});

	it("parses env-file input", () => {
		setInputs({
			provider: "caprover",
			"server-url": "https://caprover.example.com",
			token: "cap-token",
			"app-id": "app-456",
			command: "env-push",
			"env-file": ".env.production",
		});

		const inputs = parseInputs();
		expect(inputs.command).toBe("env-push");
		expect(inputs.envFile).toBe(".env.production");
	});

	it("throws when required inputs are missing", () => {
		setInputs({});
		expect(() => parseInputs()).toThrow("Input required and not supplied: provider");
	});

	it('defaults force to false when not "true"', () => {
		setInputs({
			provider: "dokku",
			"server-url": "ssh://dokku.example.com",
			token: "ssh-key",
			"app-id": "app-789",
			force: "false",
		});

		const inputs = parseInputs();
		expect(inputs.force).toBe(false);
	});

	it("defaults command to deploy when empty", () => {
		setInputs({
			provider: "coolify",
			"server-url": "https://coolify.example.com",
			token: "token",
			"app-id": "app-000",
			command: "",
		});

		const inputs = parseInputs();
		expect(inputs.command).toBe("deploy");
	});
});
