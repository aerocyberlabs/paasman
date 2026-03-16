import { describe, expect, it } from "vitest";
import { toApp, toDatabase, toDeployment, toEnvVar, toServer } from "../normalizers.js";

describe("Dokploy normalizers", () => {
	describe("toApp", () => {
		it("normalizes a Dokploy application response", () => {
			const raw = {
				applicationId: "app-123",
				name: "my-app",
				applicationStatus: "running",
				domains: [{ host: "app.example.com" }, { host: "www.example.com" }],
				createdAt: "2026-01-01T00:00:00Z",
				updatedAt: "2026-01-15T00:00:00Z",
				repository: "https://github.com/test/repo",
				branch: "main",
				buildType: "nixpacks",
				serverId: "srv-1",
			};
			const app = toApp(raw);
			expect(app.id).toBe("app-123");
			expect(app.name).toBe("my-app");
			expect(app.status).toBe("running");
			expect(app.domains).toEqual(["app.example.com", "www.example.com"]);
			expect(app.meta.repository).toBe("https://github.com/test/repo");
			expect(app.meta.branch).toBe("main");
			expect(app.meta.buildPack).toBe("nixpacks");
			expect(app.meta.serverIds).toEqual(["srv-1"]);
			expect(app.raw).toBe(raw);
		});

		it("handles missing domains", () => {
			const raw = {
				applicationId: "x",
				name: "x",
				applicationStatus: "idle",
				createdAt: "2026-01-01T00:00:00Z",
				updatedAt: "2026-01-01T00:00:00Z",
			};
			const app = toApp(raw);
			expect(app.domains).toEqual([]);
		});

		it("handles domains as array of strings", () => {
			const raw = {
				applicationId: "x",
				name: "x",
				applicationStatus: "running",
				domains: [{ host: "example.com" }],
				createdAt: "2026-01-01T00:00:00Z",
				updatedAt: "2026-01-01T00:00:00Z",
			};
			const app = toApp(raw);
			expect(app.domains).toEqual(["example.com"]);
		});

		it("maps idle status to stopped", () => {
			const raw = {
				applicationId: "x",
				name: "x",
				applicationStatus: "idle",
				createdAt: "2026-01-01T00:00:00Z",
				updatedAt: "2026-01-01T00:00:00Z",
			};
			expect(toApp(raw).status).toBe("stopped");
		});

		it("maps done status to stopped", () => {
			const raw = {
				applicationId: "x",
				name: "x",
				applicationStatus: "done",
				createdAt: "2026-01-01T00:00:00Z",
				updatedAt: "2026-01-01T00:00:00Z",
			};
			expect(toApp(raw).status).toBe("stopped");
		});

		it("maps error status to failed", () => {
			const raw = {
				applicationId: "x",
				name: "x",
				applicationStatus: "error",
				createdAt: "2026-01-01T00:00:00Z",
				updatedAt: "2026-01-01T00:00:00Z",
			};
			expect(toApp(raw).status).toBe("failed");
		});

		it("maps unknown status to unknown", () => {
			const raw = {
				applicationId: "x",
				name: "x",
				applicationStatus: "banana",
				createdAt: "2026-01-01T00:00:00Z",
				updatedAt: "2026-01-01T00:00:00Z",
			};
			expect(toApp(raw).status).toBe("unknown");
		});
	});

	describe("toEnvVar", () => {
		it("parses KEY=VALUE format env string", () => {
			const env = toEnvVar("DB_HOST=localhost");
			expect(env.key).toBe("DB_HOST");
			expect(env.value).toBe("localhost");
			expect(env.isSecret).toBe(false);
		});

		it("handles values with equals signs", () => {
			const env = toEnvVar("CONNECTION=postgres://user:pass@host/db?opt=val");
			expect(env.key).toBe("CONNECTION");
			expect(env.value).toBe("postgres://user:pass@host/db?opt=val");
		});

		it("handles empty value", () => {
			const env = toEnvVar("EMPTY_VAR=");
			expect(env.key).toBe("EMPTY_VAR");
			expect(env.value).toBe("");
		});
	});

	describe("toServer", () => {
		it("normalizes server response", () => {
			const raw = {
				serverId: "srv-1",
				name: "prod-server",
				ipAddress: "10.0.0.1",
				serverStatus: "active",
				createdAt: "2026-01-01T00:00:00Z",
			};
			const server = toServer(raw);
			expect(server.id).toBe("srv-1");
			expect(server.name).toBe("prod-server");
			expect(server.status).toBe("reachable");
			expect(server.ip).toBe("10.0.0.1");
		});

		it("maps inactive server to unreachable", () => {
			const raw = {
				serverId: "srv-2",
				name: "down-server",
				ipAddress: "10.0.0.2",
				serverStatus: "inactive",
			};
			const server = toServer(raw);
			expect(server.status).toBe("unreachable");
		});

		it("maps unknown status", () => {
			const raw = {
				serverId: "srv-3",
				name: "mystery-server",
				ipAddress: "10.0.0.3",
			};
			const server = toServer(raw);
			expect(server.status).toBe("unknown");
		});
	});

	describe("toDeployment", () => {
		it("normalizes deployment response", () => {
			const raw = {
				deploymentId: "dep-1",
				applicationId: "app-1",
				status: "done",
				createdAt: "2026-01-01T00:00:00Z",
				endedAt: "2026-01-01T00:05:00Z",
				title: "Deploy abc123",
			};
			const dep = toDeployment(raw);
			expect(dep.id).toBe("dep-1");
			expect(dep.appId).toBe("app-1");
			expect(dep.status).toBe("success");
			expect(dep.finishedAt).toBeDefined();
			expect(dep.meta.commit).toBe("Deploy abc123");
		});

		it("maps running status", () => {
			const raw = {
				deploymentId: "dep-2",
				applicationId: "app-1",
				status: "running",
				createdAt: "2026-01-01T00:00:00Z",
			};
			expect(toDeployment(raw).status).toBe("running");
		});

		it("maps queued status", () => {
			const raw = {
				deploymentId: "dep-3",
				applicationId: "app-1",
				status: "queued",
				createdAt: "2026-01-01T00:00:00Z",
			};
			expect(toDeployment(raw).status).toBe("queued");
		});

		it("maps error status to failed", () => {
			const raw = {
				deploymentId: "dep-4",
				applicationId: "app-1",
				status: "error",
				createdAt: "2026-01-01T00:00:00Z",
			};
			expect(toDeployment(raw).status).toBe("failed");
		});

		it("maps cancelled status", () => {
			const raw = {
				deploymentId: "dep-5",
				applicationId: "app-1",
				status: "cancelled",
				createdAt: "2026-01-01T00:00:00Z",
			};
			expect(toDeployment(raw).status).toBe("cancelled");
		});
	});

	describe("toDatabase", () => {
		it("normalizes database response", () => {
			const raw = {
				databaseId: "db-1",
				name: "my-postgres",
				type: "postgres",
				version: "16",
				applicationStatus: "running",
				serverId: "srv-1",
			};
			const db = toDatabase(raw);
			expect(db.id).toBe("db-1");
			expect(db.name).toBe("my-postgres");
			expect(db.engine).toBe("postgresql");
			expect(db.version).toBe("16");
			expect(db.status).toBe("running");
			expect(db.meta.serverId).toBe("srv-1");
			expect(db.raw).toBe(raw);
		});

		it("maps mysql type", () => {
			const raw = {
				databaseId: "db-2",
				name: "my-mysql",
				type: "mysql",
				applicationStatus: "idle",
			};
			const db = toDatabase(raw);
			expect(db.engine).toBe("mysql");
			expect(db.status).toBe("stopped");
		});

		it("maps mariadb type", () => {
			const raw = {
				databaseId: "db-3",
				name: "my-maria",
				type: "mariadb",
				applicationStatus: "running",
			};
			expect(toDatabase(raw).engine).toBe("mariadb");
		});

		it("maps mongo type", () => {
			const raw = {
				databaseId: "db-4",
				name: "my-mongo",
				type: "mongo",
				applicationStatus: "running",
			};
			expect(toDatabase(raw).engine).toBe("mongodb");
		});

		it("maps redis type", () => {
			const raw = {
				databaseId: "db-5",
				name: "my-redis",
				type: "redis",
				applicationStatus: "running",
			};
			expect(toDatabase(raw).engine).toBe("redis");
		});

		it("maps unknown type to other", () => {
			const raw = {
				databaseId: "db-6",
				name: "my-db",
				type: "cockroachdb",
				applicationStatus: "running",
			};
			expect(toDatabase(raw).engine).toBe("other");
		});

		it("handles missing type", () => {
			const raw = {
				databaseId: "db-7",
				name: "my-db",
				applicationStatus: "idle",
			};
			expect(toDatabase(raw).engine).toBe("other");
		});
	});
});
