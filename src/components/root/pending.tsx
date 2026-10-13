import * as m from "@/paraglide/messages";

export function RoutePending() {
	return (
		<div className="page text-muted-foreground" role="status">
			{m.common_loading()}
		</div>
	);
}
