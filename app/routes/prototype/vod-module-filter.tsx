import { createFileRoute } from "@tanstack/react-router";
import { VodModuleFilterPrototype } from "@/pages/vod-detail";

export const Route = createFileRoute("/prototype/vod-module-filter")({
	component: VodModuleFilterPrototype,
});
