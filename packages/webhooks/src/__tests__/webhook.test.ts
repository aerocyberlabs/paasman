import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { WebhookManager } from "../webhook.js";
import type { WebhookConfig, WebhookEvent } from "../webhook.js";

const deployEvent: WebhookEvent = {
	event: "deploy",
	profile: "prod",
	provider: "coolify",
	app: { id: "abc-123", name: "my-app" },
	deployment: { id: "dep-456", status: "success" },
};

function mockFetchOk() {
	return vi.fn().mockResolvedValue({
		ok: true,
		status: 200,
		statusText: "OK",
	});
}

function mockFetchFail(status = 500, statusText = "Internal Server Error") {
	return vi.fn().mockResolvedValue({
		ok: false,
		status,
		statusText,
	});
}

describe("WebhookManager", () => {
	let originalFetch: typeof globalThis.fetch;

	beforeEach(() => {
		originalFetch = globalThis.fetch;
	});

	afterEach(() => {
		globalThis.fetch = originalFetch;
		vi.restoreAllMocks();
	});

	it("sends to all webhooks matching the event type", async () => {
		const fetchMock = mockFetchOk();
		globalThis.fetch = fetchMock;

		const configs: WebhookConfig[] = [
			{ url: "https://slack.example.com/hook", format: "slack", events: ["deploy"] },
			{ url: "https://discord.example.com/hook", format: "discord", events: ["deploy"] },
			{ url: "https://generic.example.com/hook", format: "generic", events: ["stop"] },
		];

		const manager = new WebhookManager(configs);
		await manager.notify(deployEvent);

		expect(fetchMock).toHaveBeenCalledTimes(2);

		const urls = fetchMock.mock.calls.map((c: unknown[]) => c[0]);
		expect(urls).toContain("https://slack.example.com/hook");
		expect(urls).toContain("https://discord.example.com/hook");
	});

	it("does not send to webhooks that do not match the event", async () => {
		const fetchMock = mockFetchOk();
		globalThis.fetch = fetchMock;

		const configs: WebhookConfig[] = [
			{ url: "https://example.com/hook", format: "generic", events: ["stop", "restart"] },
		];

		const manager = new WebhookManager(configs);
		await manager.notify(deployEvent);

		expect(fetchMock).not.toHaveBeenCalled();
	});

	it("sends correct payload format for each webhook", async () => {
		const fetchMock = mockFetchOk();
		globalThis.fetch = fetchMock;

		const configs: WebhookConfig[] = [
			{ url: "https://slack.example.com/hook", format: "slack", events: ["deploy"] },
		];

		const manager = new WebhookManager(configs);
		await manager.notify(deployEvent);

		const callArgs = fetchMock.mock.calls[0];
		const body = JSON.parse(callArgs[1].body);
		expect(body.text).toContain("*my-app*");
		expect(body.blocks).toBeDefined();
		expect(callArgs[1].headers["Content-Type"]).toBe("application/json");
	});

	it("does not throw when a webhook fails (fire-and-forget)", async () => {
		const fetchMock = mockFetchFail();
		globalThis.fetch = fetchMock;
		const consoleSpy = vi.spyOn(console, "error").mockImplementation(() => {});

		const configs: WebhookConfig[] = [
			{ url: "https://broken.example.com/hook", format: "generic", events: ["deploy"] },
		];

		const manager = new WebhookManager(configs);

		// Should not throw
		await expect(manager.notify(deployEvent)).resolves.toBeUndefined();
		expect(consoleSpy).toHaveBeenCalledWith(expect.stringContaining("delivery failed"));
	});

	it("does not throw when fetch itself rejects", async () => {
		globalThis.fetch = vi.fn().mockRejectedValue(new Error("Network error"));
		const consoleSpy = vi.spyOn(console, "error").mockImplementation(() => {});

		const configs: WebhookConfig[] = [
			{ url: "https://unreachable.example.com/hook", format: "generic", events: ["deploy"] },
		];

		const manager = new WebhookManager(configs);
		await expect(manager.notify(deployEvent)).resolves.toBeUndefined();
		expect(consoleSpy).toHaveBeenCalled();
	});

	it("handles empty configs gracefully", async () => {
		const fetchMock = mockFetchOk();
		globalThis.fetch = fetchMock;

		const manager = new WebhookManager([]);
		await manager.notify(deployEvent);

		expect(fetchMock).not.toHaveBeenCalled();
	});

	it("uses POST method with correct content type", async () => {
		const fetchMock = mockFetchOk();
		globalThis.fetch = fetchMock;

		const configs: WebhookConfig[] = [
			{ url: "https://example.com/hook", format: "generic", events: ["deploy"] },
		];

		const manager = new WebhookManager(configs);
		await manager.notify(deployEvent);

		const callArgs = fetchMock.mock.calls[0];
		expect(callArgs[1].method).toBe("POST");
		expect(callArgs[1].headers["Content-Type"]).toBe("application/json");
	});
});
