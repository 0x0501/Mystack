export const documents = {
	configuration: {
		title: "Configuration",
		description: "Choose a compatible stack and make the CLI reproducible.",
		sections: [
			{
				id: "wizard",
				title: "The project wizard",
				body: "Run the published package through Bunx. Choose a database, runtime, email transport and any subset of payment providers. Arrow keys navigate, Space toggles payment providers, and Enter confirms. Escape or Ctrl-C cancels before creation.",
				code: "bunx @0x0501/mystack@latest create my-app",
			},
			{
				id: "flags",
				title: "Explicit flags",
				body: "Use --yes to skip prompts. Supply all four categories to make the selection explicit. The CLI uses the same compatibility rules as the website builder. --payments none removes payment integrations; otherwise the default payment provider is Stripe.",
				code: "bunx @0x0501/mystack@latest create local-app --yes --database bun-sqlite --deployment bun --email resend --payments none",
			},
			{
				id: "database",
				title: "Database and runtime",
				body: "PostgreSQL direct connections support Nitro and Bun. Hyperdrive and D1 require Cloudflare Workers. Turso Cloud supports all three runtimes; local libSQL supports Nitro and Bun. Native Bun SQLite requires Bun. Cloudflare Email requires Workers; Resend supports all runtimes.",
			},
			{
				id: "install",
				title: "Dependency installation",
				body: "Add --no-install to generate files without installing dependencies. If installation fails, the generated application remains in place. Enter its directory and run bun install to retry.",
				code: "cd my-app\nbun install",
			},
			{
				id: "record",
				title: "The creation record",
				body: "mystack.json records the choices used to generate the application. It is not a live reconfiguration API. Editing the file does not regenerate source, switch database engines or migrate existing data. Modify the generated source deliberately when your requirements change.",
			},
		],
	},
	authentication: {
		title: "Authentication",
		description:
			"Understand the identity provider and the boundaries around it.",
		sections: [
			{
				id: "sign-in",
				title: "Sign-in methods",
				body: "Better Auth provides verified email/password sign-in, passkeys, email OTP and two-factor authentication. GitHub social sign-in is configured only when the required GitHub credentials are present. Turnstile is optional and stays off when its keys are unset.",
			},
			{
				id: "identity",
				title: "An identity provider",
				body: "The generated application is an OAuth 2.0 / OIDC identity provider. It issues tokens to your clients through an authorization flow. Interactive login and consent preserve the signed authorization query so the server can validate and resume the request.",
				code: "/sign-in\n/oauth/consent\n/api/auth/oauth2/authorize",
			},
			{
				id: "environment",
				title: "Auth configuration",
				body: "Configure the application origin, Better Auth URL, a fresh auth secret and email sender. Keep server-only secrets out of VITE_-prefixed variables and browser bundles. Development mail is logged if provider credentials are absent.",
				code: "APP_ORIGIN\nBETTER_AUTH_URL\nBETTER_AUTH_SECRET\nEMAIL_FROM",
			},
			{
				id: "guards",
				title: "Server-side guards",
				body: "Authenticated and administrative actions are authorized on the server. Sensitive Better Auth HTTP paths are disabled where they would bypass application guards; the application calls those capabilities through guarded server functions. Client-side navigation alone is not an authorization boundary.",
			},
			{
				id: "schema",
				title: "Generated auth schema",
				body: "The Better Auth schema is generated from the auth configuration. When changing auth plugins or fields, regenerate the schema and create the corresponding database migration. Handwritten platform tables remain separate from the generated auth tables.",
			},
		],
	},
	"project-structure": {
		title: "Project structure",
		description:
			"Find the right home for a route, a service or a presentation change.",
		sections: [
			{
				id: "source",
				title: "Source ownership",
				body: "You work in the generated application. The starter repository is the maintained reference template and generator source. The generated README contains instructions for your selected database, runtime and providers.",
				code: "src/\n  routes/\n  server/\n  services/\n  middlewares/\n  db/\n  lib/\n  styles/",
			},
			{
				id: "routes",
				title: "Routes and server functions",
				body: "File-based pages and API routes live in src/routes. TanStack Start server functions live in src/server. State-changing server functions use POST and validate their inputs. Pure reads use GET so route loaders can prefetch them.",
			},
			{
				id: "services",
				title: "Business logic",
				body: "Framework-independent domain logic lives in src/services. Route handlers, server functions and middleware delegate to these services. Framework configuration and integration glue live in src/lib.",
			},
			{
				id: "data",
				title: "Data access",
				body: "Database schemas and connection setup live in src/db. PostgreSQL work that must respect row-level security uses the application’s RLS transaction helpers. SQLite variants use server guards and explicit ownership predicates. Keep privileged migration credentials separate from runtime credentials.",
			},
			{
				id: "presentation",
				title: "Headless presentation",
				body: "Base UI supplies interaction behavior; theme values, layout and motion are replaceable. Customize the styles and page composition while preserving keyboard access, reduced motion, hydration safety and the signed OAuth request flow.",
			},
			{
				id: "checks",
				title: "Project checks",
				body: "Use the generated scripts to check formatting, types and application behavior. Database integration suites need the corresponding local database environment; PostgreSQL test suites use Docker and Testcontainers.",
				code: "bun run check\nbun run typecheck\nbun run test",
			},
		],
	},
	deployment: {
		title: "Deployment",
		description:
			"Move from local development to your own production resources.",
		sections: [
			{
				id: "prepare",
				title: "Prepare production",
				body: "Set real app/auth origins, a fresh Better Auth secret, a verified email sender and the credentials for the services you selected. Configure payment webhook endpoints and signature secrets. Replace local database credentials with production credentials. Mystack does not provision cloud resources.",
			},
			{
				id: "workers",
				title: "Cloudflare Workers",
				body: "Provision the selected Hyperdrive or D1 resource and replace placeholder identifiers in wrangler.jsonc. Configure the Cloudflare email binding if selected. Create the production environment file and authenticate Wrangler. Follow the generated README for the exact binding and secret configuration.",
				code: "bunx wrangler login\nbun run deploy",
			},
			{
				id: "migrations",
				title: "Apply migrations separately",
				body: "Deployment does not apply database migrations. D1 applies hosted migrations with db:migrate:remote. Turso Cloud’s db:migrate:remote reads .env.prod and rejects local URLs. PostgreSQL migration tooling uses DATABASE_MIGRATION_URL from its documented environment loading; configure the production target deliberately before running it.",
				code: "# D1 / Turso Cloud: hosted migration command\nbun run db:migrate:remote\n\n# PostgreSQL: with production migration credentials\nbun run db:migrate",
			},
			{
				id: "server",
				title: "Nitro and Bun",
				body: "Inject the production environment on your host, apply migrations against the production database, then use the generated deployment and start scripts. Nitro uses a Node server preset. Bun uses its native server entry.",
				code: "bun run deploy\nbun run start",
			},
			{
				id: "persistence",
				title: "Local database files",
				body: "Turso Local and Bun SQLite need persistent storage for the database and its sidecar files in production. An ephemeral application filesystem is not durable storage. Back up and operate the database according to your hosting environment.",
			},
		],
	},
} as const;
export type DocumentTopic = keyof typeof documents;
export const documentTopics = Object.keys(documents) as DocumentTopic[];
