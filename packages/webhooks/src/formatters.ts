import type { WebhookEvent } from './webhook.js'

export interface FormattedPayload {
	body: string
	contentType: string
}

const eventEmoji: Record<string, string> = {
	deploy: '\u{1F680}',
	stop: '\u{1F6D1}',
	restart: '\u{1F504}',
	'env.push': '\u{1F4E6}',
	sync: '\u{1F501}',
}

function emojiForEvent(event: string): string {
	return eventEmoji[event] ?? '\u{1F514}'
}

function eventVerb(event: string): string {
	switch (event) {
		case 'deploy':
			return 'deployed'
		case 'stop':
			return 'stopped'
		case 'restart':
			return 'restarted'
		case 'env.push':
			return 'env pushed'
		case 'sync':
			return 'synced'
		default:
			return event
	}
}

export function formatGeneric(event: WebhookEvent): FormattedPayload {
	const payload = {
		event: event.event,
		timestamp: new Date().toISOString(),
		profile: event.profile,
		provider: event.provider,
		...(event.app ? { app: event.app } : {}),
		...(event.deployment ? { deployment: event.deployment } : {}),
		...(event.details ? { details: event.details } : {}),
		user: 'paasman-cli',
	}
	return {
		body: JSON.stringify(payload),
		contentType: 'application/json',
	}
}

export function formatSlack(event: WebhookEvent): FormattedPayload {
	const emoji = emojiForEvent(event.event)
	const appName = event.app?.name ?? 'unknown'
	const verb = eventVerb(event.event)
	const text = `${emoji} *${appName}* ${verb} to *${event.profile}* (${event.provider})`

	const fields: Array<{ type: string; text: string }> = [
		{ type: 'mrkdwn', text: `*Event:*\n${event.event}` },
		{ type: 'mrkdwn', text: `*Profile:*\n${event.profile}` },
		{ type: 'mrkdwn', text: `*Provider:*\n${event.provider}` },
	]

	if (event.app) {
		fields.push({ type: 'mrkdwn', text: `*App:*\n${event.app.name} (${event.app.id})` })
	}
	if (event.deployment) {
		fields.push({
			type: 'mrkdwn',
			text: `*Deployment:*\n${event.deployment.id} (${event.deployment.status})`,
		})
	}

	const payload = {
		text,
		blocks: [
			{
				type: 'section',
				text: { type: 'mrkdwn', text },
			},
			{
				type: 'section',
				fields,
			},
		],
	}

	return {
		body: JSON.stringify(payload),
		contentType: 'application/json',
	}
}

export function formatDiscord(event: WebhookEvent): FormattedPayload {
	const emoji = emojiForEvent(event.event)
	const appName = event.app?.name ?? 'unknown'
	const verb = eventVerb(event.event)
	const content = `${emoji} **${appName}** ${verb} to **${event.profile}** (${event.provider})`

	const fields: Array<{ name: string; value: string; inline: boolean }> = [
		{ name: 'Event', value: event.event, inline: true },
		{ name: 'Profile', value: event.profile, inline: true },
		{ name: 'Provider', value: event.provider, inline: true },
	]

	if (event.app) {
		fields.push({ name: 'App', value: `${event.app.name} (${event.app.id})`, inline: true })
	}
	if (event.deployment) {
		fields.push({
			name: 'Deployment',
			value: `${event.deployment.id} (${event.deployment.status})`,
			inline: true,
		})
	}

	const payload = {
		content,
		embeds: [
			{
				title: `${emoji} ${event.event}`,
				description: content,
				fields,
				timestamp: new Date().toISOString(),
			},
		],
	}

	return {
		body: JSON.stringify(payload),
		contentType: 'application/json',
	}
}

export type WebhookFormat = 'generic' | 'slack' | 'discord'

export function formatPayload(format: WebhookFormat, event: WebhookEvent): FormattedPayload {
	switch (format) {
		case 'slack':
			return formatSlack(event)
		case 'discord':
			return formatDiscord(event)
		case 'generic':
		default:
			return formatGeneric(event)
	}
}
