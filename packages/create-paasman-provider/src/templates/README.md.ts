export function readmeTemplate(vars: { name: string; description: string }): string {
	const Name = vars.name.charAt(0).toUpperCase() + vars.name.slice(1);
	return `# @paasman/provider-${vars.name}

${vars.description}

## Installation

\`\`\`bash
npm install @paasman/provider-${vars.name} @paasman/core
\`\`\`

## Usage

\`\`\`typescript
import { ${Name}Provider } from '@paasman/provider-${vars.name}'

const provider = new ${Name}Provider({
  baseUrl: 'https://your-${vars.name}-instance.example.com',
  token: 'your-api-token',
})

// Check health
const health = await provider.healthCheck()
console.log(health)

// List apps
const apps = await provider.apps.list()
console.log(apps)
\`\`\`

## Development

\`\`\`bash
# Install dependencies
npm install

# Build
npm run build

# Run tests
npm test
\`\`\`

## License

MIT
`;
}
