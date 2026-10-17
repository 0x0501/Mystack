import { type CSSProperties, useEffect, useRef, useState } from "react";
import model from "../data/machine.json";
import type {
	createMechanicalRenderer,
	StageSelection,
} from "../lib/mechanical-renderer";
import { type MechanicalScene, modulesForScene } from "../services/assembly";
import { posterVariables } from "../services/stage";
import { useStack } from "./stack-context";

export function MechanicalWorld({
	scene,
	side,
	route,
}: {
	scene: MechanicalScene;
	side: "left" | "right";
	route: string;
}) {
	const { selection } = useStack();
	const canvas = useRef<HTMLCanvasElement>(null);
	const stage = useRef<HTMLDivElement>(null);
	const renderer = useRef<ReturnType<typeof createMechanicalRenderer> | null>(
		null,
	);
	const [ready, setReady] = useState(false);
	const ids = modulesForScene(scene, selection);
	const signature = ids.join("|");
	const current = useRef<StageSelection>({ scene, side, ids, route });
	current.current = { scene, side, ids, route };

	useEffect(() => {
		let disposed = false;
		import("../lib/mechanical-renderer")
			.then(({ createMechanicalRenderer }) => {
				if (disposed || !canvas.current || !stage.current) return;
				try {
					renderer.current = createMechanicalRenderer(
						canvas.current,
						stage.current,
						setReady,
					);
					void renderer.current
						.set(current.current)
						.catch(() => setReady(false));
				} catch {
					setReady(false);
				}
			})
			.catch(() => setReady(false));
		return () => {
			disposed = true;
			renderer.current?.dispose();
			renderer.current = null;
		};
	}, []);
	useEffect(() => {
		void renderer.current
			?.set({ scene, side, route, ids: signature.split("|") })
			.catch(() => setReady(false));
	}, [scene, side, route, signature]);

	return (
		<div
			className={`mechanical-world world-${scene}`}
			aria-hidden="true"
			data-scene={scene}
			data-renderer={ready ? "webgl" : "poster"}
			data-selection={signature}
		>
			<div className="mechanical-stage" ref={stage}>
				<img
					className="mechanical-poster"
					src={model.posters[scene].src}
					alt=""
					style={posterVariables(scene, route, side) as CSSProperties}
				/>
			</div>
			<canvas className="mechanical-canvas" ref={canvas} />
		</div>
	);
}
