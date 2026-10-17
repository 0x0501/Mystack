import { readdirSync, readFileSync, unlinkSync, writeFileSync } from "node:fs";
import { type Object3D, Mesh, Vector3 } from "three";
import { GLTFLoader } from "three/addons/loaders/GLTFLoader.js";
import { initialSelection } from "../src/configurator";
import model from "../src/data/machine.json";
import { applyRigPose, type RigNode } from "../src/lib/mechanical-rig";
import {
	type AssemblyModule,
	type MechanicalScene,
	modulesForScene,
} from "../src/services/assembly";
import { project } from "../src/services/stage";

// A poster is a still frame of the renderer: the same GLB surfaces and edge
// buffers, in the pose the canvas starts in, with hidden lines removed by a
// depth buffer as the GPU does. The server-rendered image and the WebGL canvas
// that replaces it therefore show the same machine.
const SAMPLES = 2; // depth-buffer pixels per poster pixel
const HIDDEN = 0.03; // world units a line may sit behind a surface and still show
const MARGIN = 4; // poster pixels around the drawing
const POSTERS = new URL("../public/models/posters/", import.meta.url);
const MACHINE = new URL("../src/data/machine.json", import.meta.url);

const parts = new Map((model.modules as AssemblyModule[]).map((part) => [part.id, part]));
const loader = new GLTFLoader();
const read = (path: string) => {
	const bytes = readFileSync(new URL(`../public${path}`, import.meta.url));
	return bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength) as ArrayBuffer;
};
const visible = (object: Object3D | null): boolean => !object || (object.visible && visible(object.parent));

// Triangles are nine numbers each, segments six: poster x, poster y, depth.
async function collect(scene: MechanicalScene) {
	const triangles: number[] = [];
	const segments: number[] = [];
	const point = new Vector3();
	for (const id of modulesForScene(scene, initialSelection)) {
		const part = parts.get(id);
		if (!part) throw new Error(`Missing module: ${id}`);
		const gltf = await loader.parseAsync(read(part.model), "");
		const nodes: RigNode[] = [];
		gltf.scene.traverse((object) => {
			const key = object.userData.mechanism;
			const group = part.groups.find((group) => group.key === key);
			if (group) nodes.push({ object, key, rest: object.position.clone(), axis: new Vector3(...group.axis) });
		});
		applyRigPose(nodes, scene, 0);
		gltf.scene.updateMatrixWorld(true);
		const put = (list: number[], object: Object3D, x: number, y: number, z: number) => {
			point.set(x, y, z).applyMatrix4(object.matrixWorld);
			list.push(...project([point.x, point.y, point.z]));
		};
		gltf.scene.traverse((object) => {
			if (!(object instanceof Mesh) || !visible(object)) return;
			const position = object.geometry.getAttribute("position");
			const index = object.geometry.getIndex();
			const count = index ? index.count : position.count;
			for (let i = 0; i < count; i++) {
				const vertex = index ? index.getX(i) : i;
				put(triangles, object, position.getX(vertex), position.getY(vertex), position.getZ(vertex));
			}
		});
		const bytes = read(part.edges);
		for (const node of nodes) {
			const group = part.groups.find((group) => group.key === node.key);
			if (!group || !visible(node.object)) continue;
			const edges = new Float32Array(bytes, group.edgeOffset, group.edgeCount * 3);
			for (let i = 0; i < edges.length; i += 3) put(segments, node.object, edges[i], edges[i + 1], edges[i + 2]);
		}
	}
	return { triangles, segments };
}

const number = (value: number) => +value.toFixed(1);

function draw({ triangles, segments }: Awaited<ReturnType<typeof collect>>) {
	let minX = Infinity;
	let minY = Infinity;
	let maxX = -Infinity;
	let maxY = -Infinity;
	for (const list of [triangles, segments])
		for (let i = 0; i < list.length; i += 3) {
			minX = Math.min(minX, list[i]);
			maxX = Math.max(maxX, list[i]);
			minY = Math.min(minY, list[i + 1]);
			maxY = Math.max(maxY, list[i + 1]);
		}
	const originX = Math.floor(minX);
	const originY = Math.floor(minY);
	const width = (Math.ceil(maxX) - originX) * SAMPLES + 1;
	const height = (Math.ceil(maxY) - originY) * SAMPLES + 1;
	const depth = new Float32Array(width * height).fill(-Infinity);
	const bx = (x: number) => (x - originX) * SAMPLES;
	const by = (y: number) => (y - originY) * SAMPLES;

	// Calls `visit` for each depth-buffer pixel a front-facing triangle covers,
	// until it returns true.
	function cover(i: number, visit: (pixel: number, z: number) => boolean | undefined) {
		const [ax, ay, bx_, by_, cx, cy] = [bx(triangles[i]), by(triangles[i + 1]), bx(triangles[i + 3]), by(triangles[i + 4]), bx(triangles[i + 6]), by(triangles[i + 7])];
		const area = (bx_ - ax) * (cy - ay) - (by_ - ay) * (cx - ax);
		// The poster's y axis points down, so front faces wind clockwise here.
		if (area > -1e-9) return;
		const [az, bz, cz] = [triangles[i + 2], triangles[i + 5], triangles[i + 8]];
		const x0 = Math.max(0, Math.floor(Math.min(ax, bx_, cx)));
		const x1 = Math.min(width - 1, Math.ceil(Math.max(ax, bx_, cx)));
		const y0 = Math.max(0, Math.floor(Math.min(ay, by_, cy)));
		const y1 = Math.min(height - 1, Math.ceil(Math.max(ay, by_, cy)));
		for (let y = y0; y <= y1; y++)
			for (let x = x0; x <= x1; x++) {
				const px = x + 0.5;
				const py = y + 0.5;
				const wa = ((bx_ - px) * (cy - py) - (by_ - py) * (cx - px)) / area;
				const wb = ((cx - px) * (ay - py) - (cy - py) * (ax - px)) / area;
				const wc = 1 - wa - wb;
				if (wa < -1e-9 || wb < -1e-9 || wc < -1e-9) continue;
				if (visit(y * width + x, wa * az + wb * bz + wc * cz)) return;
			}
	}
	for (let i = 0; i < triangles.length; i += 9)
		cover(i, (pixel, z) => {
			if (z > depth[pixel]) depth[pixel] = z;
			return undefined;
		});

	let left = Infinity;
	let top = Infinity;
	let right = -Infinity;
	let bottom = -Infinity;
	const extend = (x: number, y: number) => {
		left = Math.min(left, x);
		right = Math.max(right, x);
		top = Math.min(top, y);
		bottom = Math.max(bottom, y);
	};
	// One flat fill: a triangle that is hidden lies inside the others' union.
	let fill = "";
	for (let i = 0; i < triangles.length; i += 9) {
		let shown = false;
		cover(i, (pixel, z) => (shown = z >= depth[pixel] - HIDDEN));
		if (!shown) continue;
		const corners = [0, 3, 6].map((k) => [number(triangles[i + k]), number(triangles[i + k + 1])]);
		for (const [x, y] of corners) extend(x, y);
		fill += `M${corners.map(([x, y]) => `${x} ${y}`).join("L")}Z`;
	}
	// Ink: every stored edge, kept where nothing nearer covers it.
	let ink = "";
	for (let i = 0; i < segments.length; i += 6) {
		const [x0, y0, z0, x1, y1, z1] = segments.slice(i, i + 6);
		const steps = Math.max(1, Math.ceil(Math.hypot(bx(x1) - bx(x0), by(y1) - by(y0)) * 2));
		let start = -1;
		let previous = 0;
		for (let k = 0; k <= steps; k++) {
			const t = k / steps;
			const pixel = Math.floor(by(y0 + (y1 - y0) * t)) * width + Math.floor(bx(x0 + (x1 - x0) * t));
			const shown = z0 + (z1 - z0) * t >= depth[pixel] - HIDDEN;
			if (shown && start < 0) start = t;
			if (start >= 0 && (!shown || k === steps)) {
				const end = shown ? t : previous;
				const from = [number(x0 + (x1 - x0) * start), number(y0 + (y1 - y0) * start)];
				const to = [number(x0 + (x1 - x0) * end), number(y0 + (y1 - y0) * end)];
				if (from[0] !== to[0] || from[1] !== to[1]) {
					extend(from[0], from[1]);
					extend(to[0], to[1]);
					ink += `M${from.join(" ")}L${to.join(" ")}`;
				}
				start = -1;
			}
			previous = t;
		}
	}
	const view = [Math.floor(left) - MARGIN, Math.floor(top) - MARGIN, Math.ceil(right) - Math.floor(left) + MARGIN * 2, Math.ceil(bottom) - Math.floor(top) + MARGIN * 2];
	// The canvas draws lines one of its pixels wide, whatever the poster's scale,
	// at a pixel ratio between 1 and 1.5: 0.67 to 1 CSS pixel. An SVG image cannot
	// see the display's density, so one width in between serves every screen.
	const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="${view.join(" ")}"><style>.ink{fill:none;stroke:#c9c3ad;stroke-width:.75px;vector-effect:non-scaling-stroke}</style><path fill="#1b1d18" d="${fill}"/><path class="ink" d="${ink}"/></svg>`;
	return { svg, view };
}

const scenes: MechanicalScene[] = ["stack", "configuration", "authentication", "structure"];
const posters: Record<string, { src: string; view: number[] }> = {};
for (const scene of scenes) {
	const { svg, view } = draw(await collect(scene));
	writeFileSync(new URL(`${scene}.svg`, POSTERS), svg);
	posters[scene] = { src: `/models/posters/${scene}.svg`, view };
	console.log(`${scene}: ${(svg.length / 1024).toFixed(0)} KB, frame ${view.join(" ")}`);
}
// The press starts in the same pose on Quick start and Deployment as on the home page.
posters.deployment = posters.stack;
for (const file of readdirSync(POSTERS))
	if (!scenes.some((scene) => file === `${scene}.svg`)) unlinkSync(new URL(file, POSTERS));
writeFileSync(MACHINE, JSON.stringify({ ...model, posters }));
