import type { PluginOption } from "vite";

export const isTanStackPlugin = (name?: string): boolean =>
	/^start-client-tree-plugin|^tanstack(-|:)/.test(name ?? "");

export function filterTanStackPlugins(
	plugins: PluginOption[] | undefined,
): PluginOption[] {
	return (plugins ?? [])
		.flat(Infinity)
		.filter((p) => p && typeof p === "object" && !isTanStackPlugin(p.name));
}
