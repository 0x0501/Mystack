import { TanStackDevtools } from "@tanstack/react-devtools";
import {
	createRootRoute,
	HeadContent,
	Link,
	Outlet,
	Scripts,
} from "@tanstack/react-router";
import { TanStackRouterDevtoolsPanel } from "@tanstack/react-router-devtools";
import type { ReactNode } from "react";
import { Shell } from "../components/shell";
import { StackProvider } from "../components/stack-context";
import { absoluteUrl, pages, websiteSchema } from "../services/seo";
import stylesheet from "../style.css?url";

const ogImage = absoluteUrl("/og.png");
const ogImageAlt =
	"A line-art letterpress beside the words: Your stack. Connected.";

export const Route = createRootRoute({
	head: () => ({
		meta: [
			{ charSet: "utf-8" },
			{ name: "viewport", content: "width=device-width, initial-scale=1" },
			{ name: "theme-color", content: "#0f0f0f" },
			{ title: pages["/"].title },
			{ name: "description", content: pages["/"].description },
			{ property: "og:site_name", content: "Mystack" },
			{ property: "og:locale", content: "en_US" },
			{ property: "og:image", content: ogImage },
			{ property: "og:image:width", content: "1200" },
			{ property: "og:image:height", content: "630" },
			{ property: "og:image:alt", content: ogImageAlt },
			{ name: "twitter:card", content: "summary_large_image" },
			{ name: "twitter:image", content: ogImage },
			{ name: "twitter:image:alt", content: ogImageAlt },
		],
		links: [
			{ rel: "stylesheet", href: stylesheet },
			{ rel: "icon", href: "/favicon.svg", type: "image/svg+xml" },
		],
		scripts: [
			{
				type: "application/ld+json",
				children: JSON.stringify(websiteSchema),
			},
		],
	}),
	component: () => (
		<StackProvider>
			<Shell>
				<Outlet />
			</Shell>
		</StackProvider>
	),
	shellComponent: Document,
	notFoundComponent: () => (
		<section className="empty-page">
			<h1>Page not found.</h1>
			<p>This page is not part of the stack.</p>
			<Link to="/" className="button">
				Back to Mystack
			</Link>
		</section>
	),
	errorComponent: ({ reset }) => (
		<section className="empty-page">
			<h1>Something went wrong.</h1>
			<p>Try loading this page again.</p>
			<button type="button" className="button" onClick={reset}>
				Try again
			</button>
		</section>
	),
});
function Document({ children }: { children: ReactNode }) {
	return (
		<html lang="en">
			<head>
				<HeadContent />
			</head>
			<body>
				{children}
				{import.meta.env.DEV ? (
					<TanStackDevtools
						config={{ position: "bottom-right" }}
						plugins={[
							{
								name: "TanStack Router",
								render: <TanStackRouterDevtoolsPanel />,
							},
						]}
					/>
				) : null}
				<Scripts />
			</body>
		</html>
	);
}
