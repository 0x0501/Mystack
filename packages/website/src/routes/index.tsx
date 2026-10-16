import { createFileRoute, Link } from "@tanstack/react-router";
import { CodeBlock } from "../components/shell";
import { seo, softwareSchema } from "../services/seo";

export const Route = createFileRoute("/")({
	head: () => seo("/", softwareSchema),
	component: Home,
});
function Home() {
	return (
		<>
			<section className="home-hero">
				<div className="hero-copy">
					<h1>
						Your stack.
						<br />
						Connected.
					</h1>
					<p>
						A TanStack Start foundation with auth, data, email and payments.
						Choose the components. Keep the source.
					</p>
					<Link to="/integrations" className="button">
						Build your stack <span aria-hidden="true">↗</span>
					</Link>
					<span className="small-note">
						Open source. Yours from the first line.
					</span>
				</div>
			</section>
			<div className="foundation-strip">
				<span>Built on foundations you know.</span>
				<div>
					<span>TanStack Start</span>
					<span>Better Auth</span>
					<span>Drizzle</span>
					<span>React</span>
				</div>
			</div>
			<section className="chapter split-story">
				<div className="story-copy">
					<h2>
						Every part
						<br />
						has a place.
					</h2>
					<p>
						Your choices change the application that Mystack generates. The
						database driver, runtime entry, email transport and payment
						providers arrive connected.
					</p>
					<p>
						The assembly follows those choices: a different engine, a different
						archive, and only the expansion modules you selected.
					</p>
					<Link to="/integrations" className="text-link">
						Explore the integrations ↗
					</Link>
				</div>
			</section>
			<section className="chapter">
				<div className="section-heading">
					<h2>Start further along.</h2>
					<p>
						The foundation is ready.
						<br />
						The product is still yours to invent.
					</p>
				</div>
				<div className="home-foundation">
					<div>
						<h3>Identity, data and interface.</h3>
						<p>
							Email sign-in, passkeys and two-factor authentication. Typed
							routing, server state and database migrations. Headless UI you can
							make your own.
						</p>
						<Link to="/foundation" className="text-link">
							Inside the foundation ↗
						</Link>
						<CodeBlock title="A complete application">
							{
								"my-app/\n  src/routes/\n  src/server/\n  src/services/\n  src/db/\n  mystack.json\n  README.md"
							}
						</CodeBlock>
					</div>
				</div>
			</section>
			<section className="chapter home-start">
				<div>
					<h2>
						From an idea
						<br />
						to a directory.
					</h2>
					<p>
						Start with Node.js 22.12+ and Bun. Run the wizard, choose your
						services, and follow the generated README.
					</p>
					<Link to="/quick-start" className="button">
						Create your first app <span aria-hidden="true">↗</span>
					</Link>
				</div>
				<CodeBlock title="Open the project wizard">
					{
						"bunx @0x0501/mystack@latest create my-app\n\ncd my-app\ncp .env.example .env\n\n# Configure your selected services.\n# Apply migrations, then start development.\nbun run db:migrate\nbun run dev"
					}
				</CodeBlock>
			</section>
			<section className="chapter docs-invitation">
				<div>
					<h2>
						Know what
						<br />
						you are building.
					</h2>
					<p>
						Read how the generated project is organized, how the integrations
						fit together, and what to configure before production.
					</p>
					<Link to="/docs" className="text-link">
						Read the documentation ↗
					</Link>
				</div>
			</section>
		</>
	);
}
