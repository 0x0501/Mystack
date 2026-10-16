import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { catalog } from "../../mystack/src/catalog.mjs";
import model from "../src/data/machine.json";
import type { AssemblyModule } from "../src/services/assembly";

const modules = new Map((model.modules as AssemblyModule[]).map((part) => [part.id, part]));
const shapes = new Set<string>();
for (const [category, choices] of Object.entries(catalog)) {
	const prefix = { deployment: "runtime", database: "database", email: "email", payments: "payment" }[category];
	for (const choice of choices) {
		const part = modules.get(`${prefix}-${choice.id}`);
		if (!part) throw new Error(`Missing integration: ${category}/${choice.id}`);
		const digest = createHash("sha256").update(readFileSync(new URL(`../public${part.asset}`, import.meta.url))).digest("hex");
		if (shapes.has(digest)) throw new Error(`Reused integration geometry: ${part.id}`);
		shapes.add(digest);
	}
}
for (const key of ["chassis", "backplane", "document-configuration", "document-authentication", "document-structure"]) {
	if (!modules.has(key)) throw new Error(`Missing mechanism: ${key}`);
}
for (const part of modules.values()) {
	const glb = readFileSync(new URL(`../public${part.model}`, import.meta.url));
	const edges = readFileSync(new URL(`../public${part.edges}`, import.meta.url));
	if (glb.toString("utf8", 0, 4) !== "glTF" || glb.readUInt32LE(4) !== 2 || glb.readUInt32LE(8) !== glb.length) throw new Error(`Invalid GLB: ${part.id}`);
	if (part.offset.length !== 3 || !part.offset.every(Number.isFinite)) throw new Error(`Invalid movement vector: ${part.id}`);
	if (!part.bounds.every(Number.isFinite) || part.bounds[2] <= part.bounds[0] || part.bounds[3] <= part.bounds[1]) throw new Error(`Invalid poster frame: ${part.id}`);
	if (!part.groups.length) throw new Error(`Missing rigid geometry: ${part.id}`);
	for (const group of part.groups) {
		if (!group.pivot.every(Number.isFinite) || !group.axis.every(Number.isFinite) || Math.abs(Math.hypot(...group.axis) - 1) > .001) throw new Error(`Invalid rigid axis: ${part.id}/${group.key}`);
		if (group.edgeOffset % 4 || group.edgeOffset + group.edgeCount * 12 > edges.length) throw new Error(`Invalid edge buffer: ${part.id}/${group.key}`);
	}
}
for (const asset of Object.values(model.posters)) {
	const svg = readFileSync(new URL(`../public${asset}`, import.meta.url), "utf8");
	if (/NaN|Infinity|<script|javascript:/i.test(svg)) throw new Error(`Invalid poster: ${asset}`);
}
if (readFileSync(new URL('../public/models/mystack-assembly.blend', import.meta.url)).length < 1000) throw new Error("Missing Blender source");
console.log(`Valid workshop: ${modules.size} assemblies, ${model.modules.reduce((n, p) => n + p.groups.length, 0)} rigid batches, distinct fittings and valid GLB/edge buffers.`);
