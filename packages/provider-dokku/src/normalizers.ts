import type { App, AppStatus, Database, DatabaseEngine, EnvVar, LogLine } from "@paasman/core";

/**
 * Normalize a Dokku app report into the standard App shape.
 *
 * @param name - The app name (from apps:list)
 * @param report - Parsed key-value pairs from apps:report
 */
export function toApp(name: string, report: Record<string, string>): App {
	const status = mapAppStatus(report);
	const deploySource = report["App deploy source"] ?? report["Deploy source"];
	const gitRepo = report["Git repository"] ?? report["App git repository"];
	const gitBranch = report["Git branch"] ?? report["App git branch"];

	// Dokku uses the app name as the identifier
	return {
		id: name,
		name,
		status,
		domains: [],
		createdAt: new Date(report["App created at"] ?? report["Created at"] ?? Date.now()),
		updatedAt: new Date(report["App updated at"] ?? report["Updated at"] ?? Date.now()),
		meta: {
			repository: gitRepo,
			branch: gitBranch,
			buildPack: deploySource,
		},
		raw: report,
	};
}

function mapAppStatus(report: Record<string, string>): AppStatus {
	// Dokku reports status in different keys depending on version
	const running = report["App running"] ?? report.Running;
	const locked = report["App locked"] ?? report.Locked;
	const deployed = report["App deploy status"] ?? report["Deploy status"];

	if (running === "true") return "running";
	if (running === "false" && deployed === "failed") return "failed";
	if (running === "false") return "stopped";
	if (locked === "true") return "stopped";

	return "unknown";
}

/**
 * Normalize parsed config key-value pairs into EnvVar[].
 */
export function toEnvVar(key: string, value: string): EnvVar {
	return {
		key,
		value,
		isSecret: false,
		scope: "runtime",
	};
}

/**
 * Normalize a Dokku database info into the standard Database shape.
 *
 * @param name - The database service name
 * @param engine - The database engine type (postgres, mysql, redis, etc.)
 * @param info - Parsed key-value pairs from <engine>:info
 */
export function toDatabase(name: string, engine: string, info: Record<string, string>): Database {
	const mappedEngine = mapDatabaseEngine(engine);
	const status = mapDatabaseStatus(info);
	const version = info.Version ?? undefined;

	return {
		id: name,
		name,
		engine: mappedEngine,
		version,
		status,
		meta: {
			serverId: undefined,
		},
		raw: info,
	};
}

function mapDatabaseEngine(engine: string): DatabaseEngine {
	const lower = engine.toLowerCase();
	if (lower.includes("postgres")) return "postgresql";
	if (lower.includes("mysql")) return "mysql";
	if (lower.includes("maria")) return "mariadb";
	if (lower.includes("mongo")) return "mongodb";
	if (lower.includes("redis")) return "redis";
	return "other";
}

function mapDatabaseStatus(info: Record<string, string>): AppStatus {
	const status = info.Status?.toLowerCase();
	if (status === "running") return "running";
	if (status === "stopped" || status === "exited") return "stopped";
	return "unknown";
}

/**
 * Normalize a parsed log line into the standard LogLine shape.
 */
export function toLogLine(parsed: {
	timestamp?: string;
	message: string;
	stream: "stdout" | "stderr";
}): LogLine {
	return {
		timestamp: parsed.timestamp ? new Date(parsed.timestamp) : undefined,
		message: parsed.message,
		stream: parsed.stream,
	};
}
