import type { PaasProvider, AppOperations, EnvOperations, ServerOperations, DatabaseOperations, DeploymentOperations } from './interfaces.js'
import { ValidationError } from './errors.js'

type SingleProviderConfig = { provider: PaasProvider }
type MultiProviderConfig = { providers: Record<string, PaasProvider> }
type PaasmanConfig = SingleProviderConfig | MultiProviderConfig

function isMulti(config: PaasmanConfig): config is MultiProviderConfig {
  return 'providers' in config
}

export class Paasman {
  private readonly providers: Record<string, PaasProvider>
  private activeProvider: PaasProvider

  constructor(config: PaasmanConfig) {
    if (isMulti(config)) {
      this.providers = config.providers
      const keys = Object.keys(config.providers)
      if (keys.length === 0) {
        throw new ValidationError('At least one provider is required')
      }
      this.activeProvider = config.providers[keys[0]]
    } else {
      this.providers = { default: config.provider }
      this.activeProvider = config.provider
    }
  }

  use(profile: string): Paasman {
    const provider = this.providers[profile]
    if (!provider) {
      throw new ValidationError(`Unknown profile '${profile}'. Available: ${Object.keys(this.providers).join(', ')}`)
    }
    const instance = Object.create(this) as Paasman
    instance.activeProvider = provider
    return instance
  }

  get apps(): AppOperations {
    return this.activeProvider.apps
  }

  get env(): EnvOperations {
    return this.activeProvider.env
  }

  get servers(): ServerOperations | undefined {
    return this.activeProvider.servers
  }

  get databases(): DatabaseOperations | undefined {
    return this.activeProvider.databases
  }

  get deployments(): DeploymentOperations | undefined {
    return this.activeProvider.deployments
  }

  get capabilities() {
    return this.activeProvider.capabilities
  }

  get providerName() {
    return this.activeProvider.name
  }

  async healthCheck() {
    return this.activeProvider.healthCheck()
  }
}
