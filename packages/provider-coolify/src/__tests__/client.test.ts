import { AuthError, ConnectionError, NotFoundError, ProviderError } from "@paasman/core";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { CoolifyClient } from "../client.js";

describe("CoolifyClient", () => {
	let client: CoolifyClient;

	beforeEach(() => {
		client = new CoolifyClient("https://coolify.example.com", "test-token");
	});

	afterEach(() => {
		vi.unstubAllGlobals();
	});

	it("sets authorization header", async () => {
		const mockFetch = vi.fn().mockResolvedValue({
			ok: true,
			status: 200,
			json: () => Promise.resolve({ data: [] }),
		});
		vi.stubGlobal("fetch", mockFetch);

		await client.get("/api/v1/applications");

		expect(mockFetch).toHaveBeenCalledWith(
			"https://coolify.example.com/api/v1/applications",
			expect.objectContaining({
				headers: expect.objectContaining({
					Authorization: "Bearer test-token",
				}),
			}),
		);
	});

	it("throws AuthError on 401", async () => {
		vi.stubGlobal(
			"fetch",
			vi.fn().mockResolvedValue({
				ok: false,
				status: 401,
				json: () => Promise.resolve({ message: "Unauthorized" }),
			}),
		);

		await expect(client.get("/api/v1/applications")).rejects.toThrow(AuthError);
	});

	it("throws AuthError on 403", async () => {
		vi.stubGlobal(
			"fetch",
			vi.fn().mockResolvedValue({
				ok: false,
				status: 403,
				json: () => Promise.resolve({ message: "Forbidden" }),
			}),
		);

		await expect(client.get("/api/v1/applications")).rejects.toThrow(AuthError);
	});

	it("throws NotFoundError on 404", async () => {
		vi.stubGlobal(
			"fetch",
			vi.fn().mockResolvedValue({
				ok: false,
				status: 404,
				json: () => Promise.resolve({ message: "Not found" }),
			}),
		);

		await expect(client.get("/api/v1/applications/xyz")).rejects.toThrow(NotFoundError);
	});

	it("throws ProviderError on 500", async () => {
		vi.stubGlobal(
			"fetch",
			vi.fn().mockResolvedValue({
				ok: false,
				status: 500,
				json: () => Promise.resolve({ error: "internal" }),
			}),
		);

		await expect(client.get("/test")).rejects.toThrow(ProviderError);
	});

	it("throws ConnectionError on network failure", async () => {
		vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new Error("ECONNREFUSED")));

		await expect(client.get("/test")).rejects.toThrow(ConnectionError);
	});

	it("post sends JSON body", async () => {
		const mockFetch = vi.fn().mockResolvedValue({
			ok: true,
			status: 200,
			json: () => Promise.resolve({ uuid: "123" }),
		});
		vi.stubGlobal("fetch", mockFetch);

		await client.post("/api/v1/applications", { name: "test" });

		expect(mockFetch).toHaveBeenCalledWith(
			"https://coolify.example.com/api/v1/applications",
			expect.objectContaining({
				method: "POST",
				body: JSON.stringify({ name: "test" }),
			}),
		);
	});

	it("patch sends JSON body", async () => {
		const mockFetch = vi.fn().mockResolvedValue({
			ok: true,
			status: 200,
			json: () => Promise.resolve({}),
		});
		vi.stubGlobal("fetch", mockFetch);

		await client.patch("/api/v1/applications/123/envs/bulk", [{ key: "A", value: "B" }]);

		expect(mockFetch).toHaveBeenCalledWith(
			"https://coolify.example.com/api/v1/applications/123/envs/bulk",
			expect.objectContaining({
				method: "PATCH",
				body: JSON.stringify([{ key: "A", value: "B" }]),
			}),
		);
	});

	it("del sends DELETE request", async () => {
		const mockFetch = vi.fn().mockResolvedValue({
			ok: true,
			status: 200,
			json: () => Promise.resolve({}),
		});
		vi.stubGlobal("fetch", mockFetch);

		await client.del("/api/v1/applications/123");

		expect(mockFetch).toHaveBeenCalledWith(
			"https://coolify.example.com/api/v1/applications/123",
			expect.objectContaining({
				method: "DELETE",
			}),
		);
	});
});
