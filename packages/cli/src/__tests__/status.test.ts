import type { App } from "@paasman/core";
import { describe, expect, it, vi } from "vitest";
import { createProvider } from "../commands/status.js";
import type { ProfileConfig } from "../config.js";
import { type AllProfilesAppRow, formatAllProfilesAppsTable } from "../formatters.js";

describe("createProvider", () => {
	it("returns null when provider module cannot be loaded", async () => {
		const profile: ProfileConfig = {
			provider: "nonexistent-provider-xyz",
			url: "https://example.com",
			token: "test-token",
		};
		const result = await createProvider(profile);
		expect(result).toBeNull();
	});

	it("returns null gracefully without throwing", async () => {
		const profile: ProfileConfig = {
			provider: "../../malicious",
			url: "https://example.com",
			token: "test-token",
		};
		// Should not throw, just return null
		await expect(createProvider(profile)).resolves.toBeNull();
	});
});

describe("formatAllProfilesAppsTable", () => {
	const makeApp = (overrides: Partial<App> = {}): App => ({
		id: "app-123456789012",
		name: "my-app",
		status: "running",
		domains: ["app.example.com"],
		createdAt: new Date("2026-01-01"),
		updatedAt: new Date("2026-01-15"),
		meta: {},
		raw: {},
		...overrides,
	});

	it("renders apps from multiple profiles", () => {
		const rows: AllProfilesAppRow[] = [
			{ profile: "prod", app: makeApp({ name: "web" }) },
			{ profile: "staging", app: makeApp({ name: "api" }) },
		];
		const output = formatAllProfilesAppsTable(rows);
		expect(output).toContain("prod");
		expect(output).toContain("staging");
		expect(output).toContain("web");
		expect(output).toContain("api");
	});

	it("shows error row for failed profiles", () => {
		const rows: AllProfilesAppRow[] = [{ profile: "broken", error: "Connection refused" }];
		const output = formatAllProfilesAppsTable(rows);
		expect(output).toContain("broken");
		expect(output).toContain("Connection refused");
		expect(output).toContain("error");
	});

	it('shows "No apps" for profiles with no applications', () => {
		const rows: AllProfilesAppRow[] = [{ profile: "empty" }];
		const output = formatAllProfilesAppsTable(rows);
		expect(output).toContain("empty");
		expect(output).toContain("No apps");
	});

	it("handles a mix of successful and failed profiles", () => {
		const rows: AllProfilesAppRow[] = [
			{ profile: "prod", app: makeApp({ name: "web" }) },
			{ profile: "broken", error: "timeout" },
			{ profile: "empty" },
		];
		const output = formatAllProfilesAppsTable(rows);
		expect(output).toContain("prod");
		expect(output).toContain("web");
		expect(output).toContain("broken");
		expect(output).toContain("timeout");
		expect(output).toContain("empty");
		expect(output).toContain("No apps");
	});

	it("truncates app IDs to 12 characters", () => {
		const rows: AllProfilesAppRow[] = [
			{ profile: "test", app: makeApp({ id: "abcdefghijklmnopqrst" }) },
		];
		const output = formatAllProfilesAppsTable(rows);
		expect(output).toContain("abcdefghijkl");
		expect(output).not.toContain("abcdefghijklm");
	});
});
