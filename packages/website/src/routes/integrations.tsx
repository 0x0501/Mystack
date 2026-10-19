import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowUpRight } from "../components/arrow-up-right";
import { CodeBlock, PageHeading } from "../components/shell";
import { CopyCommand, StackBuilder } from "../components/stack-builder";
import { useStack } from "../components/stack-context";
import { seo } from "../services/seo";

export const Route = createFileRoute("/integrations")({
	head: () => seo("/integrations"),
	component: Integrations,
});
function Integrations() {
	const { selection } = useStack();
	return (
		<>
			<PageHeading
				title={
					<>
						Choose your
						<br />
						components.
					</>
				}
			>
				<p>
					A different combination builds a different application. Select your
					services and watch the matching parts come together.
				</p>
			</PageHeading>
			<div className="integration-layout">
				<div className="integration-controls">
					<StackBuilder />
					<CopyCommand />
				</div>
				<aside className="assembly-workbench">
					<p className="assembly-note">
						A configurable letterpress: the runtime drives it, the database sets
						the type, and the delivery and stamping fittings complete the
						workflow.
					</p>
					<CodeBlock title="Your creation record">
						{JSON.stringify(selection, null, 2)}
					</CodeBlock>
				</aside>
			</div>
			<section className="chapter">
				<div className="section-heading">
					<h2>
						What connects
						<br />
						to what.
					</h2>
					<p>
						The website and CLI share the same catalog.
						<br />
						Compatibility is part of the configuration.
					</p>
				</div>
				<div className="compatibility-table">
					<table>
						<caption>Supported database and runtime combinations</caption>
						<thead>
							<tr>
								<th scope="col">Database</th>
								<th scope="col">Cloudflare</th>
								<th scope="col">Nitro</th>
								<th scope="col">Bun</th>
								<th scope="col">Local development</th>
							</tr>
						</thead>
						<tbody>
							<tr>
								<th scope="row">PostgreSQL</th>
								<td>—</td>
								<td>Yes</td>
								<td>Yes</td>
								<td>Docker PostgreSQL</td>
							</tr>
							<tr>
								<th scope="row">PostgreSQL + Hyperdrive</th>
								<td>Yes</td>
								<td>—</td>
								<td>—</td>
								<td>Docker PostgreSQL</td>
							</tr>
							<tr>
								<th scope="row">Cloudflare D1</th>
								<td>Yes</td>
								<td>—</td>
								<td>—</td>
								<td>Wrangler local database</td>
							</tr>
							<tr>
								<th scope="row">Turso Cloud</th>
								<td>Yes</td>
								<td>Yes</td>
								<td>Yes</td>
								<td>Local libSQL file or server</td>
							</tr>
							<tr>
								<th scope="row">Turso Local</th>
								<td>—</td>
								<td>Yes</td>
								<td>Yes</td>
								<td>Local libSQL file</td>
							</tr>
							<tr>
								<th scope="row">Bun SQLite</th>
								<td>—</td>
								<td>—</td>
								<td>Yes</td>
								<td>Native SQLite file</td>
							</tr>
						</tbody>
					</table>
				</div>
				<div className="integration-notes">
					<article>
						<h3>Email delivery.</h3>
						<p>
							Cloudflare Email requires the Cloudflare runtime. Resend works
							with all three runtimes. Development authentication email is
							logged when credentials are absent.
						</p>
					</article>
					<article>
						<h3>Payments, optional.</h3>
						<p>
							Select any subset of Stripe, Creem, NOWPayments and Polar. Each
							selected provider adds its own integration. Choose none when your
							application does not need payments.
						</p>
					</article>
				</div>
				<Link
					to="/docs/$topic"
					params={{ topic: "configuration" }}
					className="text-link"
				>
					Read the configuration reference <ArrowUpRight />
				</Link>
			</section>
		</>
	);
}
