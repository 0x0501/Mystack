import assert from "node:assert/strict";
import { execFile } from "node:child_process";
import {
	chmod,
	mkdtemp,
	readdir,
	readFile,
	rm,
	symlink,
	writeFile,
} from "node:fs/promises";
import { tmpdir } from "node:os";
import { delimiter, join } from "node:path";
import { fileURLToPath } from "node:url";
import { promisify } from "node:util";
import { test } from "vitest";
import {
	catalog,
	choices,
	incompatibilities,
	isPostgres,
	validateSelection,
} from "../../packages/mystack/src/catalog.ts";
import { installDependencies } from "../../packages/mystack/src/cli.ts";
import {
	createProject,
	renderProject,
} from "../../packages/mystack/src/generate.ts";
import { text } from "../../packages/mystack/src/template.ts";

const templateRoot = fileURLToPath(new URL("../../", import.meta.url));
const base = {
	database: "pg-hyperdrive",
	deployment: "cloudflare",
	email: "cloudflare",
	payments: ["stripe"],
};

test("CLI rejects invalid flags and non-terminal input with actionable feedback before writing", async () => {
	const cwd = await mkdtemp(join(tmpdir(), "mystack-cli-feedback-"));
	const cli = fileURLToPath(
		new URL("../../packages/mystack/src/cli.ts", import.meta.url),
	);
	try {
		for (const [args, message] of [
			[
				["--yes", "--database", "d1", "--deployment", "bun"],
				/D1 requires Cloudflare Workers/,
			],
			[[], /Use --yes/],
			[["--yes", "--payments", "stripe,stripe"], /Duplicate payment providers/],
		] as const) {
			await assert.rejects(
				promisify(execFile)(
					"bun",
					["run", cli, "create", "test-app", ...args],
					{ cwd },
				),
				(error: Error & { code?: number; stdout?: string }) => {
					assert.equal(error.code, 1);
					assert.match(error.stdout ?? "", message);
					return true;
				},
			);
			assert.deepEqual(await readdir(cwd), []);
		}
	} finally {
		await rm(cwd, { recursive: true, force: true });
	}
});

test("dependency installation runs in the project and retains useful failure output", async () => {
	const cwd = await mkdtemp(join(tmpdir(), "mystack-installer-"));
	const originalPath = process.env.PATH;
	const executable = join(cwd, "bun");
	try {
		process.env.PATH = `${cwd}${delimiter}${originalPath}`;
		await writeFile(
			executable,
			'#!/usr/bin/env node\nrequire("node:fs").writeFileSync("installed", "ok");\nconsole.log("installation output");\n',
		);
		await chmod(executable, 0o755);
		await installDependencies(cwd);
		assert.equal(await readFile(join(cwd, "installed"), "utf8"), "ok");
		await writeFile(
			executable,
			'#!/usr/bin/env node\nconsole.error("registry unavailable");\nprocess.exit(42);\n',
		);
		await assert.rejects(
			installDependencies(cwd),
			/exited with 42\nregistry unavailable/,
		);
		assert.equal(await readFile(join(cwd, "installed"), "utf8"), "ok");
		await rm(executable);
		process.env.PATH = cwd;
		await assert.rejects(installDependencies(cwd), /ENOENT/);
	} finally {
		if (originalPath === undefined) delete process.env.PATH;
		else process.env.PATH = originalPath;
		await rm(cwd, { recursive: true, force: true });
	}
});

test("rejects Cloudflare Email on server runtimes and unknown database choices", () => {
	assert.throws(
		() => validateSelection({ ...base, database: "pg", deployment: "bun" }),
		/Cloudflare Email/,
	);
	assert.throws(
		() => validateSelection({ ...base, database: "unknown" }),
		/Unknown/,
	);
});

test("supported combinations emit the selected runtimes, dependencies and payment routes", async () => {
	for (const { id: database } of catalog.database)
		for (const deployment of ["cloudflare", "nitro", "bun"])
			for (const email of ["cloudflare", "resend"]) {
				for (const payments of Array.from({ length: 16 }, (_, mask) =>
					["stripe", "creem", "nowpayments", "polar"].filter(
						(_, index) => mask & (1 << index),
					),
				)) {
					const selection = { database, deployment, email, payments };
					if (incompatibilities(selection).length) continue;
					const files = await renderProject({
						name: "test-app",
						selection,
						templateRoot,
					});
					const pkg = JSON.parse(text(files, "package.json"));
					assert.equal(pkg.name, "test-app");
					assert.equal(
						files.has("wrangler.jsonc"),
						deployment === "cloudflare",
					);
					assert.equal(files.has("serve.ts"), deployment === "bun");
					assert.equal(Boolean(pkg.dependencies.pg), isPostgres(database));
					assert.equal(
						Boolean(pkg.dependencies["@libsql/client"]),
						database === "turso-cloud" || database === "turso-local",
					);
					for (const provider of ["stripe", "creem", "nowpayments", "polar"])
						assert.equal(
							files.has(`src/routes/api/webhooks/${provider}.ts`),
							payments.includes(provider),
						);
					if (deployment !== "cloudflare") {
						for (const [path, contents] of files)
							if (path.startsWith("src/") && !path.includes("__tests__"))
								assert.doesNotMatch(
									contents.toString(),
									/(?:from |import\()["']cloudflare:workers/,
									path,
								);
					}
					if (database === "d1") {
						assert.match(text(files, "wrangler.jsonc"), /d1_databases/);
					}
					assert.ok(
						files.has("drizzle/0000_thin_phalanx.sql") || isPostgres(database),
					);
				}
			}
});

test("generation is self-contained and refuses existing directories", async () => {
	const cwd = await mkdtemp(join(tmpdir(), "mystack-test-"));
	try {
		await writeFile(join(cwd, ".env"), "SECRET=never-copy");
		const target = await createProject({
			name: "fresh-app",
			selection: base,
			cwd,
			templateRoot,
		});
		assert.equal(
			JSON.parse((await readFile(join(target, "mystack.json"))).toString())
				.database,
			"pg-hyperdrive",
		);
		assert.ok(!(await readdir(target)).includes(".env"));
		assert.doesNotMatch(
			await readFile(join(target, "src/routeTree.gen.ts"), "utf8"),
			/webhooks\/(creem|nowpayments|polar)/,
		);
		await writeFile(join(target, "keep.txt"), "original");
		await assert.rejects(
			createProject({ name: "fresh-app", selection: base, cwd, templateRoot }),
			/EEXIST/,
		);
		assert.equal(await readFile(join(target, "keep.txt"), "utf8"), "original");
		await assert.rejects(
			createProject({ name: "../escape", selection: base, cwd, templateRoot }),
			/Project name/,
		);
		await assert.rejects(
			createProject({
				name: "broken-app",
				selection: base,
				cwd,
				templateRoot: cwd,
			}),
			/missing/,
		);
		assert.ok(!(await readdir(cwd)).includes("broken-app"));
		assert.ok(
			!(await readdir(cwd)).some((name) => name.startsWith(".mystack-")),
		);
	} finally {
		await rm(cwd, { recursive: true, force: true });
	}
});

test("Turso projects develop without cloud credentials and require remote credentials for production", async () => {
	const cwd = await mkdtemp(join(tmpdir(), "mystack-turso-"));
	try {
		for (const database of ["turso-cloud", "turso-local"])
			for (const deployment of ["cloudflare", "nitro", "bun"]) {
				if (database === "turso-local" && deployment === "cloudflare") continue;
				const target = await createProject({
					name: `${database}-${deployment}`,
					selection: { database, deployment, email: "resend", payments: [] },
					cwd,
					templateRoot,
				});
				await symlink(
					join(templateRoot, "node_modules"),
					join(target, "node_modules"),
					"dir",
				);
				await writeFile(
					join(target, ".env"),
					await readFile(join(target, ".env.example")),
				);
				await writeFile(
					join(target, "verify-turso.ts"),
					`import assert from "node:assert/strict";
import { existsSync } from "node:fs";
import { writeFile } from "node:fs/promises";
import { getEnv } from "./src/env";
import { getTursoConfig } from "./src/db/turso-config";
import { validateProductionEnv } from "./scripts/validate-prod-env";
const expectedUrl = "${deployment === "cloudflare" ? "http://127.0.0.1:8080" : "file:.local/turso-local.db"}";
const env = getEnv();
assert.equal(env.TURSO_DATABASE_URL, expectedUrl);
assert.deepEqual(getTursoConfig(), { url: expectedUrl });
${deployment === "cloudflare" ? 'assert.throws(() => getTursoConfig("file:.local/turso-local.db"));' : 'assert.ok(existsSync(".local"));'}
${
	database === "turso-cloud"
		? `assert.deepEqual(getTursoConfig(env.TURSO_DATABASE_URL, env.TURSO_AUTH_TOKEN), { url: expectedUrl });
assert.deepEqual(getTursoConfig(expectedUrl, "unused-cloud-token"), { url: expectedUrl });
assert.throws(() => getTursoConfig("libsql://production.turso.io"), /TURSO_AUTH_TOKEN/);
assert.throws(() => getTursoConfig("libsql://production.turso.io", " "), /TURSO_AUTH_TOKEN/);
assert.deepEqual(getTursoConfig("libsql://production.turso.io", "test-token"), { url: "libsql://production.turso.io", authToken: "test-token" });
const production = { APP_ORIGIN: "https://example.com", BETTER_AUTH_URL: "https://example.com", BETTER_AUTH_SECRET: "production-secret-for-tests", EMAIL_FROM: "test@example.com", EMAIL_FROM_NAME: "Tests", RESEND_API_KEY: "test-resend-key", TURSO_DATABASE_URL: expectedUrl, TURSO_AUTH_TOKEN: "test-token" };
const saveProduction = () => writeFile(".env.prod", Object.entries(production).map(([key, value]) => key + "=" + value).join("\\n"));
await saveProduction();
await assert.rejects(validateProductionEnv(), /remote TURSO_DATABASE_URL/);
production.TURSO_DATABASE_URL = "libsql://production.turso.io";
production.TURSO_AUTH_TOKEN = "";
await saveProduction();
await assert.rejects(validateProductionEnv(), /TURSO_AUTH_TOKEN/);
production.TURSO_AUTH_TOKEN = "test-token";
await saveProduction();
assert.deepEqual(await validateProductionEnv(), production);
`
		: 'assert.throws(() => getTursoConfig("libsql://production.turso.io"));'
}
`,
				);
				await promisify(execFile)("bun", ["run", "verify-turso.ts"], {
					cwd: target,
				});
			}
	} finally {
		await rm(cwd, { recursive: true, force: true });
	}
}, 30_000);

test("database choices distinguish connections and disable unavailable runtimes", () => {
	for (const [database, deployments] of [
		["pg", ["nitro", "bun"]],
		["pg-hyperdrive", ["cloudflare"]],
		["d1", ["cloudflare"]],
		["turso-cloud", ["cloudflare", "nitro", "bun"]],
		["turso-local", ["nitro", "bun"]],
		["bun-sqlite", ["bun"]],
	] as const) {
		const options = choices("deployment", { database });
		for (const option of options)
			assert.equal(
				Boolean(option.disabled),
				!deployments.some((id) => id === option.value),
			);
	}
});
