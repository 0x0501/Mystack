import { useRouterState } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import * as m from "@/paraglide/messages";

/** beforeLoad can block before a child's pending boundary is available. */
export function NavigationProgress() {
	const waiting = useRouterState({
		select: (state) =>
			state.isLoading &&
			!state.matches.some((match) => match.status === "pending"),
	});
	const [visible, setVisible] = useState(false);

	useEffect(() => {
		if (!waiting) {
			setVisible(false);
			return;
		}
		const timer = window.setTimeout(() => setVisible(true), 150);
		return () => window.clearTimeout(timer);
	}, [waiting]);

	if (!waiting || !visible) return null;
	return (
		<div
			className="fixed inset-x-0 top-0 z-50 border-b border-border bg-background px-4 py-2 text-sm text-muted-foreground"
			role="status"
		>
			{m.common_loading()}
		</div>
	);
}
