import { describe, expect, it } from 'vitest'
import { compareEnvVars, parseEnvFile, formatEnvDiff, type EnvDiffResult } from '../commands/env.js'

describe('parseEnvFile', () => {
	it('parses key=value pairs', () => {
		const result = parseEnvFile('FOO=bar\nBAZ=qux')
		expect(result).toEqual({ FOO: 'bar', BAZ: 'qux' })
	})

	it('skips comments and blank lines', () => {
		const result = parseEnvFile('# comment\n\nFOO=bar\n  \n# another\nBAZ=qux')
		expect(result).toEqual({ FOO: 'bar', BAZ: 'qux' })
	})

	it('handles values with equals signs', () => {
		const result = parseEnvFile('URL=postgres://host:5432/db?opt=1')
		expect(result).toEqual({ URL: 'postgres://host:5432/db?opt=1' })
	})

	it('handles empty values', () => {
		const result = parseEnvFile('EMPTY=')
		expect(result).toEqual({ EMPTY: '' })
	})
})

describe('compareEnvVars', () => {
	it('detects local-only keys', () => {
		const result = compareEnvVars({ NEW_KEY: 'val' }, {})
		expect(result.localOnly).toEqual({ NEW_KEY: 'val' })
		expect(Object.keys(result.remoteOnly)).toHaveLength(0)
		expect(Object.keys(result.changed)).toHaveLength(0)
		expect(Object.keys(result.matching)).toHaveLength(0)
	})

	it('detects remote-only keys', () => {
		const result = compareEnvVars({}, { OLD_KEY: 'val' })
		expect(result.remoteOnly).toEqual({ OLD_KEY: 'val' })
		expect(Object.keys(result.localOnly)).toHaveLength(0)
	})

	it('detects changed values', () => {
		const result = compareEnvVars({ DB: 'localhost' }, { DB: 'prod.db.com' })
		expect(result.changed).toEqual({ DB: { local: 'localhost', remote: 'prod.db.com' } })
		expect(Object.keys(result.matching)).toHaveLength(0)
	})

	it('detects matching keys', () => {
		const result = compareEnvVars({ KEY: 'same' }, { KEY: 'same' })
		expect(result.matching).toEqual({ KEY: 'same' })
		expect(Object.keys(result.changed)).toHaveLength(0)
	})

	it('handles a complex mix', () => {
		const local = { A: '1', B: '2', C: 'changed' }
		const remote = { B: '2', C: 'original', D: '4' }
		const result = compareEnvVars(local, remote)

		expect(result.localOnly).toEqual({ A: '1' })
		expect(result.remoteOnly).toEqual({ D: '4' })
		expect(result.changed).toEqual({ C: { local: 'changed', remote: 'original' } })
		expect(result.matching).toEqual({ B: '2' })
	})

	it('returns empty results for two empty objects', () => {
		const result = compareEnvVars({}, {})
		expect(Object.keys(result.localOnly)).toHaveLength(0)
		expect(Object.keys(result.remoteOnly)).toHaveLength(0)
		expect(Object.keys(result.changed)).toHaveLength(0)
		expect(Object.keys(result.matching)).toHaveLength(0)
	})
})

describe('formatEnvDiff', () => {
	it('shows additions in output', () => {
		const diff: EnvDiffResult = {
			localOnly: { NEW: 'val' },
			remoteOnly: {},
			changed: {},
			matching: {},
		}
		const output = formatEnvDiff(diff, false)
		expect(output).toContain('NEW=val')
		expect(output).toContain('local only')
	})

	it('shows removals in output', () => {
		const diff: EnvDiffResult = {
			localOnly: {},
			remoteOnly: { OLD: 'val' },
			changed: {},
			matching: {},
		}
		const output = formatEnvDiff(diff, false)
		expect(output).toContain('OLD=val')
		expect(output).toContain('remote only')
	})

	it('shows changes in output', () => {
		const diff: EnvDiffResult = {
			localOnly: {},
			remoteOnly: {},
			changed: { DB: { local: 'new', remote: 'old' } },
			matching: {},
		}
		const output = formatEnvDiff(diff, false)
		expect(output).toContain('DB')
		expect(output).toContain('value differs')
	})

	it('hides matching keys by default', () => {
		const diff: EnvDiffResult = {
			localOnly: {},
			remoteOnly: {},
			changed: {},
			matching: { SAME: 'val' },
		}
		const output = formatEnvDiff(diff, false)
		expect(output).toContain('1 matching key(s) hidden')
		expect(output).not.toContain('SAME=val')
	})

	it('shows matching keys with --full', () => {
		const diff: EnvDiffResult = {
			localOnly: {},
			remoteOnly: {},
			changed: {},
			matching: { SAME: 'val' },
		}
		const output = formatEnvDiff(diff, true)
		expect(output).toContain('SAME=val')
	})
})
