import type { App, AppStatus, EnvVar, Server } from "@paasman/core";

export function toApp(raw: Record<string, unknown>): App {
	const customDomain = raw.customDomain as Array<Record<string, unknown>> | undefined;
	const domains = customDomain
		? customDomain.map((d) => d.publicDomain as string).filter(Boolean)
		: [];

	const instanceCount = raw.instanceCount as number | undefined;

	return {
		id: raw.appName as string,
		name: raw.appName as string,
		status: mapAppStatus(raw, instanceCount),
		domains,
		createdAt: new Date(),
		updatedAt: new Date(),
		meta: {
			image: raw.deployedVersion ? `img-${raw.deployedVersion}` : undefined,
			serverIds: undefined,
		},
		raw,
	};
}

function mapAppStatus(raw: Record<string, unknown>, instanceCount?: number): AppStatus {
	const notExposed = raw.notExposeAsWebApp as boolean | undefined;
	if (instanceCount !== undefined && instanceCount > 0) return "running";
	if (instanceCount === 0) return "stopped";
	if (notExposed === true) return "unknown";
	return "unknown";
}

export function toServer(raw: Record<string, unknown>): Server {
	const isLeader = raw.isLeader as boolean | undefined;
	const ip = raw.ip as string | undefined;
	const hostname = raw.hostname as string | undefined;
	const state = raw.state as string | undefined;

	return {
		id: (raw.nodeId as string) ?? hostname ?? "unknown",
		name: hostname ?? (raw.nodeId as string) ?? "unknown",
		status: state === "ready" ? "reachable" : state === "down" ? "unreachable" : "unknown",
		ip: ip ?? "0.0.0.0",
		meta: {
			provider: isLeader ? "leader" : "worker",
		},
		raw,
	};
}

export function toEnvVar(raw: { key: string; value: string }): EnvVar {
	return {
		key: raw.key,
		value: raw.value,
		isSecret: false,
	};
}
