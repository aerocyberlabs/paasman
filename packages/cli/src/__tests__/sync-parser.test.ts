import { mkdirSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { parsePaasmanYaml } from "../sync/parser.js";

describe("parsePaasmanYaml", () => {
	const testDir = join(tmpdir(), `paasman-sync-test-${Date.now()}`);

	beforeEach(() => {
		mkdirSync(testDir, { recursive: true });
	});

	afterEach(() => {
		rmSync(testDir, { recursive: true, force: true });
	});

	it("parses a valid paasman.yaml with apps and databases", () => {
		const filePath = join(testDir, "paasman.yaml");
		writeFileSync(
			filePath,
			`
profile: prod

apps:
  my-api:
    source:
      type: git
      repository: https://github.com/user/api
      branch: main
    domains:
      - api.example.com
    env:
      NODE_ENV: production

  my-frontend:
    source:
      type: image
      image: nginx:latest
    domains:
      - www.example.com

databases:
  main-db:
    engine: postgresql
    version: "16"
`,
		);

		const result = parsePaasmanYaml(filePath);

		expect(result.profile).toBe("prod");
		expect(Object.keys(result.apps)).toEqual(["my-api", "my-frontend"]);
		expect(result.apps["my-api"].source).toEqual({
			type: "git",
			repository: "https://github.com/user/api",
			branch: "main",
		});
		expect(result.apps["my-api"].domains).toEqual(["api.example.com"]);
		expect(result.apps["my-api"].env).toEqual({ NODE_ENV: "production" });
		expect(result.apps["my-frontend"].source).toEqual({
			type: "image",
			image: "nginx:latest",
		});
		expect(Object.keys(result.databases)).toEqual(["main-db"]);
		expect(result.databases["main-db"]).toEqual({ engine: "postgresql", version: "16" });
	});

	it("parses config with only apps (no databases)", () => {
		const filePath = join(testDir, "paasman.yaml");
		writeFileSync(
			filePath,
			`
apps:
  web:
    source:
      type: image
      image: node:20
`,
		);

		const result = parsePaasmanYaml(filePath);
		expect(Object.keys(result.apps)).toEqual(["web"]);
		expect(Object.keys(result.databases)).toEqual([]);
		expect(result.profile).toBeUndefined();
	});

	it("parses config with only databases (no apps)", () => {
		const filePath = join(testDir, "paasman.yaml");
		writeFileSync(
			filePath,
			`
databases:
  cache:
    engine: redis
`,
		);

		const result = parsePaasmanYaml(filePath);
		expect(Object.keys(result.apps)).toEqual([]);
		expect(Object.keys(result.databases)).toEqual(["cache"]);
	});

	it("throws on missing file", () => {
		expect(() => parsePaasmanYaml(join(testDir, "nope.yaml"))).toThrow("not found");
	});

	it("throws on empty config (no apps or databases)", () => {
		const filePath = join(testDir, "paasman.yaml");
		writeFileSync(filePath, "profile: prod\n");
		expect(() => parsePaasmanYaml(filePath)).toThrow("at least one app or database");
	});

	it("throws on app with missing source", () => {
		const filePath = join(testDir, "paasman.yaml");
		writeFileSync(
			filePath,
			`
apps:
  bad-app:
    domains:
      - example.com
`,
		);
		expect(() => parsePaasmanYaml(filePath)).toThrow("App 'bad-app' must have a 'source'");
	});

	it("throws on app with invalid source type", () => {
		const filePath = join(testDir, "paasman.yaml");
		writeFileSync(
			filePath,
			`
apps:
  bad-app:
    source:
      type: ftp
      url: ftp://example.com
`,
		);
		expect(() => parsePaasmanYaml(filePath)).toThrow("type 'git' or 'image'");
	});

	it("throws on git source without repository", () => {
		const filePath = join(testDir, "paasman.yaml");
		writeFileSync(
			filePath,
			`
apps:
  bad-app:
    source:
      type: git
`,
		);
		expect(() => parsePaasmanYaml(filePath)).toThrow("git source must have a 'repository'");
	});

	it("throws on image source without image", () => {
		const filePath = join(testDir, "paasman.yaml");
		writeFileSync(
			filePath,
			`
apps:
  bad-app:
    source:
      type: image
`,
		);
		expect(() => parsePaasmanYaml(filePath)).toThrow("image source must have an 'image'");
	});

	it("throws on database with missing engine", () => {
		const filePath = join(testDir, "paasman.yaml");
		writeFileSync(
			filePath,
			`
databases:
  bad-db:
    version: "16"
`,
		);
		expect(() => parsePaasmanYaml(filePath)).toThrow("must have an 'engine'");
	});

	it("throws on database with invalid engine", () => {
		const filePath = join(testDir, "paasman.yaml");
		writeFileSync(
			filePath,
			`
databases:
  bad-db:
    engine: sqlite
`,
		);
		expect(() => parsePaasmanYaml(filePath)).toThrow("engine must be one of");
	});

	it("interpolates PAASMAN_ prefixed env vars from process.env", () => {
		process.env.PAASMAN_DB_URL = "postgres://localhost/test";
		const filePath = join(testDir, "paasman.yaml");
		writeFileSync(
			filePath,
			`
apps:
  api:
    source:
      type: image
      image: node:20
    env:
      DATABASE_URL: \${PAASMAN_DB_URL}
`,
		);

		const result = parsePaasmanYaml(filePath);
		expect(result.apps.api.env).toEqual({
			DATABASE_URL: "postgres://localhost/test",
		});
		delete process.env.PAASMAN_DB_URL;
	});

	it("rejects non-PAASMAN/APP prefixed env vars for security", () => {
		const filePath = join(testDir, "paasman.yaml");
		writeFileSync(
			filePath,
			`
apps:
  api:
    source:
      type: image
      image: node:20
    env:
      SECRET: \${GITHUB_TOKEN}
`,
		);
		expect(() => parsePaasmanYaml(filePath)).toThrow("not allowed");
	});

	it("throws on unset env var reference", () => {
		const filePath = join(testDir, "paasman.yaml");
		writeFileSync(
			filePath,
			`
apps:
  api:
    source:
      type: image
      image: node:20
    env:
      SECRET: \${PAASMAN_NONEXISTENT_VAR_XYZ}
`,
		);
		expect(() => parsePaasmanYaml(filePath)).toThrow("PAASMAN_NONEXISTENT_VAR_XYZ");
	});

	it("parses git source without branch (optional)", () => {
		const filePath = join(testDir, "paasman.yaml");
		writeFileSync(
			filePath,
			`
apps:
  api:
    source:
      type: git
      repository: https://github.com/user/api
`,
		);

		const result = parsePaasmanYaml(filePath);
		expect(result.apps.api.source).toEqual({
			type: "git",
			repository: "https://github.com/user/api",
			branch: undefined,
		});
	});
});
