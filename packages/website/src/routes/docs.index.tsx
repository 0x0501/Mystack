import { ArrowUpRight } from "../components/arrow-up-right";
import { createFileRoute, Link } from "@tanstack/react-router";
import { PageHeading } from "../components/shell";
import { documents, documentTopics } from "../data/documentation";
import { seo } from "../services/seo";

export const Route = createFileRoute("/docs/")({
	head: () => seo("/docs"),
	component: Documentation,
});
function Documentation() {
	return (
		<>
			<PageHeading
				title={
					<>
						Understand
						<br />
						the assembly.
					</>
				}
			>
				<p>
					Practical guides for the project you generate.
					<br />
					From choosing services to operating your application.
				</p>
			</PageHeading>
			<div className="docs-index">
				<div className="docs-intro">
					<h2>New to Mystack?</h2>
					<p>
						The quick start takes you from the project wizard to a running local
						application.
					</p>
					<Link to="/quick-start" className="button">
						Follow the quick start <ArrowUpRight />
					</Link>
				</div>
				<div className="document-list">
					{documentTopics.map((topic) => (
						<Link key={topic} to="/docs/$topic" params={{ topic }}>
							<h2>{documents[topic].title}</h2>
							<p>{documents[topic].description}</p>
							<ArrowUpRight />
						</Link>
					))}
				</div>
			</div>
			<section className="chapter docs-note">
				<h2>Source-backed guidance.</h2>
				<p>
					These guides describe the maintained Mystack generator. Your generated
					README is the reference for the exact configuration you selected. The
					source repository contains deeper architecture notes and contributor
					documentation.
				</p>
				<a
					className="text-link"
					href="https://github.com/0x0501/mystack/tree/main/docs"
				>
					Browse the repository documentation <ArrowUpRight />
				</a>
			</section>
		</>
	);
}
