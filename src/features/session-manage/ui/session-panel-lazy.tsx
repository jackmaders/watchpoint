import { lazy, type ReactNode, Suspense } from "react";
import { SessionPanelFallback } from "./session-panel-fallback";

const LazySessionPanel = lazy(() =>
	import("./session-panel").then((module) => ({
		default: module.SessionPanel,
	})),
);

export interface SessionPanelProps {
	callbackUrl?: string;
	fallback?: ReactNode;
}

export function SessionPanel({
	callbackUrl = "/",
	fallback = <SessionPanelFallback />,
}: SessionPanelProps = {}) {
	return (
		<Suspense fallback={fallback}>
			<LazySessionPanel callbackUrl={callbackUrl} />
		</Suspense>
	);
}
