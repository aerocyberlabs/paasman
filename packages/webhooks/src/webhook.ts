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

export class WebhookManager {
	private configs: WebhookConfig[]

	constructor(configs: WebhookConfig[]) {
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
