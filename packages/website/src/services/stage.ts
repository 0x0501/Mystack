import model from "../data/machine.json";
import type { MechanicalScene } from "./assembly";

// The server-rendered poster and the WebGL canvas show the same machine through
// the same Blender camera. This is the single source for where that machine
// sits on screen, so handing over from poster to canvas does not move it.
type Vector = [number, number, number];
const { camera, posters } = model;
const target = camera.target as Vector;
export const cameraOffset = camera.offset as Vector;

export type StageSide = "left" | "right";
// The stage is the rectangle the machine is drawn into, as fractions of the
// stage box: the screen below the header on desktop, the whole screen on narrow
// ones. `y` is measured from the bottom, like a WebGL viewport.
export type StageLayout = {
	x: number;
	y: number;
	width: number;
	height: number;
};

const isPress = (scene: MechanicalScene) =>
	scene === "stack" || scene === "deployment";

export function stageLayout(side: StageSide, mobile: boolean): StageLayout {
	if (mobile) return { x: -0.06, y: 0.03, width: 1.12, height: 0.68 };
	return { x: side === "right" ? 0.34 : -0.15, y: 0, width: 0.75, height: 1 };
}

// What the camera looks at, and how many world units fit the stage height.
export function stageView(
	scene: MechanicalScene,
	route: string,
	mobile: boolean,
): { viewHeight: number; target: Vector } {
	const press = isPress(scene);
	const viewHeight = mobile
		? press
			? 10.5
			: 8.7
		: press
			? route === "/integrations"
				? 11.2
				: 9.8
			: scene === "configuration" || scene === "authentication"
				? 9.5
				: 7.5;
	return {
		viewHeight,
		target: [
			press ? -0.25 : scene === "authentication" ? -1.5 : 0,
			press ? 2.4 : scene === "configuration" ? 0.3 : 2,
			0,
		],
	};
}

const dot = (a: Vector, b: Vector) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
const cross = (a: Vector, b: Vector): Vector => [
	a[1] * b[2] - a[2] * b[1],
	a[2] * b[0] - a[0] * b[2],
	a[0] * b[1] - a[1] * b[0],
];
const unit = (a: Vector): Vector => {
	const length = Math.hypot(...a);
	return [a[0] / length, a[1] / length, a[2] / length];
};
// The camera's right and up axes, as Three.js's `lookAt` builds them.
const back = unit(cameraOffset);
const right = unit(cross([0, 1, 0], back));
const up = cross(back, right);

// A world point in poster pixels (the Blender camera's frame) and its distance
// toward the camera in world units.
export function project(point: Vector): Vector {
	const offset = point.map((v, i) => v - target[i]) as Vector;
	return [
		model.width / 2 + camera.pixelsPerUnit * dot(right, offset),
		model.height / 2 - camera.pixelsPerUnit * dot(up, offset),
		dot(back, offset),
	];
}

const css = (value: number) => `${+value.toFixed(3)}`;

// Where the poster image sits so that its pixels land exactly where the canvas
// draws the same machine. Sizes are in container units of the fixed world.
export function posterBox(
	scene: MechanicalScene,
	route: string,
	side: StageSide,
	mobile: boolean,
) {
	const { viewHeight, target: looking } = stageView(scene, route, mobile);
	const layout = stageLayout(side, mobile);
	const [viewX, viewY, viewWidth, viewHeightPx] = posters[scene].view;
	// Poster pixels per container-height unit.
	const scale = (layout.height * 100) / (viewHeight * camera.pixelsPerUnit);
	const [anchorX, anchorY] = project(looking);
	const centerX = (layout.x + layout.width / 2) * 100;
	const centerY = (1 - layout.y - layout.height / 2) * 100;
	return {
		left: `calc(${css(centerX)}cqw - ${css((anchorX - viewX) * scale)}cqh)`,
		top: `${css(centerY - (anchorY - viewY) * scale)}cqh`,
		width: `${css(viewWidth * scale)}cqh`,
		height: `${css(viewHeightPx * scale)}cqh`,
	};
}

// The poster's custom properties: one box for desktop, one for narrow screens.
export function posterVariables(
	scene: MechanicalScene,
	route: string,
	side: StageSide,
) {
	const variables: Record<string, string> = {};
	for (const [prefix, mobile] of [
		["poster", false],
		["poster-mobile", true],
	] as const)
		for (const [name, value] of Object.entries(
			posterBox(scene, route, side, mobile),
		))
			variables[`--${prefix}-${name}`] = value;
	return variables;
}
