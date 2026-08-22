import { describe, expect, it } from "vitest";
import {
	filterTanStackPlugins,
	isTanStackPlugin,
} from "../tanstack-plugin-filter";

describe("isTanStackPlugin", () => {
	it("returns true for start-client-tree-plugin", () => {
		// Arrange
		const pluginName = "start-client-tree-plugin";

		// Act
		const result = isTanStackPlugin(pluginName);

		// Assert
		expect(result).toBe(true);
	});

	it("returns true for tanstack router and start plugins", () => {
		// Arrange & Act & Assert
		expect(isTanStackPlugin("tanstack-router")).toBe(true);
		expect(isTanStackPlugin("tanstack-start")).toBe(true);
		expect(isTanStackPlugin("tanstack:server-fns")).toBe(true);
	});

	it("returns false for non-TanStack plugins or undefined", () => {
		// Arrange & Act & Assert
		expect(isTanStackPlugin("@tailwindcss/vite")).toBe(false);
		expect(isTanStackPlugin("vite:react")).toBe(false);
		expect(isTanStackPlugin(undefined)).toBe(false);
	});
});

describe("filterTanStackPlugins", () => {
	it("filters out TanStack plugins while preserving other plugins", () => {
		// Arrange
		const reactPlugin = { name: "vite:react" };
		const tailwindPlugin = { name: "@tailwindcss/vite" };
		const tanstackPlugin = { name: "tanstack-start" };
		const routerPlugin = { name: "tanstack-router" };
		const plugins = [reactPlugin, tanstackPlugin, tailwindPlugin, routerPlugin];

		// Act
		const result = filterTanStackPlugins(plugins as never);

		// Assert
		expect(result).toEqual([reactPlugin, tailwindPlugin]);
	});

	it("handles nested plugin arrays and falsy entries", () => {
		// Arrange
		const reactPlugin = { name: "vite:react" };
		const clientTreePlugin = { name: "start-client-tree-plugin" };
		const plugins = [null, undefined, [reactPlugin, [clientTreePlugin]]];

		// Act
		const result = filterTanStackPlugins(plugins as never);

		// Assert
		expect(result).toEqual([reactPlugin]);
	});

	it("returns an empty array when plugins argument is undefined", () => {
		// Arrange & Act
		const result = filterTanStackPlugins(undefined);

		// Assert
		expect(result).toEqual([]);
	});
});
