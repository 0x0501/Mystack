import { readFileSync } from "node:fs";
import assert from "node:assert/strict";
import { Box3, Mesh, OrthographicCamera, Vector3 } from "three";
import { GLTFLoader } from "three/addons/loaders/GLTFLoader.js";
import model from "../src/data/machine.json";
import { applyRigPose, type RigNode } from "../src/lib/mechanical-rig";
import type { MechanicalScene } from "../src/services/assembly";

const loader = new GLTFLoader();
let maxLengthError = 0;
let maxProjectionDrift = 0;
for (const part of model.modules) {
	const bytes = readFileSync(new URL(`../public${part.model}`, import.meta.url));
	const gltf = await loader.parseAsync(bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength), "");
	const nodes: RigNode[] = [];
	gltf.scene.traverse((object) => {
		const key = object.userData.mechanism;
		const group = part.groups.find((group) => group.key === key);
		if (group) nodes.push({ object, key, rest: object.position.clone(), axis: new Vector3(...group.axis) });
	});
	assert.equal(nodes.length, part.groups.length, `Missing rigid nodes in ${part.id}`);
	const kind = (part.category === "document" ? part.variant : "stack") as MechanicalScene;
	for (const node of nodes) {
		const mesh = node.object.children.find((object) => object instanceof Mesh) as Mesh | undefined;
		if (!mesh) continue;
		const position = mesh.geometry.getAttribute("position");
		const a = new Vector3().fromBufferAttribute(position, 0);
		const b = new Vector3().fromBufferAttribute(position, position.count - 1);
		const length = a.distanceTo(b);
		for (let i = 0; i <= 40; i++) {
			applyRigPose(nodes, kind, i / 40); gltf.scene.updateMatrixWorld(true);
			const error = Math.abs(mesh.localToWorld(a.clone()).distanceTo(mesh.localToWorld(b.clone())) - length);
			maxLengthError = Math.max(maxLengthError, error);
			assert.ok(error < 1e-7, `${part.id}/${node.key} deforms in motion`);
		}
	}
	if (part.id === "document-authentication") {
		const key = nodes.find((node) => node.key === "key");
		const shackle = nodes.find((node) => node.key === "shackle");
		const body = nodes.find((node) => node.key === "body");
		assert.ok(key && shackle && body);
		applyRigPose(nodes, "authentication", 0); gltf.scene.updateMatrixWorld(true);
		assert.ok(new Box3().setFromObject(key.object).max.x < -1.6, "Key must start outside the plug");
		applyRigPose(nodes, "authentication", .5); gltf.scene.updateMatrixWorld(true);
		const keyMesh = key.object.children.find((object) => object instanceof Mesh) as Mesh;
		const positions = keyMesh.geometry.getAttribute("position");
		for (const pin of nodes.filter((node) => node.key.startsWith("pin-"))) {
			const pinBounds = new Box3().setFromObject(pin.object);
			const x = pinBounds.getCenter(new Vector3()).x;
			let toothTop = -Infinity;
			for (let i = 0; i < positions.count; i++) {
				const point = keyMesh.localToWorld(new Vector3().fromBufferAttribute(positions, i));
				if (Math.abs(point.x - x) < .075) toothTop = Math.max(toothTop, point.y);
			}
			assert.ok(Math.abs(toothTop - pinBounds.min.y) < .0001, `${pin.key} does not meet its key tooth`);
		}
		applyRigPose(nodes, "authentication", 1); gltf.scene.updateMatrixWorld(true);
		const shackleMesh = shackle.object.children.find((object) => object instanceof Mesh) as Mesh;
		const shacklePositions = shackleMesh.geometry.getAttribute("position");
		let longLeg = Infinity; let shortLeg = Infinity;
		for (let i = 0; i < shacklePositions.count; i++) {
			const point = shackleMesh.localToWorld(new Vector3().fromBufferAttribute(shacklePositions, i));
			if (point.x < -.7) longLeg = Math.min(longLeg, point.y);
			if (point.x > .7) shortLeg = Math.min(shortLeg, point.y);
		}
		const housingTop = new Box3().setFromObject(body.object).max.y;
		assert.ok(longLeg < housingTop && shortLeg > housingTop, "The shackle must release one leg while retaining the other");
	}
	if (part.id === "runtime-bun") {
		const node = nodes.find((node) => node.key === "drive"); assert.ok(node);
		const mesh = node.object.children.find((object) => object instanceof Mesh) as Mesh;
		const position = mesh.geometry.getAttribute("position");
		const seen = new Map<string, Vector3>(); let pair: Vector3[] | undefined;
		for (let i = 0; i < position.count; i++) {
			const point = new Vector3().fromBufferAttribute(position, i);
			const key = `${point.y.toFixed(5)}:${point.z.toFixed(5)}`;
			const first = seen.get(key);
			if (first && Math.abs(first.x - point.x) > .04) { pair = [first, point]; break; }
			seen.set(key, point);
		}
		assert.ok(pair, "The real wheel must contain an axial thickness edge");
		const camera = new OrthographicCamera(-8, 8, 6, -6, .1, 100);
		camera.position.set(11, 11.4, -15); camera.lookAt(0, 2.4, 0); camera.updateMatrixWorld(true);
		let reference: Vector3 | undefined;
		for (let i = 0; i <= 40; i++) {
			applyRigPose(nodes, "stack", i / 40); gltf.scene.updateMatrixWorld(true);
			const delta: Vector3 = mesh.localToWorld(pair[1].clone()).project(camera).sub(mesh.localToWorld(pair[0].clone()).project(camera));
			if (!reference) reference = delta.clone();
			const drift: number = delta.distanceTo(reference ?? delta) * 720;
			maxProjectionDrift = Math.max(maxProjectionDrift, drift);
			assert.ok(drift < .001, "An axial edge changes its projected direction during rotation");
		}
	}
}
console.log(`Rigid-motion audit passed: ${model.modules.length} actual GLBs × 41 poses. Max length error ${maxLengthError.toExponential(2)}; projected axial-edge drift ${maxProjectionDrift.toExponential(2)} px.`);
