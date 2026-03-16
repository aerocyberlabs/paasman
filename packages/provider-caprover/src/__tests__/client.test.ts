import { AuthError, ConnectionError, NotFoundError, ProviderError } from "@paasman/core";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { CapRoverClient } from "../client.js";

describe("CapRoverClient", () => {
	let client: CapRoverClient;

	beforeEach(() => {
		client = new CapRoverClient({ baseUrl: "https://captain.example.com", password: "test-pass" });
	});

	afterEach(() => {
		vi.unstubAllGlobals();
	});

	function mockLogin() {
		return vi.fn().mockResolvedValueOnce({
			ok: true,
			status: 200,
			json: () => Promise.resolve({ status: 100, data: { token: "test-token-123" } }),
		});
	}

	it("authenticates on first request and uses x-captain-auth header", async () => {
		const mockFetch = mockLogin().mockResolvedValueOnce({
			ok: true,
			status: 200,
			json: () => Promise.resolve({ status: 100, data: { appDefinitions: [] } }),
		});
		vi.stubGlobal("fetch", mockFetch);

		await client.get("/api/v2/user/apps/appDefinitions");

		// First call: login
		expect(mockFetch).toHaveBeenCalledWith(
			"https://captain.example.com/api/v2/login",
			expect.objectContaining({
				method: "POST",
				body: JSON.stringify({ password: "test-pass" }),
			}),
		);

		// Second call: actual request with token
		expect(mockFetch).toHaveBeenCalledWith(
			"https://captain.example.com/api/v2/user/apps/appDefinitions",
			expect.objectContaining({
				headers: expect.objectContaining({
					"x-captain-auth": "test-token-123",
				}),
			}),
		);
	});

	it("caches token across requests", async () => {
		const mockFetch = mockLogin()
			.mockResolvedValueOnce({
				ok: true,
				status: 200,
				json: () => Promise.resolve({ status: 100, data: [] }),
			})
			.mockResolvedValueOnce({
				ok: true,
				status: 200,
				json: () => Promise.resolve({ status: 100, data: [] }),
			});
		vi.stubGlobal("fetch", mockFetch);

		await client.get("/api/v2/user/apps/appDefinitions");
		await client.get("/api/v2/user/system/nodes");

		// login called only once (first call), then 2 data calls = 3 total
		expect(mockFetch).toHaveBeenCalledTimes(3);
	});

	it("throws AuthError on 401 during login", async () => {
		vi.stubGlobal(
			"fetch",
			vi.fn().mockResolvedValue({
				ok: false,
				status: 401,
				json: () => Promise.resolve({ message: "Unauthorized" }),
			}),
		);

		await expect(client.get("/api/v2/user/apps/appDefinitions")).rejects.toThrow(AuthError);
	});

	it("throws AuthError on 401 during request", async () => {
		const mockFetch = mockLogin().mockResolvedValueOnce({
			ok: false,
			status: 401,
			json: () => Promise.resolve({ message: "Unauthorized" }),
		});
		vi.stubGlobal("fetch", mockFetch);

		await expect(client.get("/api/v2/user/apps/appDefinitions")).rejects.toThrow(AuthError);
	});

	it("throws NotFoundError on 404", async () => {
		const mockFetch = mockLogin().mockResolvedValueOnce({
			ok: false,
			status: 404,
			json: () => Promise.resolve({ message: "Not found" }),
		});
		vi.stubGlobal("fetch", mockFetch);

		await expect(client.get("/api/v2/user/apps/xyz")).rejects.toThrow(NotFoundError);
	});

	it("throws ProviderError on 500", async () => {
		const mockFetch = mockLogin().mockResolvedValueOnce({
			ok: false,
			status: 500,
			json: () => Promise.resolve({ error: "internal" }),
		});
		vi.stubGlobal("fetch", mockFetch);

		await expect(client.get("/test")).rejects.toThrow(ProviderError);
	});

	it("throws ConnectionError on network failure", async () => {
		vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new Error("ECONNREFUSED")));

		await expect(client.get("/test")).rejects.toThrow(ConnectionError);
	});

	it("post sends JSON body", async () => {
		const mockFetch = mockLogin().mockResolvedValueOnce({
			ok: true,
			status: 200,
			json: () => Promise.resolve({ status: 100, data: {} }),
		});
		vi.stubGlobal("fetch", mockFetch);

		await client.post("/api/v2/user/apps/appDefinitions/register", { appName: "test" });

		expect(mockFetch).toHaveBeenCalledWith(
			"https://captain.example.com/api/v2/user/apps/appDefinitions/register",
			expect.objectContaining({
				method: "POST",
				body: JSON.stringify({ appName: "test" }),
			}),
		);
	});

	it("unwraps data from CapRover response envelope", async () => {
		const mockFetch = mockLogin().mockResolvedValueOnce({
			ok: true,
			status: 200,
			json: () =>
				Promise.resolve({
					status: 100,
					description: "OK",
					data: { appDefinitions: [{ appName: "my-app" }] },
				}),
		});
		vi.stubGlobal("fetch", mockFetch);

		const result = await client.get<{ appDefinitions: unknown[] }>(
			"/api/v2/user/apps/appDefinitions",
		);
		expect(result.appDefinitions).toHaveLength(1);
	});

	it("strips trailing slashes from base URL", async () => {
		const clientWithSlash = new CapRoverClient({
			baseUrl: "https://captain.example.com/",
			password: "pass",
		});
		const mockFetch = vi
			.fn()
			.mockResolvedValueOnce({
				ok: true,
				status: 200,
				json: () => Promise.resolve({ status: 100, data: { token: "tok" } }),
			})
			.mockResolvedValueOnce({
				ok: true,
				status: 200,
				json: () => Promise.resolve({ status: 100, data: [] }),
			});
		vi.stubGlobal("fetch", mockFetch);

		await clientWithSlash.get("/api/v2/user/system/nodes");

		expect(mockFetch).toHaveBeenCalledWith(
			"https://captain.example.com/api/v2/login",
			expect.anything(),
		);
	});
});
