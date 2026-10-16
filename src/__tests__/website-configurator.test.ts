import { describe, expect, it } from "vitest";
import {
	createCommand,
	incompatibilities,
	initialSelection,
	selectRuntime,
	setupNote,
} from "../../packages/website/src/configurator";
import {
	sceneForPath,
	selectedModuleIds,
} from "../../packages/website/src/services/assembly";

describe("website stack builder", () => {
	it("reconciles dependent integrations when changing runtimes", () => {
		const bun = selectRuntime(initialSelection, "bun");
		expect(bun).toMatchObject({
			deployment: "bun",
			database: "pg",
			email: "resend",
		});
		expect(incompatibilities(bun)).toEqual([]);
		const cloudflare = selectRuntime(
			{ ...bun, database: "bun-sqlite" },
			"cloudflare",
		);
		expect(cloudflare.database).toBe("pg-hyperdrive");
		expect(incompatibilities(cloudflare)).toEqual([]);
	});

	it("preserves compatible choices and optional payment selections", () => {
		const next = selectRuntime(
			{
				...initialSelection,
				database: "turso-cloud",
				email: "resend",
				payments: ["polar", "stripe"],
			},
			"nitro",
		);
		expect(next).toEqual({
			deployment: "nitro",
			database: "turso-cloud",
			email: "resend",
			payments: ["polar", "stripe"],
		});
		expect(createCommand(next)).toContain("--payments polar,stripe");
		expect(createCommand({ ...next, payments: [] })).toContain(
			"--payments none",
		);
	});

	it("rejects incompatible commands and explains selected local prerequisites", () => {
		expect(() =>
			createCommand({ ...initialSelection, database: "bun-sqlite" }),
		).toThrow("Incompatible stack");
		expect(setupNote(initialSelection)).toContain("Docker");
		expect(
			setupNote({ ...initialSelection, database: "turso-cloud" }),
		).toContain("Turso CLI");
		expect(setupNote({ ...initialSelection, database: "d1" })).toContain(
			"Wrangler",
		);
	});
});

describe("website assembly selection", () => {
	it("replaces compute and storage geometry when the stack changes", () => {
		const cloud = selectedModuleIds(initialSelection);
		const local = selectedModuleIds({
			deployment: "bun",
			database: "bun-sqlite",
			email: "resend",
			payments: [],
		});
		expect(cloud).toContain("runtime-cloudflare");
		expect(cloud).toContain("database-pg-hyperdrive");
		expect(local).toContain("runtime-bun");
		expect(local).toContain("database-bun-sqlite");
		expect(local.some((id) => id.startsWith("payment-"))).toBe(false);
		expect(local).not.toContain("runtime-cloudflare");
	});
	it("mounts exactly the selected optional cartridges while keeping the core", () => {
		const parts = selectedModuleIds({
			...initialSelection,
			payments: ["stripe", "polar"],
		});
		expect(parts.filter((id) => id.startsWith("payment-"))).toEqual([
			"payment-stripe",
			"payment-polar",
		]);
		expect(parts).toContain("backplane");
		expect(parts).not.toContain("lid");
	});
});

describe("page mechanisms", () => {
	it("assigns semantic subjects to documentation and preserves the configurable stack", () => {
		expect(sceneForPath("/integrations")).toBe("stack");
		expect(sceneForPath("/docs/configuration")).toBe("configuration");
		expect(sceneForPath("/docs/authentication")).toBe("authentication");
		expect(sceneForPath("/docs/project-structure")).toBe("structure");
		expect(sceneForPath("/docs/deployment")).toBe("deployment");
	});
});
