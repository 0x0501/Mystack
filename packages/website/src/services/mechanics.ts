import type { MechanicalScene } from "./assembly";

export const clamp = (value: number) => Math.max(0, Math.min(1, value));
const segment = (p: number, start: number, end: number) =>
	clamp((p - start) / (end - start));
export const mechanismInfo: Record<
	MechanicalScene,
	{ title: string; description: string }
> = {
	stack: {
		title: "The project press",
		description:
			"An engine, a bed of type and delivery fittings. Your choices rebuild one working letterpress.",
	},
	configuration: {
		title: "The composing stick",
		description:
			"Set the rows of type, then lock the chase. Separate choices become one reproducible configuration.",
	},
	authentication: {
		title: "The cutaway padlock",
		description:
			"The key aligns the pins before the plug can turn and release the shackle. Access follows verification.",
	},
	structure: {
		title: "The type cabinet",
		description:
			"Each drawer has a purpose. Routes, server functions, services and data keep their own place.",
	},
	deployment: {
		title: "From type to print",
		description:
			"Feed the sheet, close the press, release the print. A prepared project becomes something you can publish.",
	},
};

export function pressPose(progress: number) {
	const p = clamp(progress);
	const angle = segment(p, 0.2, 0.7) * Math.PI * 2;
	const radius = 0.4;
	const rodLength = 1.2;
	const sideways = radius * Math.sin(angle);
	const vertical = Math.sqrt(rodLength ** 2 - sideways ** 2);
	return {
		angle,
		platen: radius * Math.cos(angle) - vertical - (radius - rodLength),
		rodAngle: Math.asin(sideways / rodLength),
		rodY: radius * (Math.cos(angle) - 1),
		rodZ: sideways,
		feed: p < 0.2 ? segment(p, 0, 0.2) : p < 0.7 ? 1 : 1 - segment(p, 0.7, 1),
		printed: p >= 0.45,
		stamp: Math.sin(segment(p, 0.8, 0.96) * Math.PI) * 0.226,
	};
}

export function lockPose(progress: number) {
	const p = clamp(progress);
	return {
		key: segment(p, 0, 0.35) * 2.8,
		pins: segment(p, 0.2, 0.5),
		turn: (segment(p, 0.5, 0.75) * Math.PI) / 2,
		shackle: segment(p, 0.75, 1) * 0.85,
	};
}

export function mechanismPhase(scene: MechanicalScene, p: number): string {
	if (scene === "authentication")
		return p < 0.35
			? "Insert the key"
			: p < 0.5
				? "Align the pins"
				: p < 0.75
					? "Turn the plug"
					: "Release the shackle";
	if (scene === "configuration")
		return p < 0.18
			? "Gather the type"
			: p < 0.72
				? "Set the rows"
				: "Lock the chase";
	if (scene === "structure")
		return ["Routes", "Server functions", "Services", "Data"][
			Math.min(3, Math.floor(p * 4))
		];
	return p < 0.2
		? "Feed the sheet"
		: p < 0.45
			? "Close the platen"
			: p < 0.7
				? "Lift the platen"
				: "Deliver the print";
}

export function composingRow(progress: number, index: number): number {
	return (
		(1 - segment(progress, 0.05 + index * 0.13, 0.25 + index * 0.13)) * 2.5
	);
}
export function drawerTravel(progress: number, index: number): number {
	return (
		Math.sin(segment(progress, index * 0.2, index * 0.2 + 0.38) * Math.PI) *
		1.65
	);
}
