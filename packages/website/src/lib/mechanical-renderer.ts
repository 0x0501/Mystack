import { createTimeline } from "animejs";
import {
	BufferAttribute,
	BufferGeometry,
	Group,
	LineBasicMaterial,
	LineSegments,
	type Material,
	Mesh,
	MeshBasicMaterial,
	OrthographicCamera,
	Scene,
	Vector3,
	WebGLRenderer,
} from "three";
import { GLTFLoader } from "three/addons/loaders/GLTFLoader.js";
import model from "../data/machine.json";
import {
	type AssemblyModule,
	assemblyDelay,
	type MechanicalScene,
} from "../services/assembly";
import { cameraOffset, stageLayout, stageView } from "../services/stage";
import { applyRigPose, type RigNode } from "./mechanical-rig";

export type StageSelection = {
	scene: MechanicalScene;
	side: "left" | "right";
	ids: string[];
	route: string;
};
type Assembly = {
	root: Group;
	nodes: RigNode[];
	geometry: BufferGeometry[];
	solid: MeshBasicMaterial;
	ink: LineBasicMaterial;
	offset: Vector3;
	open: number;
	alpha: number;
	selected: boolean;
};

export function createMechanicalRenderer(
	canvas: HTMLCanvasElement,
	onReady: (ready: boolean) => void,
) {
	const renderer = new WebGLRenderer({
		canvas,
		alpha: true,
		antialias: true,
		powerPreference: "low-power",
	});
	renderer.setClearColor(0x10110f, 0);
	const scene = new Scene();
	const camera = new OrthographicCamera(-8, 8, 6, -6, 0.1, 100);
	const loader = new GLTFLoader();
	const catalog = model.modules as AssemblyModule[];
	const cache = new Map<string, Assembly>();
	const pending = new Map<string, Promise<Assembly>>();
	const abort = new AbortController();
	const reduced = matchMedia("(prefers-reduced-motion: reduce)");
	const narrow = matchMedia("(max-width: 760px)");
	let settings: StageSelection = {
		scene: "stack",
		side: "right",
		ids: [],
		route: "",
	};
	let generation = 0;
	let disposed = false;
	let lost = false;
	let ready = false;
	let contentVisible = true;
	let frame = 0;
	let lastTime = 0;
	const cycle = { value: 0 };
	let targetProgress = 0;
	let timeline: ReturnType<typeof createTimeline> | undefined;
	let elapsed = 0;
	let width = 1;
	let height = 1;
	let drawList: Assembly[] = [];

	function disposeAssembly(assembly: Assembly) {
		assembly.root.removeFromParent();
		for (const geometry of assembly.geometry) geometry.dispose();
		assembly.solid.dispose();
		assembly.ink.dispose();
	}
	async function load(part: AssemblyModule): Promise<Assembly> {
		const cached = cache.get(part.id);
		if (cached) return cached;
		const previous = pending.get(part.id);
		if (previous) return previous;
		const task = (async () => {
			const responses = await Promise.all(
				[part.model, part.edges].map(async (url) => {
					const response = await fetch(url, { signal: abort.signal });
					if (!response.ok) throw new Error(`Artwork unavailable: ${url}`);
					return response.arrayBuffer();
				}),
			);
			const gltf = await loader.parseAsync(responses[0], "/");
			const root = new Group();
			root.add(gltf.scene);
			const solid = new MeshBasicMaterial({
				color: 0x1b1d18,
				polygonOffset: true,
				polygonOffsetFactor: 1,
				polygonOffsetUnits: 1,
				transparent: true,
			});
			const ink = new LineBasicMaterial({ color: 0xc9c3ad, transparent: true });
			const nodes: RigNode[] = [];
			const geometry: BufferGeometry[] = [];
			root.traverse((object) => {
				if (object instanceof Mesh) {
					const materials: Material[] = Array.isArray(object.material)
						? object.material
						: [object.material];
					for (const material of materials) material.dispose();
					object.material = solid;
					geometry.push(object.geometry);
				}
				const key = object.userData.mechanism as string | undefined;
				if (!key) return;
				const group = part.groups.find((group) => group.key === key);
				if (group)
					nodes.push({
						object,
						key,
						rest: object.position.clone(),
						axis: new Vector3(...group.axis).normalize(),
					});
			});
			for (const node of nodes) {
				const group = part.groups.find((group) => group.key === node.key);
				if (!group?.edgeCount) continue;
				const edgeGeometry = new BufferGeometry();
				edgeGeometry.setAttribute(
					"position",
					new BufferAttribute(
						new Float32Array(
							responses[1],
							group.edgeOffset,
							group.edgeCount * 3,
						),
						3,
					),
				);
				node.object.add(new LineSegments(edgeGeometry, ink));
				geometry.push(edgeGeometry);
			}
			const assembly = {
				root,
				nodes,
				geometry,
				solid,
				ink,
				offset: new Vector3(...part.offset),
				open: 0,
				alpha: 1,
				selected: false,
			};
			if (disposed) {
				disposeAssembly(assembly);
				throw new Error("Renderer disposed");
			}
			root.visible = false;
			scene.add(root);
			cache.set(part.id, assembly);
			return assembly;
		})();
		pending.set(part.id, task);
		try {
			return await task;
		} finally {
			pending.delete(part.id);
		}
	}

	function cameraFrame() {
		const mobile = narrow.matches;
		const { viewHeight, target } = stageView(
			settings.scene,
			settings.route,
			mobile,
		);
		const layout = stageLayout(settings.side, mobile);
		const stageWidth = width * layout.width;
		const stageHeight = height * layout.height;
		const drift =
			(mobile ? 0 : Math.sin(cycle.value * Math.PI) * width * 0.055) *
			(settings.side === "right" ? -1 : 1);
		renderer.setViewport(
			width * layout.x + drift,
			height * layout.y,
			stageWidth,
			stageHeight,
		);
		camera.left = (-viewHeight * stageWidth) / stageHeight / 2;
		camera.right = -camera.left;
		camera.top = viewHeight / 2;
		camera.bottom = -camera.top;
		// A small, real camera orbit changes composition without shearing the object.
		camera.position.set(
			target[0] + cameraOffset[0] + cycle.value * 0.8,
			target[1] + cameraOffset[1],
			target[2] + cameraOffset[2],
		);
		camera.lookAt(...target);
		camera.updateProjectionMatrix();
	}
	function paint() {
		if (!ready || lost || disposed) return;
		const p = reduced.matches ? 0 : cycle.value;
		for (const assembly of drawList) {
			assembly.root.visible = assembly.alpha > 0.001;
			assembly.root.position
				.copy(assembly.offset)
				.multiplyScalar(assembly.open);
			assembly.solid.opacity = assembly.alpha;
			assembly.solid.depthWrite = assembly.alpha > 0.98;
			assembly.ink.opacity = assembly.alpha;
			applyRigPose(assembly.nodes, settings.scene, p);
		}
		cameraFrame();
		renderer.render(scene, camera);
	}
	function tick(now: number) {
		frame = 0;
		if (disposed || lost || document.hidden || !contentVisible) return;
		const dt = lastTime ? Math.min((now - lastTime) / 1000, 0.05) : 1 / 60;
		lastTime = now;
		if (reduced.matches) cycle.value = 0;
		else if (!timeline) {
			cycle.value +=
				(targetProgress - cycle.value) * (1 - Math.exp(-dt / 0.12));
			if (Math.abs(targetProgress - cycle.value) < 0.0001)
				cycle.value = targetProgress;
		}
		if (timeline) {
			elapsed += dt * 1000;
			timeline.seek(Math.min(elapsed, timeline.duration));
			if (elapsed >= timeline.duration) {
				timeline.cancel();
				timeline = undefined;
				for (const assembly of drawList)
					if (!assembly.selected) assembly.root.visible = false;
				drawList = drawList.filter((assembly) => assembly.selected);
			}
		}
		paint();
		if (
			timeline ||
			(!reduced.matches && Math.abs(targetProgress - cycle.value) > 0.0001)
		)
			frame = requestAnimationFrame(tick);
		else lastTime = 0;
	}
	function invalidate() {
		if (!frame && !disposed && !lost && !document.hidden && contentVisible)
			frame = requestAnimationFrame(tick);
	}
	function scroll() {
		const bounds = document.getElementById("main")?.getBoundingClientRect();
		contentVisible = !bounds || bounds.bottom > 0;
		const readingEnd = bounds
			? window.scrollY + bounds.bottom - height * 0.7
			: document.documentElement.scrollHeight - height;
		targetProgress = Math.max(
			0,
			Math.min(1, window.scrollY / Math.max(1, readingEnd)),
		);
		if (!contentVisible) {
			cancelAnimationFrame(frame);
			frame = 0;
			lastTime = 0;
		} else invalidate();
	}
	function resize() {
		// The canvas fills the fixed world, the same box the poster is placed in.
		width = canvas.clientWidth;
		height = canvas.clientHeight;
		renderer.setPixelRatio(
			Math.min(devicePixelRatio, narrow.matches ? 1.25 : 1.5),
		);
		renderer.setSize(width, height, false);
		scroll();
	}
	function visibility() {
		if (document.hidden) {
			cancelAnimationFrame(frame);
			frame = 0;
			lastTime = 0;
		} else scroll();
	}
	function preference() {
		timeline?.cancel();
		timeline = undefined;
		for (const assembly of cache.values()) {
			assembly.root.visible = assembly.selected;
			assembly.open = 0;
			assembly.alpha = 1;
		}
		drawList = [...cache.values()].filter((assembly) => assembly.selected);
		cycle.value = 0;
		scroll();
	}
	function contextLost(event: Event) {
		event.preventDefault();
		lost = true;
		cancelAnimationFrame(frame);
		frame = 0;
		onReady(false);
	}
	function contextRestored() {
		lost = false;
		lastTime = 0;
		invalidate();
		onReady(ready);
	}
	window.addEventListener("scroll", scroll, { passive: true });
	window.addEventListener("resize", resize);
	document.addEventListener("visibilitychange", visibility);
	reduced.addEventListener("change", preference);
	canvas.addEventListener("webglcontextlost", contextLost);
	canvas.addEventListener("webglcontextrestored", contextRestored);
	resize();

	return {
		async set(next: StageSelection) {
			const version = ++generation;
			const changedRoute = next.route !== settings.route;
			const previousIds = new Set(settings.ids);
			timeline?.cancel();
			timeline = undefined;
			if (changedRoute) {
				ready = false;
				onReady(false);
				cycle.value = 0;
			}
			settings = next;
			const selected = catalog.filter((part) => next.ids.includes(part.id));
			try {
				await Promise.all(selected.map(load));
			} catch (error) {
				if (!disposed && version === generation) {
					ready = false;
					onReady(false);
				}
				throw error;
			}
			if (disposed || version !== generation) return;
			for (const [id, assembly] of cache) {
				assembly.selected = next.ids.includes(id);
				if (changedRoute || reduced.matches) {
					assembly.root.visible = assembly.selected;
					assembly.open = 0;
					assembly.alpha = 1;
				} else if (assembly.selected && !previousIds.has(id)) {
					assembly.open = 1;
					assembly.alpha = 0;
					assembly.root.visible = true;
				}
			}
			drawList = [...cache.values()].filter(
				(assembly) =>
					assembly.selected || (!changedRoute && assembly.root.visible),
			);
			if (!changedRoute && !reduced.matches) {
				timeline = createTimeline({
					autoplay: false,
					defaults: { ease: "inOutCubic" },
				});
				elapsed = 0;
				// Open the press before withdrawing or inserting a fitting.
				timeline.add(cycle, { value: 0, duration: 320 }, 0);
				for (const [id, assembly] of cache) {
					if (!assembly.selected && assembly.root.visible)
						timeline.add(assembly, { open: 1, alpha: 0, duration: 420 }, 320);
					if (assembly.selected && !previousIds.has(id)) {
						const part = catalog.find((part) => part.id === id);
						timeline.add(
							assembly,
							{ open: 0, alpha: 1, duration: 760 },
							640 +
								assemblyDelay(part?.category ?? "", part?.variant ?? "") * 0.4,
						);
					}
				}
			}
			cameraFrame();
			await renderer.compileAsync(scene, camera);
			if (disposed || version !== generation) return;
			ready = true;
			paint();
			onReady(true);
			scroll();
		},
		dispose() {
			disposed = true;
			abort.abort();
			cancelAnimationFrame(frame);
			timeline?.cancel();
			window.removeEventListener("scroll", scroll);
			window.removeEventListener("resize", resize);
			document.removeEventListener("visibilitychange", visibility);
			reduced.removeEventListener("change", preference);
			canvas.removeEventListener("webglcontextlost", contextLost);
			canvas.removeEventListener("webglcontextrestored", contextRestored);
			for (const assembly of cache.values()) disposeAssembly(assembly);
			renderer.dispose();
		},
	};
}
