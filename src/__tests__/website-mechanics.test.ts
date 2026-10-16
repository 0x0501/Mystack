import { describe, expect, it } from "vitest";
import {
	lockPose,
	pressPose,
} from "../../packages/website/src/services/mechanics";

describe("letterpress linkage", () => {
	it("keeps the connecting rod rigid throughout the crank revolution", () => {
		for (let step = 0; step <= 100; step++) {
			const pose = pressPose(step / 100);
			const pinHeight = 4.8 + pose.rodY;
			const sliderHeight = 3.6 + pose.platen;
			expect(Math.hypot(pinHeight - sliderHeight, pose.rodZ)).toBeCloseTo(
				1.2,
				10,
			);
			expect(Math.sin(pose.rodAngle) * 1.2).toBeCloseTo(pose.rodZ, 10);
		}
	});
	it("feeds before pressing and releases the platen before delivering the print", () => {
		expect(pressPose(0.1)).toMatchObject({ angle: 0, printed: false });
		expect(pressPose(0.45).platen).toBeCloseTo(-0.8);
		expect(pressPose(0.45).feed).toBe(1);
		expect(pressPose(0.45).printed).toBe(true);
		expect(pressPose(0.7).platen).toBeCloseTo(0);
		expect(pressPose(1).feed).toBe(0);
	});
});
describe("padlock sequence", () => {
	it("requires the key and aligned pins before turning, then releases the shackle", () => {
		expect(lockPose(0.3)).toMatchObject({ turn: 0, shackle: 0 });
		expect(lockPose(0.5)).toMatchObject({
			key: 2.8,
			pins: 1,
			turn: 0,
			shackle: 0,
		});
		expect(lockPose(0.75).turn).toBeCloseTo(Math.PI / 2);
		expect(lockPose(0.75).shackle).toBe(0);
		expect(lockPose(1).shackle).toBeGreaterThan(0.8);
	});
});
