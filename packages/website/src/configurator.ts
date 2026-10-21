import {
	catalog,
	defaults,
	incompatibilities,
} from "../../mystack/src/catalog.ts";

export type Category = "deployment" | "database" | "email" | "payments";
export type Selection = {
	deployment: string;
	database: string;
	email: string;
	payments: string[];
};
export { catalog, incompatibilities };
export const initialSelection: Selection = {
	...defaults,
	payments: [...defaults.payments],
};

export function selectRuntime(
	selection: Selection,
	deployment: string,
): Selection {
	const next = { ...selection, deployment };
	for (const category of ["database", "email"] as const) {
		const available = catalog[category].filter(
			(option) =>
				!incompatibilities({ deployment, [category]: option.id }).length,
		);
		if (!available.some((option) => option.id === next[category])) {
			next[category] = available[0].id;
		}
	}
	return next;
}

export function createCommand(selection: Selection): string {
	if (incompatibilities(selection).length)
		throw new Error("Incompatible stack");
	return `bunx @0x0501/mystack@latest create my-app --yes --database ${selection.database} --deployment ${selection.deployment} --email ${selection.email} --payments ${selection.payments.join(",") || "none"}`;
}

export function setupNote(selection: Selection): string {
	if (selection.database.startsWith("pg")) {
		return "PostgreSQL needs Docker. Run bun run db:up before applying migrations.";
	}
	if (
		selection.database === "turso-cloud" &&
		selection.deployment === "cloudflare"
	) {
		return "On Workers, Turso Cloud needs the Turso CLI for local development. Keep bun run db:up running in another terminal before migrating.";
	}
	if (selection.database === "d1") {
		return "D1 runs locally through Wrangler. You can apply local migrations without creating a hosted database.";
	}
	return "This database uses a local file in development. Set its path using the generated .env.example; no cloud database account is needed.";
}
