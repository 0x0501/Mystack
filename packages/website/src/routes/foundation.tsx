import { createFileRoute, Link } from "@tanstack/react-router";
import { CodeBlock, PageHeading } from "../components/shell";
import { seo } from "../services/seo";

export const Route = createFileRoute("/foundation")({
	head: () => seo("/foundation"),
	component: Foundation,
});
function Foundation() {
	return (
		<>
			<PageHeading
				title={
					<>
						Open the
						<br />
						enclosure.
					</>
				}
			>
				<p>
					Mystack connects routing, authentication, data and delivery in source
					you can inspect and change.
				</p>
			</PageHeading>
			<section className="foundation-overview">
				<div>
					<h2>A working core.</h2>
					<p>
						React 19 and TanStack Start handle the application. TanStack Router
						and Query coordinate navigation, data loading and server state.
					</p>
					<p>
						Server functions stay thin. Framework-independent services hold
						domain logic. The generated source has room for your product to
						grow.
					</p>
				</div>
			</section>
			<section className="chapter foundation-detail">
				<div>
					<h2>
						Identity,
						<br />
						from the start.
					</h2>
					<p>
						Better Auth includes verified email and password, passkeys, email
						OTP and two-factor authentication. GitHub social sign-in is
						available when its credentials are configured.
					</p>
					<p>
						The application can also act as an OAuth 2.0 / OIDC identity
						provider, issuing tokens to your clients through the authorization
						flow.
					</p>
					<Link
						to="/docs/$topic"
						params={{ topic: "authentication" }}
						className="text-link"
					>
						Explore authentication ↗
					</Link>
				</div>
				<CodeBlock title="Auth configuration · plugin excerpt">
					{
						'jwt(),\noauthProvider({\n  loginPage: "/sign-in",\n  consentPage: "/oauth/consent",\n}),\nadmin(),\ntwoFactor(),\nemailOTP(),\npasskey(),'
					}
				</CodeBlock>
			</section>
			<section className="chapter split-story">
				<div className="story-copy">
					<h2>
						Data with
						<br />
						boundaries.
					</h2>
					<p>
						Drizzle supplies the database schema and migrations. PostgreSQL
						variants use row-level security; SQLite variants use server
						authorization and explicit ownership checks.
					</p>
					<p>
						Runtime credentials and privileged migration credentials have
						separate purposes. Your generated README explains the selected
						configuration.
					</p>
					<Link
						to="/docs/$topic"
						params={{ topic: "project-structure" }}
						className="text-link"
					>
						See the source structure ↗
					</Link>
				</div>
			</section>
			<section className="chapter foundation-detail">
				<div>
					<h2>
						Presentation
						<br />
						stays yours.
					</h2>
					<p>
						Base UI supplies accessible interactions without dictating
						appearance. Theme, layout and motion are product decisions.
						Paraglide provides the internationalization layer.
					</p>
					<p>
						Generated applications include working user and admin flows. You can
						replace their presentation while retaining authentication and
						authorization behavior.
					</p>
				</div>
				<CodeBlock title="Clear ownership in the source">
					{
						"src/\n  routes/       # Pages and routing\n  server/       # Server functions\n  services/     # Domain logic\n  middlewares/  # Server guards\n  db/           # Schema and data access\n  styles/       # Replaceable presentation"
					}
				</CodeBlock>
			</section>
		</>
	);
}
