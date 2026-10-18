import { ArrowUpRight } from "../components/arrow-up-right";
import { createFileRoute, Link, notFound } from "@tanstack/react-router";
import { CodeBlock } from "../components/shell";
import {
	type DocumentTopic,
	documents,
	documentTopics,
} from "../data/documentation";
import { articleSchema, seo } from "../services/seo";

export const Route = createFileRoute("/docs/$topic")({
	beforeLoad: ({ params }) => {
		if (!Object.hasOwn(documents, params.topic)) throw notFound();
	},
	head: ({ params }) => {
		const path = `/docs/${params.topic}`;
		return seo(path, articleSchema(path));
	},
	component: Document,
});
function Document() {
	const { topic } = Route.useParams();
	const document = documents[topic as DocumentTopic];
	return (
		<div className="docs-layout">
			<aside className="docs-sidebar">
				<Link to="/docs" className="text-link">
					All documentation
				</Link>
				<nav aria-label="Documentation topics">
					{documentTopics.map((key) => (
						<Link
							to="/docs/$topic"
							params={{ topic: key }}
							key={key}
							activeProps={{ className: "is-active" }}
						>
							{documents[key].title}
						</Link>
					))}
				</nav>
			</aside>
			<article className="document">
				<header>
					<h1>{document.title}</h1>
					<p>{document.description}</p>
				</header>
				<nav className="document-contents" aria-label="On this page">
					{document.sections.map((section) => (
						<a href={`#${section.id}`} key={section.id}>
							{section.title}
						</a>
					))}
				</nav>
				{document.sections.map((section) => (
					<section id={section.id} key={section.id}>
						<h2>{section.title}</h2>
						<p>{section.body}</p>
						{"code" in section && (
							<CodeBlock title={section.title}>{section.code}</CodeBlock>
						)}
					</section>
				))}
				<div className="document-bottom">
					<Link to="/quick-start">Quick start</Link>
					<Link to="/integrations">Build your stack <ArrowUpRight /></Link>
				</div>
			</article>
		</div>
	);
}
