import { lazy } from "react";

export const SessionPanel = lazy(() =>
	import("./ui/session-panel").then((module) => ({
		default: module.SessionPanel,
	})),
);
export { SessionPanelFallback } from "./ui/session-panel-fallback";
