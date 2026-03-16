import { NodeSSH } from 'node-ssh'
import { ConnectionError } from '@paasman/core'

export interface DokkuSshConfig {
  host: string
  port?: number
  username?: string
  privateKeyPath?: string
  privateKey?: string
  knownHostsPath?: string
  strictHostKeyChecking?: boolean
}

export class DokkuSshClient {
  private ssh: NodeSSH
  private connected = false

  constructor(private readonly config: DokkuSshConfig) {
    this.ssh = new NodeSSH()
  }

  async connect(): Promise<void> {
    try {
      await this.ssh.connect({
        host: this.config.host,
        port: this.config.port ?? 22,
        username: this.config.username ?? 'dokku',
        ...(this.config.privateKey
          ? { privateKey: this.config.privateKey }
          : this.config.privateKeyPath
            ? { privateKeyPath: this.config.privateKeyPath }
            : {}),
        strictHostKeyChecking: this.config.strictHostKeyChecking ?? true,
        knownHosts: this.config.knownHostsPath ?? '~/.ssh/known_hosts',
      } as Record<string, unknown>)
      this.connected = true
    } catch (err) {
      throw new ConnectionError('dokku', this.config.host, err as Error)
    }
  }

  /**
   * Run a Dokku command over SSH.
   * This uses node-ssh's execCommand (not child_process.exec).
   */
  async run(command: string): Promise<string> {
    if (!this.connected) {
      await this.connect()
    }

    const result = await this.ssh.execCommand(command)

    if (result.stderr && result.code !== 0) {
      throw new Error(`Dokku command failed: ${command}\n${result.stderr}`)
    }

    return result.stdout
  }

  async disconnect(): Promise<void> {
    if (this.connected) {
      this.ssh.dispose()
      this.connected = false
    }
  }

  isConnected(): boolean {
    return this.connected
  }
}
