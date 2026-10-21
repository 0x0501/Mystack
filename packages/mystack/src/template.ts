import type { Stats } from "node:fs";
import { readdir, readFile } from "node:fs/promises";
import { join } from "node:path";
import type { ProjectFiles } from "./types.ts";

// An allowlist prevents credentials, Git history, installed dependencies and
// local build output from entering the published template.
export const templateEntries = [
	"src",
	"public",
	"scripts",
	"drizzle",
	"project.inlang/settings.json",
	"messages",
	"e2e",
	"package.json",
	"vite.config.ts",
	"tsconfig.json",
	"tsr.config.json",
	"biome.json",
	"vitest.config.ts",
	"playwright.config.ts",
	"drizzle.config.ts",
	"paraglide.config.ts",
	"wrangler.jsonc",
	"worker-configuration.d.ts",
	"docker-compose.yml",
	".env.example",
	".env.docker",
	".gitignore",
	"DESIGN.md",
	"docs/project-guide.md",
	"LICENSE",
];

export async function readTemplate(root: string, { packaged = false } = {}) {
	const files: ProjectFiles = new Map();
	async function visit(path: string) {
		if (
			path === "src/paraglide" ||
			path.startsWith("scripts/mystack") ||
			path === "src/__tests__/mystack.test.ts" ||
			path === "src/__tests__/website-configurator.test.ts" ||
			path === "src/__tests__/website-mechanics.test.ts" ||
			path === "src/__tests__/website-seo.test.ts"
		)
			return;
		const absolute = join(
			root,
			packaged && path === ".gitignore" ? "gitignore" : path,
		);
		const { lstat } = await import("node:fs/promises");
		let entry: Stats;
		try {
			entry = await lstat(absolute);
		} catch (error) {
			if (
				error instanceof Error &&
				"code" in error &&
				error.code === "ENOENT" &&
				templateEntries.includes(path)
			)
				return;
			throw error;
		}
		if (entry.isSymbolicLink())
			throw new Error(`Template symlinks are forbidden: ${path}`);
		if (entry.isDirectory()) {
			for (const name of (await readdir(absolute)).sort())
				await visit(`${path}/${name}`);
		} else if (entry.isFile()) files.set(path, await readFile(absolute));
	}
	for (const path of templateEntries) await visit(path);
	for (const path of [
		"package.json",
		"src/lib/auth.ts",
		"src/db/auth.schema.ts",
		".gitignore",
		".env.example",
		"messages/en.json",
		"messages/de.json",
		"docs/project-guide.md",
	]) {
		if (!files.has(path))
			throw new Error(
				`Template is missing ${path}. Run template:prepare before packaging.`,
			);
	}
	return files;
}

export function text(files: ProjectFiles, path: string) {
	const contents = files.get(path);
	if (contents === undefined) throw new Error(`Template is missing ${path}.`);
	return contents.toString("utf8");
}

export function replace(
	files: ProjectFiles,
	path: string,
	before: string,
	after: string,
) {
	const source = text(files, path);
	if (!source.includes(before))
		throw new Error(
			`Template changed: expected anchor in ${path}: ${before.slice(0, 80)}`,
		);
	files.set(path, source.replace(before, after));
}
