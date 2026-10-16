import { type Object3D, Quaternion, type Vector3 } from "three";
import type { MechanicalScene } from "../services/assembly";
import {
	clamp,
	composingRow,
	drawerTravel,
	lockPose,
	pressPose,
} from "../services/mechanics";

export type RigNode = {
	object: Object3D;
	key: string;
	rest: Vector3;
	axis: Vector3;
};
const identity = new Quaternion();

// Every animated object keeps unit scale. Rotation happens before camera projection.
export function applyRigPose(
	nodes: RigNode[],
	scene: MechanicalScene,
	progress: number,
) {
	const press = pressPose(progress);
	const lock = lockPose(progress);
	for (const { object, key, rest, axis } of nodes) {
		object.position.copy(rest);
		object.quaternion.copy(identity);
		object.visible = true;
		let angle = 0;
		if (scene === "stack" || scene === "deployment") {
			if (key === "drive" || key === "crank") angle = press.angle;
			if (key === "platen") object.position.y += press.platen;
			if (key === "connecting-rod") {
				angle = press.rodAngle;
				object.position.y += press.rodY;
				object.position.z += press.rodZ;
			}
			if (key === "sheet" || key === "impression")
				object.position.z += press.feed * 3;
			if (key === "impression") object.visible = press.printed;
			if (key === "feed-roller") angle = -press.feed * 6;
			if (key === "feed-lever") angle = press.feed * 0.45;
			if (key === "stamp") object.position.y -= press.stamp;
			if (key.startsWith("piston-")) {
				const phase = (Number(key.slice(-1)) * Math.PI * 2) / 3;
				object.position.y +=
					0.16 * (Math.cos(press.angle + phase) - Math.cos(phase));
			}
		} else if (scene === "configuration") {
			if (key.startsWith("type-row-"))
				object.position.x += composingRow(progress, Number(key.slice(-1)));
			if (key === "composing-stop")
				object.position.x += (1 - clamp((progress - 0.72) / 0.2)) * 1.2;
		} else if (scene === "authentication") {
			if (key === "key") {
				object.position.x += lock.key;
				angle = lock.turn;
			}
			if (key === "plug") angle = lock.turn;
			if (key === "shackle") object.position.y += lock.shackle;
			if (key.startsWith("pin-"))
				object.position.y +=
					[0.13, 0.25, 0.17, 0.3, 0.19][Number(key.slice(-1))] * lock.pins;
		} else if (key.startsWith("drawer-")) {
			object.position.z -= drawerTravel(progress, Number(key.slice(-1)));
		}
		if (angle) object.quaternion.setFromAxisAngle(axis, angle);
	}
}
