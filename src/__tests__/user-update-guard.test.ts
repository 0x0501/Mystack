/**
 * Seam: `user.update.before` must refuse server-controlled columns.
 *
 * Better Auth merges a before-hook result over the original data, so
 * stripping keys is a silent no-op. The guard refuses instead.
 */
import { drizzleAdapter } from "@better-auth/drizzle-adapter";
import { betterAuth } from "better-auth";
import { admin } from "better-auth/plugins";
import { eq } from "drizzle-orm";
import { describe, expect, it } from "vitest";
import { userUpdateGuard } from "@/lib/user-update-guard";
import { AUTH_DDL, cookieHeaders } from "./auth-harness";
import { createTestDatabase, hasTestDatabase } from "./test-db";

describe("userUpdateGuard", () => {
	it("refuses role and ban fields", () => {
		expect(() => userUpdateGuard({ role: "admin" })).toThrow(
			/cannot be changed/i,
		);
		expect(() => userUpdateGuard({ banned: true })).toThrow(
			/cannot be changed/i,
		);
		expect(() =>
			userUpdateGuard({ banReason: "x", banExpires: new Date() }),
		).toThrow(/cannot be changed/i);
	});

	it("refuses tokensRevokedAt", () => {
		expect(() => userUpdateGuard({ tokensRevokedAt: new Date() })).toThrow(
			/cannot be changed/i,
		);
	});
});

const EMAIL = "ada@example.com";
const PW = "Passw0rd!";

async function makeAuth() {
	const db = await createTestDatabase(AUTH_DDL);
	const auth = betterAuth({
		baseURL: "http://localhost:3000",
		secret: "user-update-guard-test-secret",
		telemetry: { enabled: false },
		database: drizzleAdapter(db, { provider: "pg" }),
		emailAndPassword: { enabled: true },
		plugins: [admin()],
		databaseHooks: {
			user: { update: { before: async (data) => userUpdateGuard(data) } },
		},
	});
	return { auth, db };
}

async function signedUp(auth: Awaited<ReturnType<typeof makeAuth>>["auth"]) {
	const res = await auth.api.signUpEmail({
		body: { email: EMAIL, password: PW, name: "Ada" },
		returnHeaders: true,
	});
	return cookieHeaders(res.headers);
}

async function rowOf(db: Awaited<ReturnType<typeof makeAuth>>["db"]) {
	const { user } = await import("@/db/auth.schema");
	const [row] = await db
		.select({ name: user.name, role: user.role, banned: user.banned })
		.from(user)
		.where(eq(user.email, EMAIL));
	return row;
}

/**
 * The unit tests above prove the function refuses. They pass just as happily
 * against a build where the hook was never registered — and in that build the
 * account-owner endpoint writes `role` straight through. So this drives the
 * real Better Auth endpoint instead.
 */
describe.skipIf(!hasTestDatabase)("updating your own account", () => {
	it("still allows an ordinary profile edit", async () => {
		const { auth, db } = await makeAuth();
		const headers = await signedUp(auth);

		await auth.api.updateUser({ body: { name: "Ada Lovelace" }, headers });

		expect((await rowOf(db)).name).toBe("Ada Lovelace");
	});

	it("cannot promote itself through the account-owner endpoint", async () => {
		const { auth, db } = await makeAuth();
		const headers = await signedUp(auth);

		await expect(
			auth.api.updateUser({ body: { role: "admin" } as never, headers }),
		).rejects.toThrow();

		expect((await rowOf(db)).role).not.toBe("admin");
	});

	it("cannot ban itself through the account-owner endpoint", async () => {
		const { auth, db } = await makeAuth();
		const headers = await signedUp(auth);

		await expect(
			auth.api.updateUser({ body: { banned: true } as never, headers }),
		).rejects.toThrow();

		expect((await rowOf(db)).banned).toBeFalsy();
	});
});
