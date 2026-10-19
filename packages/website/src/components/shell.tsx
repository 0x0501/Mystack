import { Link, useLocation } from "@tanstack/react-router";
import type { ReactNode } from "react";
import { sceneForPath, sideForPath } from "../services/assembly";
import { ArrowUpRight } from "./arrow-up-right";
import { MechanicalWorld } from "./mechanical-world";

const navigation = [
	["/integrations", "Integrations", "Choose your components"],
	["/foundation", "The foundation", "Explore what comes connected"],
	["/quick-start", "Quick start", "Create your first project"],
	["/docs", "Documentation", "Understand the whole system"],
] as const;
export function Shell({ children }: { children: ReactNode }) {
	const pathname = useLocation({ select: (location) => location.pathname });
	return (
		<div
			className={`site-shell art-${sideForPath(pathname)} page-${pathname.startsWith("/docs/") ? "document" : pathname.replaceAll("/", "") || "home"}`}
		>
			<MechanicalWorld
				route={pathname}
				scene={sceneForPath(pathname)}
				side={sideForPath(pathname)}
			/>
			<a className="skip-link" href="#main">
				Skip to content
			</a>
			<header className="masthead">
				<Link to="/" className="wordmark" aria-label="Mystack home">
					<svg viewBox="5.5 8.5 53 47.5" aria-hidden="true">
						<g stroke="#c9c3ad" strokeWidth="1.1" strokeLinejoin="round">
							<polygon
								points="6.65,15.23 16.79,15.23 22.25,9.77 12.11,9.77"
								fill="#20211b"
							/>
							<polygon
								points="16.79,15.23 29.27,36.29 34.73,30.83 22.25,9.77"
								fill="#191a16"
							/>
							<polygon
								points="41.75,15.23 51.89,15.23 57.35,9.77 47.21,9.77"
								fill="#20211b"
							/>
							<polygon
								points="51.89,15.23 51.89,52.67 57.35,47.21 57.35,9.77"
								fill="#191a16"
							/>
							<polygon
								points="41.75,33.95 29.27,54.23 34.73,48.77 47.21,28.49"
								fill="#191a16"
							/>
							<polygon
								points="16.79,33.95 16.79,52.67 22.25,47.21 22.25,28.49"
								fill="#191a16"
							/>
						</g>
						<polygon
							points="6.65,52.67 6.65,15.23 16.79,15.23 29.27,36.29 41.75,15.23 51.89,15.23 51.89,52.67 41.75,52.67 41.75,33.95 29.27,54.23 16.79,33.95 16.79,52.67"
							fill="currentColor"
							stroke="#10110f"
							strokeWidth="0.8"
							strokeLinejoin="round"
						/>
					</svg>
					mystack
				</Link>
				<p>A starting point. With a point of view.</p>
				<a href="https://github.com/0x0501/mystack">
					View on GitHub <ArrowUpRight />
				</a>
			</header>
			<nav className="navigation" aria-label="Main navigation">
				{navigation.map(([to, title, hint]) => (
					<Link key={to} to={to} activeProps={{ className: "is-active" }}>
						<span>{title}</span>
						<small>{hint}</small>
					</Link>
				))}
			</nav>
			<main id="main" key={pathname}>
				{children}
			</main>
			<footer className="site-footer">
				<div>
					<h2>
						Make something
						<br />
						yours.
					</h2>
					<p>
						A considered foundation.
						<br />
						An open-ended next chapter.
					</p>
				</div>
				<nav aria-label="Footer navigation">
					{navigation.map(([to, title]) => (
						<Link key={to} to={to}>
							{title}
						</Link>
					))}
					<a href="https://github.com/0x0501/mystack">
						GitHub <ArrowUpRight />
					</a>
					<a href="https://www.npmjs.com/package/@0x0501/mystack">
						npm <ArrowUpRight />
					</a>
				</nav>
				<Link to="/integrations" className="footer-cta">
					Build your stack <ArrowUpRight />
				</Link>
				<div className="footer-mark" aria-hidden="true">
					mystack
				</div>
				<div className="credits">
					<span>Mystack · MIT licensed</span>
					<span>Built with TanStack Start</span>
				</div>
			</footer>
		</div>
	);
}
export function PageHeading({
	title,
	children,
}: {
	title: ReactNode;
	children: ReactNode;
}) {
	return (
		<header className="page-heading">
			<h1>{title}</h1>
			<div>{children}</div>
		</header>
	);
}
export function CodeBlock({
	title,
	children,
}: {
	title: string;
	children: string;
}) {
	return (
		<div className="code-block" data-ui>
			<div className="code-caption">{title}</div>
			<pre>
				<code>{children}</code>
			</pre>
		</div>
	);
}
