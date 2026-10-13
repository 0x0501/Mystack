// @vitest-environment jsdom

import { dehydrate, hydrate, QueryObserver } from "@tanstack/react-query";
import { createMemoryHistory, RouterProvider } from "@tanstack/react-router";
import { act, cleanup, render, screen, waitFor } from "@testing-library/react";
import type { ReactNode } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { RootSession } from "@/server/auth";

const { getSession, loadPage } = vi.hoisted(() => ({
	getSession: vi.fn<() => Promise<RootSession | null>>(),
	loadPage: vi.fn<() => Promise<string>>(),
}));

vi.mock("@/server/auth", () => ({ getSession }));
vi.mock("#/components/root/root-document.tsx", () => ({
	RootDocument: ({ children }: { children: ReactNode }) => children,
}));

// Keep the real root beforeLoad, router defaults and SSR Query integration.
// Only replace the child pages and their network/database responses.
vi.mock("@/routeTree.gen", async () => {
	const { createRoute, Link, redirect } = await import(
		"@tanstack/react-router"
	);
	const { Route: root } = await import("@/routes/__root");
	const home = createRoute({
		getParentRoute: () => root,
		path: "/",
		component: () => (
			<div>
				<h1>Previous page</h1>
				<Link to="/dashboard">Next page</Link>
			</div>
		),
	});
	const dashboard = createRoute({
		getParentRoute: () => root,
		path: "/dashboard",
		beforeLoad: ({ context }) => {
			if (!context.session) throw redirect({ to: "/sign-in" });
		},
		loader: ({ context }) =>
			context.queryClient.ensureQueryData({
				queryKey: ["page"],
				queryFn: loadPage,
			}),
		component: () => <h1>Next page</h1>,
	});
	const signIn = createRoute({
		getParentRoute: () => root,
		path: "/sign-in",
		component: () => <h1>Sign in</h1>,
	});
	return { routeTree: root.addChildren([home, dashboard, signIn]) };
});

const { getRouter } = await import("@/router");
const { sessionQueryOptions } = await import(
	"@/integrations/better-auth/session-query"
);

const session: RootSession = {
	user: {
		id: "user-1",
		email: "user@example.com",
		name: "User",
		emailVerified: true,
		role: "user",
		twoFactorEnabled: false,
		locale: "en",
	},
};

function deferred<T>() {
	let resolve!: (value: T) => void;
	const promise = new Promise<T>((done) => {
		resolve = done;
	});
	return { promise, resolve };
}

const routers: ReturnType<typeof getRouter>[] = [];

function createTestRouter() {
	const router = getRouter();
	router.update({
		context: router.options.context,
		history: createMemoryHistory({ initialEntries: ["/"] }),
	});
	routers.push(router);
	return router;
}

async function start() {
	const router = createTestRouter();
	await router.load();
	render(<RouterProvider router={router} />);
	await screen.findByRole("heading", { name: "Previous page" });
	return router;
}

beforeEach(() => {
	vi.spyOn(window, "scrollTo").mockImplementation(() => {});
	getSession.mockReset().mockResolvedValue(session);
	loadPage.mockReset().mockResolvedValue("page data");
});

afterEach(() => {
	cleanup();
	vi.restoreAllMocks();
	for (const router of routers.splice(0)) {
		router.options.context.queryClient.clear();
	}
});

describe("navigation with production network latency", () => {
	it("isolates router caches and reuses the hydrated session in the browser", async () => {
		const firstRequest = createTestRouter();
		const secondRequest = createTestRouter();
		await firstRequest.load();
		getSession.mockResolvedValue(null);
		await secondRequest.load();
		expect(firstRequest.state.matches[0]?.context.session).toEqual(session);
		expect(secondRequest.state.matches[0]?.context.session).toBeNull();
		expect(getSession).toHaveBeenCalledTimes(2);

		const browser = createTestRouter();
		hydrate(
			browser.options.context.queryClient,
			dehydrate(firstRequest.options.context.queryClient),
		);
		await browser.load();
		expect(browser.state.matches[0]?.context.session).toEqual(session);
		expect(getSession).toHaveBeenCalledTimes(2);
	});

	it("deduplicates concurrent session checks", async () => {
		const router = createTestRouter();
		const gate = deferred<RootSession | null>();
		getSession.mockReturnValue(gate.promise);
		const first =
			router.options.context.queryClient.fetchQuery(sessionQueryOptions);
		const second =
			router.options.context.queryClient.fetchQuery(sessionQueryOptions);
		gate.resolve(session);
		await expect(Promise.all([first, second])).resolves.toEqual([
			session,
			session,
		]);
		expect(getSession).toHaveBeenCalledTimes(1);
	});

	it("does not hold a failed session check through retry backoff", async () => {
		const router = createTestRouter();
		getSession.mockRejectedValue(new TypeError("Failed to fetch"));
		await expect(
			router.options.context.queryClient.fetchQuery(sessionQueryOptions),
		).rejects.toThrow("Failed to fetch");
		expect(getSession).toHaveBeenCalledTimes(1);
	});

	it("reuses the session across intent preloading and client navigation", async () => {
		const router = await start();
		await act(() => router.preloadRoute({ to: "/dashboard" }));
		await act(() => router.navigate({ to: "/dashboard" }));

		await screen.findByRole("heading", { name: "Next page" });
		expect(getSession).toHaveBeenCalledTimes(1);
		expect(loadPage).toHaveBeenCalledTimes(1);
	});

	it("revalidates an expired session before entering a protected page", async () => {
		const router = await start();
		router.options.context.queryClient.setQueryData(
			["auth", "session"],
			session,
			{
				updatedAt: Date.now() - 31_000,
			},
		);
		getSession.mockResolvedValue(null);
		await act(() => router.navigate({ to: "/dashboard" }));

		await screen.findByRole("heading", { name: "Sign in" });
		expect(loadPage).not.toHaveBeenCalled();
	});

	it("shows loading feedback while a session check is waiting", async () => {
		const router = await start();
		const gate = deferred<RootSession | null>();
		getSession.mockReturnValue(gate.promise);
		await router.options.context.queryClient.invalidateQueries({
			queryKey: ["auth", "session"],
		});
		let navigation!: Promise<void>;
		act(() => {
			navigation = router.navigate({ to: "/dashboard" });
		});
		try {
			await screen.findByRole("status", {}, { timeout: 600 });
			expect(loadPage).not.toHaveBeenCalled();
		} finally {
			await act(async () => {
				gate.resolve(session);
				await navigation;
			});
		}
		await screen.findByRole("heading", { name: "Next page" });
	});

	it("shows loading feedback during a slow loader and renders as soon as it resolves", async () => {
		const router = await start();
		const gate = deferred<string>();
		loadPage.mockReturnValue(gate.promise);
		let navigation!: Promise<void>;
		act(() => {
			navigation = router.navigate({ to: "/dashboard" });
		});
		let resolvedAt = 0;
		try {
			await screen.findByRole("status", {}, { timeout: 600 });
			expect(
				screen.queryByRole("heading", { name: "Previous page" }),
			).toBeNull();
		} finally {
			await act(async () => {
				resolvedAt = performance.now();
				gate.resolve("page data");
				await navigation;
			});
		}
		await screen.findByRole("heading", { name: "Next page" }, { timeout: 200 });
		expect(performance.now() - resolvedAt).toBeLessThan(300);
	});

	it("does not fetch loader data again when the page mounts its query", async () => {
		const router = await start();
		await act(() => router.navigate({ to: "/dashboard" }));
		const observer = new QueryObserver(router.options.context.queryClient, {
			queryKey: ["page"],
			queryFn: loadPage,
		});
		const unsubscribe = observer.subscribe(() => {});
		try {
			await waitFor(() =>
				expect(observer.getCurrentResult().isFetching).toBe(false),
			);
			expect(loadPage).toHaveBeenCalledTimes(1);
		} finally {
			unsubscribe();
		}
	});

	it("refreshes invalidated session data when route guards are rerun", async () => {
		const router = await start();
		getSession.mockResolvedValue({
			...session,
			user: { ...session.user, name: "Updated" },
		});
		await router.options.context.queryClient.invalidateQueries({
			queryKey: ["auth", "session"],
		});
		await act(() => router.invalidate());
		expect(router.state.matches[0]?.context.session?.user.name).toBe("Updated");
		expect(getSession).toHaveBeenCalledTimes(2);
	});
});
