import { mkdirSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { interpolateEnvVars, loadConfig } from "../config.js";

describe("interpolateEnvVars", () => {
	it("replaces ${VAR} with env value", () => {
		process.env.TEST_TOKEN = "secret123";
		expect(interpolateEnvVars("${TEST_TOKEN}")).toBe("secret123");
		delete process.env.TEST_TOKEN;
	});

	it("throws on missing env var", () => {
		expect(() => interpolateEnvVars("${NONEXISTENT_VAR_XYZ}")).toThrow();
	});

	it("leaves strings without ${} untouched", () => {
		expect(interpolateEnvVars("plain-string")).toBe("plain-string");
	});

	it("replaces multiple vars in one string", () => {
		process.env.TEST_HOST = "localhost";
		process.env.TEST_PORT = "8080";
		expect(interpolateEnvVars("${TEST_HOST}:${TEST_PORT}")).toBe("localhost:8080");
		delete process.env.TEST_HOST;
		delete process.env.TEST_PORT;
	});
});

describe("loadConfig", () => {
	const testDir = join(tmpdir(), `paasman-test-${Date.now()}`);

	beforeEach(() => {
		mkdirSync(testDir, { recursive: true });
	});

	afterEach(() => {
		rmSync(testDir, { recursive: true, force: true });
	});

	it("loads a valid config file", () => {
		const configPath = join(testDir, "config.yaml");
		process.env.TEST_COOLIFY_TOKEN = "tok123";
		writeFileSync(
			configPath,
			`
profiles:
  prod:
    provider: coolify
    url: https://coolify.example.com
    token: \${TEST_COOLIFY_TOKEN}
default: prod
`,
		);
		const config = loadConfig(configPath);
		expect(config.default).toBe("prod");
		expect(config.profiles.prod.provider).toBe("coolify");
		expect(config.profiles.prod.token).toBe("tok123");
		delete process.env.TEST_COOLIFY_TOKEN;
	});

	it("throws on missing config file", () => {
		expect(() => loadConfig(join(testDir, "nope.yaml"))).toThrow();
	});

	it("throws on config without profiles section", () => {
		const configPath = join(testDir, "bad.yaml");
		writeFileSync(configPath, "default: prod\n");
		expect(() => loadConfig(configPath)).toThrow("profiles");
	});

	it("defaults to first profile if no default specified", () => {
		const configPath = join(testDir, "nodefault.yaml");
		writeFileSync(
			configPath,
			`
profiles:
  staging:
    provider: coolify
    url: https://staging.example.com
    token: tok-staging
`,
		);
		const config = loadConfig(configPath);
		expect(config.default).toBe("staging");
	});
});
