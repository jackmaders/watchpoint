import { lazy, Suspense } from "react";
import { SessionPanelFallback } from "./ui/session-panel-fallback";

const LazySessionPanel = lazy(() =>
	import("./ui/session-panel").then(({ SessionPanel }) => ({
		default: SessionPanel,
	})),
);

export function SessionPanel() {
	return (
		<Suspense fallback={<SessionPanelFallback />}>
			<LazySessionPanel />
		</Suspense>
	);
}
