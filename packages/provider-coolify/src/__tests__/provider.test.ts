import { beforeEach, describe, expect, it, vi } from "vitest";
import { CoolifyProvider } from "../provider.js";
import type { CoolifyProviderConfig } from "../provider.js";

const mockGet = vi.fn().mockResolvedValue([]);
const mockPost = vi.fn().mockResolvedValue({});
const mockPatch = vi.fn().mockResolvedValue({});
const mockDel = vi.fn().mockResolvedValue({});

// Mock the client module with a real class so `new CoolifyClient()` works
vi.mock("../client.js", () => ({
	CoolifyClient: class MockCoolifyClient {
		get = mockGet;
		post = mockPost;
		patch = mockPatch;
		del = mockDel;
	},
}));

const mockClient = { get: mockGet, post: mockPost, patch: mockPatch, del: mockDel };

describe("CoolifyProvider", () => {
	let provider: CoolifyProvider;

	beforeEach(() => {
		vi.clearAllMocks();
		mockClient.get.mockResolvedValue([]);
		mockClient.post.mockResolvedValue({});
		mockClient.patch.mockResolvedValue({});
		mockClient.del.mockResolvedValue({});

		provider = new CoolifyProvider({
			baseUrl: "https://coolify.example.com",
			token: "test-token",
		});
	});

	it("has correct name and version", () => {
		expect(provider.name).toBe("coolify");
		expect(provider.version).toBeDefined();
	});

	it("has full capabilities", () => {
		expect(provider.capabilities).toEqual({
			apps: { start: true, stop: true, restart: true, logs: true },
			servers: true,
			databases: true,
			deployments: { list: true, cancel: true },
		});
	});

	it("apps is defined with all methods", () => {
		expect(provider.apps).toBeDefined();
		expect(typeof provider.apps.list).toBe("function");
		expect(typeof provider.apps.get).toBe("function");
		expect(typeof provider.apps.create).toBe("function");
		expect(typeof provider.apps.delete).toBe("function");
		expect(typeof provider.apps.deploy).toBe("function");
		expect(typeof provider.apps.start).toBe("function");
		expect(typeof provider.apps.stop).toBe("function");
		expect(typeof provider.apps.restart).toBe("function");
		expect(typeof provider.apps.logs).toBe("function");
	});

	it("env is defined with all methods", () => {
		expect(provider.env).toBeDefined();
		expect(typeof provider.env.list).toBe("function");
		expect(typeof provider.env.set).toBe("function");
		expect(typeof provider.env.delete).toBe("function");
		expect(typeof provider.env.pull).toBe("function");
		expect(typeof provider.env.push).toBe("function");
	});

	it("servers is defined", () => {
		expect(provider.servers).toBeDefined();
		expect(typeof provider.servers!.list).toBe("function");
		expect(typeof provider.servers!.get).toBe("function");
	});

	it("databases is defined", () => {
		expect(provider.databases).toBeDefined();
		expect(typeof provider.databases!.list).toBe("function");
		expect(typeof provider.databases!.get).toBe("function");
		expect(typeof provider.databases!.create).toBe("function");
		expect(typeof provider.databases!.delete).toBe("function");
	});

	it("deployments is defined", () => {
		expect(provider.deployments).toBeDefined();
		expect(typeof provider.deployments!.list).toBe("function");
		expect(typeof provider.deployments!.get).toBe("function");
		expect(typeof provider.deployments!.cancel).toBe("function");
	});

	// Task 19: test logs async generator
	it("apps.logs yields log lines", async () => {
		mockClient.get.mockResolvedValue(["line 1", "line 2", "line 3"]);

		const lines: Array<{ message: string }> = [];
		for await (const line of provider.apps.logs!("app-1")) {
			lines.push(line);
		}

		expect(lines).toHaveLength(3);
		expect(lines[0].message).toBe("line 1");
		expect(lines[1].message).toBe("line 2");
		expect(lines[2].message).toBe("line 3");
		expect(mockClient.get).toHaveBeenCalledWith("/api/v1/applications/app-1/logs");
	});

	it("apps.logs passes lines option as limit param", async () => {
		mockClient.get.mockResolvedValue(["line 1"]);

		const lines: Array<{ message: string }> = [];
		for await (const line of provider.apps.logs!("app-1", { lines: 50 })) {
			lines.push(line);
		}

		expect(mockClient.get).toHaveBeenCalledWith("/api/v1/applications/app-1/logs?limit=50");
	});

	// Task 21: test env.set is additive merge
	it("env.set sends PATCH with entries", async () => {
		await provider.env.set("app-1", { DB_HOST: "localhost", DB_PORT: "5432" });

		expect(mockClient.patch).toHaveBeenCalledWith("/api/v1/applications/app-1/envs/bulk", [
			{ key: "DB_HOST", value: "localhost", is_build_time: false, is_preview: false },
			{ key: "DB_PORT", value: "5432", is_build_time: false, is_preview: false },
		]);
	});

	// Task 21: test env.push deletes existing then sets new
	it("env.push deletes all existing envs then sets new ones", async () => {
		// First call to list returns existing envs (from push -> list)
		mockClient.get.mockResolvedValueOnce([
			{ uuid: "env-1", key: "OLD_VAR", value: "old", is_build_time: false },
			{ uuid: "env-2", key: "OTHER_VAR", value: "other", is_build_time: false },
		]);

		await provider.env.push("app-1", { NEW_VAR: "new" });

		// Should have called delete for each existing env
		expect(mockClient.del).toHaveBeenCalledWith("/api/v1/applications/app-1/envs/env-1");
		expect(mockClient.del).toHaveBeenCalledWith("/api/v1/applications/app-1/envs/env-2");
		// Should have called set with new vars
		expect(mockClient.patch).toHaveBeenCalledWith("/api/v1/applications/app-1/envs/bulk", [
			{ key: "NEW_VAR", value: "new", is_build_time: false, is_preview: false },
		]);
	});

	// Task 22: test env.delete uses envUuidMap
	it("env.delete fetches list to get uuid if not cached", async () => {
		mockClient.get.mockResolvedValueOnce([
			{ uuid: "env-uuid-1", key: "MY_KEY", value: "val", is_build_time: false },
		]);

		await provider.env.delete("app-1", "MY_KEY");

		expect(mockClient.get).toHaveBeenCalledWith("/api/v1/applications/app-1/envs");
		expect(mockClient.del).toHaveBeenCalledWith("/api/v1/applications/app-1/envs/env-uuid-1");
	});

	it("env.delete uses cached uuid from prior list call", async () => {
		// First list call populates cache
		mockClient.get.mockResolvedValueOnce([
			{ uuid: "env-uuid-1", key: "MY_KEY", value: "val", is_build_time: false },
		]);
		await provider.env.list("app-1");

		// Now delete should use cached uuid without re-fetching
		await provider.env.delete("app-1", "MY_KEY");

		// get was called once for list, but not again for delete
		expect(mockClient.get).toHaveBeenCalledTimes(1);
		expect(mockClient.del).toHaveBeenCalledWith("/api/v1/applications/app-1/envs/env-uuid-1");
	});

	it("env.delete does nothing if key not found", async () => {
		mockClient.get.mockResolvedValueOnce([]);

		await provider.env.delete("app-1", "NONEXISTENT");

		expect(mockClient.del).not.toHaveBeenCalled();
	});

	it("apps.list returns normalized apps", async () => {
		mockClient.get.mockResolvedValueOnce([
			{
				uuid: "app-1",
				name: "my-app",
				status: "running",
				fqdn: "https://app.example.com",
				created_at: "2026-01-01T00:00:00Z",
				updated_at: "2026-01-01T00:00:00Z",
			},
		]);

		const apps = await provider.apps.list();
		expect(apps).toHaveLength(1);
		expect(apps[0].id).toBe("app-1");
		expect(apps[0].name).toBe("my-app");
	});

	it("servers.list returns normalized servers", async () => {
		mockClient.get.mockResolvedValueOnce([
			{
				uuid: "srv-1",
				name: "server-1",
				ip: "10.0.0.1",
				settings: { is_reachable: true },
			},
		]);

		const servers = await provider.servers!.list();
		expect(servers).toHaveLength(1);
		expect(servers[0].id).toBe("srv-1");
		expect(servers[0].status).toBe("reachable");
	});

	it("databases.list returns normalized databases", async () => {
		mockClient.get.mockResolvedValueOnce([
			{
				uuid: "db-1",
				name: "my-db",
				type: "postgresql",
				version: "16",
				status: "running",
				server_uuid: "srv-1",
			},
		]);

		const dbs = await provider.databases!.list();
		expect(dbs).toHaveLength(1);
		expect(dbs[0].id).toBe("db-1");
		expect(dbs[0].engine).toBe("postgresql");
	});

	it("deployments.list returns normalized deployments", async () => {
		mockClient.get.mockResolvedValueOnce([
			{
				uuid: "dep-1",
				application_uuid: "app-1",
				status: "finished",
				created_at: "2026-01-01T00:00:00Z",
			},
		]);

		const deps = await provider.deployments!.list("app-1");
		expect(deps).toHaveLength(1);
		expect(deps[0].id).toBe("dep-1");
		expect(deps[0].status).toBe("success");
	});

	it("env.pull returns key-value record", async () => {
		mockClient.get.mockResolvedValueOnce([
			{ uuid: "e1", key: "A", value: "1", is_build_time: false },
			{ uuid: "e2", key: "B", value: "2", is_build_time: true },
		]);

		const result = await provider.env.pull("app-1");
		expect(result).toEqual({ A: "1", B: "2" });
	});
});
