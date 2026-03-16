import { defineConfig } from "vitepress";

export default defineConfig({
	title: "Paasman",
	description: "Universal CLI for self-hosted PaaS platforms",
	themeConfig: {
		nav: [
			{ text: "Guide", link: "/guide/getting-started" },
			{ text: "Providers", link: "/guide/providers" },
			{ text: "GitHub", link: "https://github.com/aerocyberlabs/paasman" },
		],
		sidebar: [
			{
				text: "Guide",
				items: [
					{ text: "Getting Started", link: "/guide/getting-started" },
					{ text: "Configuration", link: "/guide/configuration" },
					{ text: "CLI Reference", link: "/guide/cli-reference" },
					{ text: "Providers", link: "/guide/providers" },
				],
			},
			{
				text: "Providers",
				items: [
					{ text: "Coolify", link: "/providers/coolify" },
					{ text: "Dokploy", link: "/providers/dokploy" },
					{ text: "CapRover", link: "/providers/caprover" },
					{ text: "Dokku", link: "/providers/dokku" },
				],
			},
			{
				text: "Contributing",
				items: [
					{ text: "Overview", link: "/contributing/" },
					{ text: "Creating a Provider", link: "/contributing/creating-a-provider" },
				],
			},
		],
		socialLinks: [{ icon: "github", link: "https://github.com/aerocyberlabs/paasman" }],
	},
});
