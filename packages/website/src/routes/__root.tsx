import {
	createRootRoute,
	HeadContent,
	Link,
	Outlet,
	Scripts,
} from "@tanstack/react-router";
import type { ReactNode } from "react";
import { Shell } from "../components/shell";
import { StackProvider } from "../components/stack-context";
import stylesheet from "../style.css?url";

export const Route = createRootRoute({
	head: () => ({
		meta: [
			{ charSet: "utf-8" },
			{ name: "viewport", content: "width=device-width, initial-scale=1" },
			{ name: "theme-color", content: "#0f0f0f" },
			{ title: "Mystack — Your stack, connected" },
			{
				name: "description",
				content:
					"Create a configured TanStack Start application. Choose your runtime, database, email and payments. Keep the source.",
			},
		],
		links: [
			{ rel: "stylesheet", href: stylesheet },
			{ rel: "icon", href: "/favicon.svg", type: "image/svg+xml" },
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
				<Scripts />
			</body>
		</html>
	);
}
