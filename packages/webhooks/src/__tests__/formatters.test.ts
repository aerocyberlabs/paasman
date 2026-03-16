import { describe, it, expect } from 'vitest'
import { formatGeneric, formatSlack, formatDiscord, formatPayload } from '../formatters.js'
import type { WebhookEvent } from '../webhook.js'

const baseEvent: WebhookEvent = {
	event: 'deploy',
	profile: 'prod',
	provider: 'coolify',
	app: { id: 'abc-123', name: 'my-app' },
	deployment: { id: 'dep-456', status: 'success' },
}

describe('formatGeneric', () => {
	it('produces a JSON payload with all fields', () => {
		const result = formatGeneric(baseEvent)
		const parsed = JSON.parse(result.body)

		expect(result.contentType).toBe('application/json')
		expect(parsed.event).toBe('deploy')
		expect(parsed.profile).toBe('prod')
		expect(parsed.provider).toBe('coolify')
		expect(parsed.app).toEqual({ id: 'abc-123', name: 'my-app' })
		expect(parsed.deployment).toEqual({ id: 'dep-456', status: 'success' })
		expect(parsed.user).toBe('paasman-cli')
		expect(parsed.timestamp).toBeDefined()
	})

	it('omits optional fields when not provided', () => {
		const event: WebhookEvent = { event: 'stop', profile: 'staging', provider: 'dokku' }
		const result = formatGeneric(event)
		const parsed = JSON.parse(result.body)

		expect(parsed.app).toBeUndefined()
		expect(parsed.deployment).toBeUndefined()
		expect(parsed.details).toBeUndefined()
	})

	it('includes details when provided', () => {
		const event: WebhookEvent = {
			...baseEvent,
			details: { branch: 'main', commit: 'abc123' },
		}
		const result = formatGeneric(event)
		const parsed = JSON.parse(result.body)

		expect(parsed.details).toEqual({ branch: 'main', commit: 'abc123' })
	})
})

describe('formatSlack', () => {
	it('produces Slack-formatted payload with text and blocks', () => {
		const result = formatSlack(baseEvent)
		const parsed = JSON.parse(result.body)

		expect(result.contentType).toBe('application/json')
		expect(parsed.text).toContain('*my-app*')
		expect(parsed.text).toContain('deployed')
		expect(parsed.text).toContain('*prod*')
		expect(parsed.text).toContain('coolify')
		expect(parsed.blocks).toHaveLength(2)
		expect(parsed.blocks[0].type).toBe('section')
		expect(parsed.blocks[1].fields.length).toBeGreaterThanOrEqual(3)
	})

	it('uses "unknown" when app name is missing', () => {
		const event: WebhookEvent = { event: 'stop', profile: 'staging', provider: 'dokku' }
		const result = formatSlack(event)
		const parsed = JSON.parse(result.body)

		expect(parsed.text).toContain('*unknown*')
		expect(parsed.text).toContain('stopped')
	})
})

describe('formatDiscord', () => {
	it('produces Discord-formatted payload with content and embeds', () => {
		const result = formatDiscord(baseEvent)
		const parsed = JSON.parse(result.body)

		expect(result.contentType).toBe('application/json')
		expect(parsed.content).toContain('**my-app**')
		expect(parsed.content).toContain('deployed')
		expect(parsed.content).toContain('**prod**')
		expect(parsed.content).toContain('coolify')
		expect(parsed.embeds).toHaveLength(1)
		expect(parsed.embeds[0].fields.length).toBeGreaterThanOrEqual(3)
		expect(parsed.embeds[0].timestamp).toBeDefined()
	})

	it('uses "unknown" when app name is missing', () => {
		const event: WebhookEvent = { event: 'restart', profile: 'dev', provider: 'caprover' }
		const result = formatDiscord(event)
		const parsed = JSON.parse(result.body)

		expect(parsed.content).toContain('**unknown**')
		expect(parsed.content).toContain('restarted')
	})
})

describe('formatPayload', () => {
	it('dispatches to generic formatter', () => {
		const result = formatPayload('generic', baseEvent)
		const parsed = JSON.parse(result.body)
		expect(parsed.user).toBe('paasman-cli')
	})

	it('dispatches to slack formatter', () => {
		const result = formatPayload('slack', baseEvent)
		const parsed = JSON.parse(result.body)
		expect(parsed.blocks).toBeDefined()
	})

	it('dispatches to discord formatter', () => {
		const result = formatPayload('discord', baseEvent)
		const parsed = JSON.parse(result.body)
		expect(parsed.embeds).toBeDefined()
	})
})
