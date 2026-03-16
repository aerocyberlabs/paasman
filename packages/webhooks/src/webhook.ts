import { formatPayload, type WebhookFormat } from './formatters.js'

export interface WebhookConfig {
	url: string
	format: WebhookFormat
	events: string[]
}

export interface WebhookEvent {
	event: string
	profile: string
	provider: string
	app?: { id: string; name: string }
	deployment?: { id: string; status: string }
	details?: Record<string, unknown>
}

function validateWebhookUrl(url: string): void {
	const parsed = new URL(url)
	if (parsed.protocol !== 'https:' && parsed.protocol !== 'http:') {
		throw new Error(`Webhook URL must use http(s): ${url}`)
	}
	const hostname = parsed.hostname
	if (hostname === 'localhost' || hostname === '127.0.0.1' || hostname === '::1'
		|| hostname.startsWith('169.254.') || hostname.startsWith('10.')
		|| hostname.startsWith('192.168.') || /^172\.(1[6-9]|2\d|3[01])\./.test(hostname)) {
		throw new Error(`Webhook URL must not target private/local addresses: ${url}`)
	}
}

export class WebhookManager {
	private configs: WebhookConfig[]

	constructor(configs: WebhookConfig[]) {
		for (const config of configs) {
			validateWebhookUrl(config.url)
		}
		this.configs = configs
	}

	async notify(event: WebhookEvent): Promise<void> {
		const matching = this.configs.filter((c) => c.events.includes(event.event))

		const results = await Promise.allSettled(
			matching.map((config) => this.send(config, event)),
		)

		for (const result of results) {
			if (result.status === 'rejected') {
				console.error(`[paasman:webhooks] delivery failed: ${result.reason}`)
			}
		}
	}

	private async send(config: WebhookConfig, event: WebhookEvent): Promise<void> {
		const { body, contentType } = formatPayload(config.format, event)

		const response = await fetch(config.url, {
			method: 'POST',
			headers: { 'Content-Type': contentType },
			body,
			signal: AbortSignal.timeout(10_000),
		})

		if (!response.ok) {
			throw new Error(
				`Webhook ${config.url} returned ${response.status}: ${response.statusText}`,
			)
		}
	}
}
