import { catalog } from "../configurator";
import { documents, documentTopics } from "../data/documentation";

const github = "https://github.com/0x0501/tanstack-starter";
const npm = "https://www.npmjs.com/package/@0x0501/mystack";
const siteName = "Mystack";
const siteDescription =
	"Create a configured TanStack Start application. Choose your runtime, database, email and payments. Keep the source.";

// Absolute URLs need a real origin. Production builds use the deployed domain;
// VITE_SITE_URL overrides it for another host.
export const siteUrl = (
	import.meta.env.VITE_SITE_URL ??
	(import.meta.env.PROD ? "https://mystack.sumku.cc" : "http://localhost:3100")
).replace(/\/+$/, "");
export const absoluteUrl = (path: string) => `${siteUrl}${path}`;

export const pages: Record<string, { title: string; description: string }> = {
	"/": {
		title: "Mystack — Your stack, connected",
		description: siteDescription,
	},
	"/integrations": {
		title: "Integrations — Mystack",
		description:
			"Choose compatible runtime, database, email and payment integrations. Watch your selected stack assemble and copy its real CLI command.",
	},
	"/foundation": {
		title: "The foundation — Mystack",
		description:
			"Explore the authentication, database, routing and headless UI foundations included in a Mystack application.",
	},
	"/quick-start": {
		title: "Quick start — Mystack",
		description:
			"Create, configure and run your first Mystack application with Bun and the published project generator.",
	},
	"/docs": {
		title: "Documentation — Mystack",
		description:
			"Guides to Mystack configuration, authentication, project structure and production deployment.",
	},
	...Object.fromEntries(
		documentTopics.map((topic) => [
			`/docs/${topic}`,
			{
				title: `${documents[topic].title} — Mystack`,
				description: documents[topic].description,
			},
		]),
	),
};

const publisher = {
	"@type": "Organization",
	name: siteName,
	url: absoluteUrl("/"),
	sameAs: [github, npm],
};

export const websiteSchema = {
	"@context": "https://schema.org",
	"@type": "WebSite",
	name: siteName,
	url: absoluteUrl("/"),
	description: siteDescription,
	inLanguage: "en",
	publisher,
};

export const softwareSchema = {
	"@context": "https://schema.org",
	"@type": "SoftwareApplication",
	name: siteName,
	description: siteDescription,
	url: absoluteUrl("/"),
	applicationCategory: "DeveloperApplication",
	downloadUrl: npm,
	license: "https://opensource.org/licenses/MIT",
	offers: { "@type": "Offer", price: "0", priceCurrency: "USD" },
	sameAs: [github],
};

export function articleSchema(path: string) {
	const { title, description } = pages[path];
	return {
		"@context": "https://schema.org",
		"@type": "TechArticle",
		headline: title,
		description,
		url: absoluteUrl(path),
		mainEntityOfPage: absoluteUrl(path),
		inLanguage: "en",
		isPartOf: { "@type": "WebSite", name: siteName, url: absoluteUrl("/") },
		publisher,
	};
}

// A route's `head`: title, description, canonical, Open Graph, Twitter and JSON-LD.
export function seo(path: string, ...schemas: object[]) {
	const { title, description } = pages[path];
	return {
		meta: [
			{ title },
			{ name: "description", content: description },
			{ property: "og:type", content: "website" },
			{ property: "og:url", content: absoluteUrl(path) },
			{ property: "og:title", content: title },
			{ property: "og:description", content: description },
			{ name: "twitter:url", content: absoluteUrl(path) },
			{ name: "twitter:title", content: title },
			{ name: "twitter:description", content: description },
		],
		links: [{ rel: "canonical", href: absoluteUrl(path) }],
		scripts: schemas.map((schema) => ({
			type: "application/ld+json",
			children: JSON.stringify(schema),
		})),
	};
}

export const sitemapXml = () => `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${Object.keys(pages)
	.map((path) => `\t<url><loc>${absoluteUrl(path)}</loc></url>`)
	.join("\n")}
</urlset>
`;

export const robotsTxt = () => `User-agent: *
Allow: /

Sitemap: ${absoluteUrl("/sitemap.xml")}
`;

const labels = (category: keyof typeof catalog) =>
	catalog[category].map((option) => option.label).join(", ");

// llms.txt: a curated, plain-language overview for AI assistants.
export const llmsTxt = () => `# ${siteName}

> ${siteDescription}

Mystack is an open-source (MIT) project generator for TanStack Start applications. Run it with Bun: \`bunx @0x0501/mystack@latest create my-app\`. It generates ordinary source code that you own; it is not a runtime dependency or a hosted service.

## Pages
${Object.entries(pages)
	.map(
		([path, { title, description }]) =>
			`- [${title.replace(/ — Mystack$/, "")}](${absoluteUrl(path)}): ${description}`,
	)
	.join("\n")}

## Choices
- Runtime: ${labels("deployment")}
- Database: ${labels("database")}
- Email: ${labels("email")}
- Payments: ${labels("payments")}

## Key facts
- Generated applications use React 19, TanStack Start, TanStack Router and TanStack Query.
- Authentication uses Better Auth: verified email and password, passkeys, email OTP and two-factor authentication. The application can also act as an OAuth 2.0 / OIDC identity provider.
- The project records its creation choices in mystack.json. Editing that file does not regenerate source.

## Links
- Website: ${absoluteUrl("/")}
- GitHub: ${github}
- npm: ${npm}
`;
