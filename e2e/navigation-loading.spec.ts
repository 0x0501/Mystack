import { expect, test } from "@playwright/test";

test("cached SSR session allows navigation while a slow page chunk shows loading feedback", async ({
	page,
}) => {
	const errors: string[] = [];
	let sessionRequests = 0;
	page.on("pageerror", (error) => errors.push(error.message));
	page.on("request", (request) => {
		if (request.url().includes("/_serverFn/")) {
			sessionRequests++;
		}
	});
	await page.goto("/sign-in");
	await expect(page.getByRole("button", { name: "Sign in", exact: true })).toBeVisible();

	let release!: () => void;
	const gate = new Promise<void>((resolve) => {
		release = resolve;
	});
	await page.route(/\/assets\/sign-up-[^/]+\.js$/, async (route) => {
		await gate;
		await route.continue();
	});
	await page.getByRole("link", { name: "Sign up", exact: true }).click();
	try {
		await expect(page).toHaveURL(/\/sign-up$/);
		await expect(page.getByRole("status")).toHaveText("Loading…");
		expect(sessionRequests).toBe(0);
	} finally {
		release();
	}
	await expect(page.getByRole("heading", { name: "Create account" })).toBeVisible();
	expect(sessionRequests).toBe(0);
	expect(errors).toEqual([]);
});

test("an expired session query provides feedback while the root guard awaits the server", async ({
	page,
}) => {
	const errors: string[] = [];
	page.on("pageerror", (error) => errors.push(error.message));
	await page.goto("/sign-in");
	await expect(page.getByRole("button", { name: "Sign in", exact: true })).toBeVisible();
	await page.clock.install();
	await page.clock.fastForward(31_000);

	let release!: () => void;
	let requests = 0;
	const gate = new Promise<void>((resolve) => {
		release = resolve;
	});
	await page.route("**/_serverFn/**", async (route) => {
		requests++;
		await gate;
		await route.continue();
	});
	await page.getByRole("link", { name: "Sign up", exact: true }).click();
	try {
		await expect(page).toHaveURL(/\/sign-up$/);
		await expect(page.getByRole("status")).toHaveText("Loading…");
		await expect(page.getByRole("heading", { name: "Sign in", exact: true })).toBeVisible();
		expect(requests).toBe(1);
	} finally {
		release();
	}
	await expect(page.getByRole("heading", { name: "Create account" })).toBeVisible();
	expect(requests).toBe(1);
	expect(errors).toEqual([]);
});
