import { createFileRoute, Link } from "@tanstack/react-router";
import { CodeBlock, PageHeading } from "../components/shell";
import { CopyCommand } from "../components/stack-builder";
import { useStack } from "../components/stack-context";
import { setupNote } from "../configurator";

export const Route = createFileRoute("/quick-start")({
	head: () => ({
		meta: [
			{ title: "Quick start — Mystack" },
			{
				name: "description",
				content:
					"Create, configure and run your first Mystack application with Bun and the published project generator.",
			},
		],
	}),
	component: QuickStart,
});
function QuickStart() {
	const { selection } = useStack();
	return (
		<>
			<PageHeading
				title={
					<>
						From CLI
						<br />
						to localhost.
					</>
				}
			>
				<p>
					Install Node.js 22.12+ and Bun. Choose a new project name and use a
					directory that does not already exist.
				</p>
			</PageHeading>
			<div className="quick-layout">
				<aside className="quick-machine">
					<p>Your choices stay with you as you explore the site.</p>
					<Link to="/integrations" className="text-link">
						Change your configuration ↗
					</Link>
				</aside>
				<ol className="quick-steps">
					<li>
						<h2>Create.</h2>
						<p>
							Use your selected configuration, or run{" "}
							<code>bunx @0x0501/mystack@latest</code> to open the terminal
							wizard.
						</p>
						<CopyCommand />
					</li>
					<li>
						<h2>Configure.</h2>
						<p>
							Enter the generated directory and copy its environment example.
							Set the database and provider credentials described in its README.
						</p>
						<CodeBlock title="Local environment">
							{"cd my-app\ncp .env.example .env"}
						</CodeBlock>
						<p>
							If dependencies were skipped or installation failed, run{" "}
							<code>bun install</code> before continuing.
						</p>
					</li>
					<li>
						<h2>Migrate.</h2>
						<p>{setupNote(selection)}</p>
						<CodeBlock title="Apply the initial migrations">
							{selection.database.startsWith("pg")
								? "bun run db:up\nbun run db:migrate"
								: "bun run db:migrate"}
						</CodeBlock>
						<p>
							Every configuration includes initial migrations. Local migration
							commands target your local development database.
						</p>
					</li>
					<li>
						<h2>Build.</h2>
						<p>
							Start the development server and open your application at{" "}
							<a href="http://localhost:3000">http://localhost:3000</a>.
						</p>
						<CodeBlock title="Start development">{"bun run dev"}</CodeBlock>
						<p>
							Without mail credentials, authentication email is logged in
							development. PostgreSQL projects can run{" "}
							<code>bun run db:seed</code> for local test users; SQLite projects
							begin with normal sign-up.
						</p>
					</li>
				</ol>
			</div>
			<section className="chapter next-step">
				<h2>Ready for production?</h2>
				<p>
					Production requires real domains, secrets and provisioned resources.
					Deployment does not apply database migrations automatically.
				</p>
				<Link
					to="/docs/$topic"
					params={{ topic: "deployment" }}
					className="button"
				>
					Read the deployment guide ↗
				</Link>
			</section>
		</>
	);
}
