import { beforeEach, describe, expect, it, vi } from "vitest";
import { DokkuProvider } from "../provider.js";

const mockRun = vi.fn().mockResolvedValue("");
const mockConnect = vi.fn().mockResolvedValue(undefined);
const mockDisconnect = vi.fn().mockResolvedValue(undefined);
const mockIsConnected = vi.fn().mockReturnValue(true);

vi.mock("../ssh-client.js", () => ({
	DokkuSshClient: class MockDokkuSshClient {
		run = mockRun;
		connect = mockConnect;
		disconnect = mockDisconnect;
		isConnected = mockIsConnected;
	},
}));

describe("DokkuProvider", () => {
	let provider: DokkuProvider;

	beforeEach(() => {
		vi.clearAllMocks();
		mockRun.mockResolvedValue("");
		provider = new DokkuProvider({ host: "dokku.example.com" });
	});

	it("has correct name and version", () => {
		expect(provider.name).toBe("dokku");
		expect(provider.version).toBeDefined();
	});

	it("has correct capabilities", () => {
		expect(provider.capabilities).toEqual({
			apps: { start: true, stop: true, restart: true, logs: true },
			servers: false,
			databases: true,
			deployments: { list: false, cancel: false },
		});
	});

	it("does not have servers or deployments operations", () => {
		expect(provider.servers).toBeUndefined();
		expect(provider.deployments).toBeUndefined();
	});

	it("apps is defined with all methods", () => {
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
		expect(typeof provider.env.list).toBe("function");
		expect(typeof provider.env.set).toBe("function");
		expect(typeof provider.env.delete).toBe("function");
		expect(typeof provider.env.pull).toBe("function");
		expect(typeof provider.env.push).toBe("function");
	});

	it("databases is defined with all methods", () => {
		expect(typeof provider.databases!.list).toBe("function");
		expect(typeof provider.databases!.get).toBe("function");
		expect(typeof provider.databases!.create).toBe("function");
		expect(typeof provider.databases!.delete).toBe("function");
	});

	// Health check
	it("healthCheck returns ok when version command succeeds", async () => {
		mockRun.mockResolvedValueOnce("dokku 0.34.8");
		const health = await provider.healthCheck();
		expect(health.ok).toBe(true);
		expect(health.provider).toBe("dokku");
		expect(health.version).toBe("dokku 0.34.8");
		expect(mockRun).toHaveBeenCalledWith("version");
	});

	it("healthCheck returns not ok when version fails", async () => {
		mockRun.mockRejectedValueOnce(new Error("Connection failed"));
		const health = await provider.healthCheck();
		expect(health.ok).toBe(false);
		expect(health.message).toBe("Health check failed");
	});

	// Apps
	it("apps.list calls apps:list and apps:report for each", async () => {
		mockRun
			.mockResolvedValueOnce("=====> My Apps\napp1\napp2")
			.mockResolvedValueOnce("=====> app1 app information\n       App running:         true")
			.mockResolvedValueOnce("=====> app2 app information\n       App running:         false");

		const apps = await provider.apps.list();
		expect(apps).toHaveLength(2);
		expect(apps[0].id).toBe("app1");
		expect(apps[0].status).toBe("running");
		expect(apps[1].id).toBe("app2");
		expect(apps[1].status).toBe("stopped");
		expect(mockRun).toHaveBeenCalledWith("apps:list");
		expect(mockRun).toHaveBeenCalledWith("apps:report app1");
		expect(mockRun).toHaveBeenCalledWith("apps:report app2");
	});

	it("apps.get calls apps:report", async () => {
		mockRun.mockResolvedValueOnce(
			"=====> my-app app information\n       App running:         true",
		);
		const app = await provider.apps.get("my-app");
		expect(app.id).toBe("my-app");
		expect(app.status).toBe("running");
		expect(mockRun).toHaveBeenCalledWith("apps:report my-app");
	});

	it("apps.create calls apps:create and returns app", async () => {
		mockRun
			.mockResolvedValueOnce("") // apps:create
			.mockResolvedValueOnce("=====> new-app app information\n       App running:         false"); // apps:report

		const app = await provider.apps.create({
			name: "new-app",
			source: { type: "git", repository: "https://github.com/test/repo" },
		});
		expect(app.id).toBe("new-app");
		expect(mockRun).toHaveBeenCalledWith("apps:create new-app");
	});

	it("apps.create sets env vars if provided", async () => {
		mockRun
			.mockResolvedValueOnce("") // apps:create
			.mockResolvedValueOnce("") // config:set
			.mockResolvedValueOnce("=====> new-app app information\n       App running:         false"); // apps:report

		await provider.apps.create({
			name: "new-app",
			source: { type: "git", repository: "https://github.com/test/repo" },
			env: { PORT: "3000" },
		});
		expect(mockRun).toHaveBeenCalledWith("config:set new-app PORT='3000'");
	});

	it("apps.create adds domains if provided", async () => {
		mockRun
			.mockResolvedValueOnce("") // apps:create
			.mockResolvedValueOnce("") // domains:add
			.mockResolvedValueOnce("=====> new-app info\n       App running: false"); // apps:report

		await provider.apps.create({
			name: "new-app",
			source: { type: "git", repository: "https://github.com/test/repo" },
			domains: ["app.example.com"],
		});
		expect(mockRun).toHaveBeenCalledWith("domains:add new-app app.example.com");
	});

	it("apps.delete calls apps:destroy with --force", async () => {
		await provider.apps.delete("my-app");
		expect(mockRun).toHaveBeenCalledWith("apps:destroy my-app --force");
	});

	it("apps.deploy calls ps:rebuild", async () => {
		const deployment = await provider.apps.deploy("my-app");
		expect(deployment.appId).toBe("my-app");
		expect(deployment.status).toBe("running");
		expect(deployment.meta.trigger).toBe("rebuild");
		expect(mockRun).toHaveBeenCalledWith("ps:rebuild my-app");
	});

	it("apps.start calls ps:start", async () => {
		await provider.apps.start!("my-app");
		expect(mockRun).toHaveBeenCalledWith("ps:start my-app");
	});

	it("apps.stop calls ps:stop", async () => {
		await provider.apps.stop!("my-app");
		expect(mockRun).toHaveBeenCalledWith("ps:stop my-app");
	});

	it("apps.restart calls ps:restart", async () => {
		await provider.apps.restart!("my-app");
		expect(mockRun).toHaveBeenCalledWith("ps:restart my-app");
	});

	it("apps.logs yields log lines", async () => {
		mockRun.mockResolvedValueOnce("2026-01-15T10:30:00.000Z Starting server\nServer running");

		const lines: Array<{ message: string }> = [];
		for await (const line of provider.apps.logs!("my-app")) {
			lines.push(line);
		}

		expect(lines).toHaveLength(2);
		expect(mockRun).toHaveBeenCalledWith("logs my-app -n 100");
	});

	it("apps.logs passes lines option", async () => {
		mockRun.mockResolvedValueOnce("line1");

		const lines: Array<{ message: string }> = [];
		for await (const line of provider.apps.logs!("my-app", { lines: 50 })) {
			lines.push(line);
		}

		expect(mockRun).toHaveBeenCalledWith("logs my-app -n 50");
	});

	// Env
	it("env.list calls config:show and returns EnvVar[]", async () => {
		mockRun.mockResolvedValueOnce(
			"=====> my-app env vars\nDATABASE_URL:   postgres://localhost\nPORT:   5000",
		);

		const envs = await provider.env.list("my-app");
		expect(envs).toHaveLength(2);
		expect(envs[0].key).toBe("DATABASE_URL");
		expect(envs[0].value).toBe("postgres://localhost");
		expect(envs[1].key).toBe("PORT");
		expect(envs[1].value).toBe("5000");
		expect(mockRun).toHaveBeenCalledWith("config:show my-app");
	});

	it("env.set calls config:set with key=value pairs", async () => {
		await provider.env.set("my-app", { DB_HOST: "localhost", DB_PORT: "5432" });
		expect(mockRun).toHaveBeenCalledWith("config:set my-app DB_HOST='localhost' DB_PORT='5432'");
	});

	it("env.set escapes values with spaces", async () => {
		await provider.env.set("my-app", { APP_NAME: "My Cool App" });
		expect(mockRun).toHaveBeenCalledWith("config:set my-app APP_NAME='My Cool App'");
	});

	it("env.delete calls config:unset", async () => {
		await provider.env.delete("my-app", "OLD_VAR");
		expect(mockRun).toHaveBeenCalledWith("config:unset my-app OLD_VAR");
	});

	it("env.pull calls config:export and returns record", async () => {
		mockRun.mockResolvedValueOnce("DATABASE_URL=postgres://localhost\nPORT=5000");

		const result = await provider.env.pull("my-app");
		expect(result).toEqual({ DATABASE_URL: "postgres://localhost", PORT: "5000" });
		expect(mockRun).toHaveBeenCalledWith("config:export my-app");
	});

	it("env.push does full replace: unsets existing, sets new", async () => {
		// First call: config:export returns existing vars
		mockRun.mockResolvedValueOnce("OLD_VAR=old\nOTHER_VAR=other");

		await provider.env.push("my-app", { NEW_VAR: "new" });

		expect(mockRun).toHaveBeenCalledWith("config:export my-app");
		expect(mockRun).toHaveBeenCalledWith("config:unset --no-restart my-app OLD_VAR OTHER_VAR");
		expect(mockRun).toHaveBeenCalledWith("config:set my-app NEW_VAR='new'");
	});

	it("env.push with empty vars only unsets existing", async () => {
		mockRun.mockResolvedValueOnce("OLD_VAR=old");

		await provider.env.push("my-app", {});

		expect(mockRun).toHaveBeenCalledWith("config:unset --no-restart my-app OLD_VAR");
		// Should NOT have called config:set
		expect(mockRun).not.toHaveBeenCalledWith(expect.stringContaining("config:set"));
	});

	// Databases
	it("databases.list tries all supported engines", async () => {
		// All engines return errors except postgres
		mockRun
			.mockResolvedValueOnce("=====> Postgres services\nmy-db") // postgres:list
			.mockResolvedValueOnce(
				"=====> my-db info\n       Status:              running\n       Version:             postgres:16.1",
			) // postgres:info
			.mockRejectedValueOnce(new Error("plugin not installed")) // mysql:list
			.mockRejectedValueOnce(new Error("plugin not installed")) // redis:list
			.mockRejectedValueOnce(new Error("plugin not installed")) // mongo:list
			.mockRejectedValueOnce(new Error("plugin not installed")); // mariadb:list

		const dbs = await provider.databases!.list();
		expect(dbs).toHaveLength(1);
		expect(dbs[0].id).toBe("my-db");
		expect(dbs[0].engine).toBe("postgresql");
		expect(dbs[0].status).toBe("running");
	});

	it("databases.get tries engines until found", async () => {
		mockRun
			.mockRejectedValueOnce(new Error("not found")) // postgres:info
			.mockResolvedValueOnce("=====> my-redis info\n       Status:              running"); // mysql:info

		const db = await provider.databases!.get("my-redis");
		expect(db.id).toBe("my-redis");
		expect(db.engine).toBe("mysql"); // second engine tried
	});

	it("databases.create calls <engine>:create then <engine>:info", async () => {
		mockRun
			.mockResolvedValueOnce("") // postgres:create
			.mockResolvedValueOnce(
				"=====> new-db info\n       Status:              running\n       Version:             postgres:16",
			); // postgres:info

		const db = await provider.databases!.create({
			name: "new-db",
			engine: "postgresql",
		});
		expect(db.id).toBe("new-db");
		expect(db.engine).toBe("postgresql");
		expect(mockRun).toHaveBeenCalledWith("postgres:create new-db");
		expect(mockRun).toHaveBeenCalledWith("postgres:info new-db");
	});

	it("databases.delete finds engine then destroys", async () => {
		mockRun
			.mockRejectedValueOnce(new Error("not found")) // postgres:info
			.mockResolvedValueOnce("=====> my-mysql info\n       Status: running") // mysql:info
			.mockResolvedValueOnce(""); // mysql:destroy

		await provider.databases!.delete("my-mysql");
		expect(mockRun).toHaveBeenCalledWith("mysql:destroy my-mysql --force");
	});

	it("databases.delete throws if not found in any engine", async () => {
		mockRun.mockRejectedValue(new Error("not found"));

		await expect(provider.databases!.delete("nonexistent")).rejects.toThrow(
			"database 'nonexistent' not found",
		);
	});
});
