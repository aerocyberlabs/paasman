import * as core from '@actions/core'

export interface ActionInputs {
  provider: string
  serverUrl: string
  token: string
  appId: string
  command: 'deploy' | 'stop' | 'restart' | 'env-push'
  envFile?: string
  force: boolean
}

export function parseInputs(): ActionInputs {
  return {
    provider: core.getInput('provider', { required: true }),
    serverUrl: core.getInput('server-url', { required: true }),
    token: core.getInput('token', { required: true }),
    appId: core.getInput('app-id', { required: true }),
    command: core.getInput('command') as ActionInputs['command'] || 'deploy',
    envFile: core.getInput('env-file') || undefined,
    force: core.getInput('force') === 'true',
  }
}
