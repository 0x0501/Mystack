import { Link, useLocation } from "@tanstack/react-router";
import type { ReactNode } from "react";
import { sceneForPath, sideForPath } from "../services/assembly";
import { mechanismInfo } from "../services/mechanics";
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
					<svg viewBox="0 0 70 70" aria-hidden="true">
						<path
							d="M6 59V11h13l16 27 16-27h13v48H51V35L35 61 19 35v24Z"
							fill="currentColor"
						/>
					</svg>
					mystack
				</Link>
				<p>
					A starting point.
					<br />
					With a point of view.
				</p>
				<a href="https://github.com/0x0501/tanstack-starter">
					View on GitHub ↗
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
			<main id="main">{children}</main>
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
					<a href="https://github.com/0x0501/tanstack-starter">GitHub ↗</a>
					<a href="https://www.npmjs.com/package/@0x0501/mystack">npm ↗</a>
				</nav>
				<Link to="/integrations" className="footer-cta">
					Build your stack <span aria-hidden="true">↗</span>
				</Link>
				<div className="footer-mark" aria-hidden="true">
					mystack
				</div>
				<div className="credits">
					<span>Mystack · MIT licensed</span>
					<span>
						Built with TanStack Start. Modeled in Blender. Rendered with
						Three.js.
					</span>
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
			<div>
				{children}
				<MechanismIntro />
			</div>
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

export function MechanismIntro() {
	const path = useLocation({ select: (location) => location.pathname });
	const info = mechanismInfo[sceneForPath(path)];
	return (
		<p className="mechanism-description">
			<strong>{info.title}.</strong> {info.description}
		</p>
	);
}
