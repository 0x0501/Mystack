import type { Selection } from "../configurator";

export type RigidGroup = {
	key: string;
	pivot: number[];
	axis: number[];
	edgeOffset: number;
	edgeCount: number;
};
export type AssemblyModule = {
	id: string;
	category: string;
	variant: string;
	offset: number[];
	objects: number;
	label: string;
	asset: string;
	bounds: number[];
	model: string;
	edges: string;
	groups: RigidGroup[];
};
export type MechanicalScene =
	| "stack"
	| "configuration"
	| "authentication"
	| "structure"
	| "deployment";

export function sceneForPath(path: string): MechanicalScene {
	if (path === "/docs/configuration") return "configuration";
	if (path === "/docs/authentication") return "authentication";
	if (path === "/docs/deployment" || path === "/quick-start")
		return "deployment";
	if (path.startsWith("/docs") || path === "/foundation") return "structure";
	return "stack";
}

export function selectedModuleIds(selection: Selection): string[] {
	return [
		"chassis",
		"backplane",
		`runtime-${selection.deployment}`,
		`database-${selection.database}`,
		`email-${selection.email}`,
		...selection.payments.map((id) => `payment-${id}`),
	];
}

export function assemblyDelay(category: string, variant: string): number {
	if (category === "base") return 0;
	if (category === "core") return 80;
	if (category === "deployment") return 220;
	if (category === "database") return 360;
	if (category === "email") return 500;
	if (category === "payments")
		return (
			600 + ["stripe", "creem", "nowpayments", "polar"].indexOf(variant) * 100
		);
	return 0;
}

export function sideForPath(path: string): "left" | "right" {
	return [
		"/foundation",
		"/quick-start",
		"/docs",
		"/docs/",
		"/docs/configuration",
		"/docs/project-structure",
	].includes(path)
		? "left"
		: "right";
}
export function modulesForScene(
	scene: MechanicalScene,
	selection: Selection,
): string[] {
	return scene === "stack" || scene === "deployment"
		? selectedModuleIds(selection)
		: [`document-${scene}`];
}
